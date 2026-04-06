import { Component, Input, OnInit, OnDestroy, inject, ViewChild, ElementRef, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage } from '../../servicios/chat.service';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() mode: 'global' | 'room' = 'global';
  @Input() roomId: string | null = null;
  
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  private chatService = inject(ChatService);
  private authService = inject(FirebaseAuthService);
  
  // Signals para reactividad instantánea en modo Zoneless
  messages = signal<ChatMessage[]>([]);
  privateMessages = signal<any[]>([]);
  connectedUsers = signal<string[]>([]);
  activeTab = signal<'global' | 'private'>('global');
  
  newMessage = signal('');
  username = signal('Invitado');
  showEmojiPicker = signal(false);
  showUserSuggestions = signal(false);
  
  // Computed signals para derivar valores
  hasMessages = computed(() => {
    const list = this.activeTab() === 'global' ? this.messages() : this.privateMessages();
    return list.length > 0;
  });
  
  messagesCount = computed(() => this.messages().length);
  
  // Propiedad computada para estado de conexión (accesible desde plantilla)
  isConnected = computed(() => this.chatService.isConnected());
  
  filteredUsers = computed(() => {
    const text = this.newMessage();
    const index = text.lastIndexOf('@');
    if (index === -1) return [];
    
    const query = text.substring(index + 1).toLowerCase();
    return this.connectedUsers().filter(u => 
      u.toLowerCase().includes(query) && u !== this.username()
    );
  });
  
  commonEmojis: string[] = [
    '😂', '🤣', '❤️', '😍', '👍', '🔥', '🚀', '🎮', '🏆', '💯', 
    '😮', '🤔', '😢', '💀', '✨', '👋', '😎', '😜', '🙌', '🌈',
    '⚡', '🍕', '💻', '💡', '🎉'
  ];
  
  private subscriptions = new Subscription();
  private clickListenerAdded = false;
  private scrollTimeout: any = null;

  ngOnInit() {
    // Asegurar conexión de socket
    this.chatService.connect();

    // Obtener nombre de usuario
    const user = this.authService.currentUser$();
    if (user && user.username) {
      this.username.set(user.username);
    }

    // Escuchar eventos de conexión
    this.subscriptions.add(
      this.chatService.onConnect().subscribe(() => {
        console.log('✅ Socket conectado para chat');
        
        // Notificar entrada al chat una vez conectado
        this.chatService.joinChat(this.username(), this.roomId);

        // Si es modo sala, unirse a la sala de chat de socket.io
        if (this.mode === 'room' && this.roomId) {
          this.chatService.joinChatRoom(this.roomId);
        }
      })
    );

    // Escuchar errores de conexión
    this.subscriptions.add(
      this.chatService.onError().subscribe((error) => {
        console.error('❌ Error en socket de chat:', error);
      })
    );

    // ESCUCHAR MENSAJES GLOBALES/SALA
    this.subscriptions.add(
      this.chatService.onMessage().subscribe((msg) => {
        // Filtrar por sala si estamos en modo sala
        if (this.mode === 'room') {
          if (msg.roomId === this.roomId) {
            this.addMessageWithScroll(msg);
          }
        } else {
          if (!msg.roomId) {
            this.addMessageWithScroll(msg);
          }
        }
      })
    );

    // ESCUCHAR MENSAJES PRIVADOS (SUB-CHATS)
    this.subscriptions.add(
      this.chatService.onPrivateMessage().subscribe((msg) => {
        console.log('📬 Mensaje PRIVADO recibido:', msg);
        this.privateMessages.update(prev => [...prev, msg]);
        if (this.activeTab() === 'private') {
          this.scheduleScroll();
        }
      })
    );

    // ESCUCHAR LISTA DE USUARIOS
    this.subscriptions.add(
      this.chatService.onUsersList().subscribe((users) => {
        this.connectedUsers.set(users);
      })
    );

    // Escuchar historial (solo para global)
    if (this.mode === 'global') {
      this.subscriptions.add(
        this.chatService.onHistory().subscribe((history: ChatMessage[]) => {
          this.messages.set([...history]);
          this.scheduleScroll();
        })
      );
    }
  }

  onInputChange(event: any) {
    const text = this.newMessage();
    const lastChar = text.charAt(text.length - 1);
    const index = text.lastIndexOf('@');
    
    // Mostrar sugerencias si hay un @ activo
    if (index !== -1) {
      const query = text.substring(index + 1);
      this.showUserSuggestions.set(!query.includes(' '));
    } else {
      this.showUserSuggestions.set(false);
    }
  }

  selectMention(user: string) {
    const text = this.newMessage();
    const index = text.lastIndexOf('@');
    const newText = text.substring(0, index) + '@' + user + ' ';
    this.newMessage.set(newText);
    this.showUserSuggestions.set(false);
    
    // Devolver foco al input
    setTimeout(() => {
      const input = document.querySelector('.chat-input-area input') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  switchTab(tab: 'global' | 'private') {
    this.activeTab.set(tab);
    this.scheduleScroll();
  }

  private addMessageWithScroll(msg: ChatMessage) {
    this.messages.update(current => [...current, msg]);
    if (this.activeTab() === 'global') {
      this.scheduleScroll();
    }
  }

  private scheduleScroll() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
    this.scrollTimeout = setTimeout(() => {
      this.scrollToBottom();
    }, 50);
  }

  private scrollToBottom(): void {
    try {
      if (this.myScrollContainer && this.myScrollContainer.nativeElement) {
        const element = this.myScrollContainer.nativeElement;
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch (err) {}
  }

  ngOnDestroy() {
    if (this.mode === 'room' && this.roomId) {
      this.chatService.leaveChatRoom(this.roomId);
    }
    this.subscriptions.unsubscribe();
    this.removeDocumentClickListener();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  sendMessage() {
    const text = this.newMessage().trim();
    if (!text) return;

    // Detectar si es un mensaje privado/sub-chat (empieza con @)
    if (text.startsWith('@')) {
      const firstSpace = text.indexOf(' ');
      if (firstSpace !== -1) {
        const targetUser = text.substring(1, firstSpace);
        const messagePart = text.substring(firstSpace + 1);
        
        if (this.connectedUsers().includes(targetUser)) {
          this.chatService.sendPrivateMessage(targetUser, messagePart, this.username());
          this.newMessage.set('');
          this.showEmojiPicker.set(false);
          return;
        }
      }
    }

    // Si no es privado, enviar normalmente
    this.chatService.sendMessage(text, this.username(), this.roomId);
    this.newMessage.set('');
    this.showEmojiPicker.set(false);
    this.removeDocumentClickListener();
    this.scheduleScroll();
  }

  formatTime(date: any): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }

  toggleEmojiPicker(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showEmojiPicker.update(current => !current);
    if (this.showEmojiPicker()) this.addDocumentClickListener();
    else this.removeDocumentClickListener();
  }

  addEmoji(emoji: string) {
    this.newMessage.update(current => current + emoji);
    setTimeout(() => {
      const input = document.querySelector('.chat-input-area input') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  private addDocumentClickListener() {
    if (!this.clickListenerAdded) {
      setTimeout(() => {
        document.addEventListener('click', this.handleDocumentClick.bind(this), true);
        this.clickListenerAdded = true;
      }, 0);
    }
  }

  private removeDocumentClickListener() {
    if (this.clickListenerAdded) {
      document.removeEventListener('click', this.handleDocumentClick.bind(this), true);
      this.clickListenerAdded = false;
    }
  }

  private handleDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (this.showEmojiPicker() && !target.closest('.emoji-picker-popup') && !target.closest('.emoji-trigger')) {
      this.showEmojiPicker.set(false);
      this.removeDocumentClickListener();
    }
  }
}