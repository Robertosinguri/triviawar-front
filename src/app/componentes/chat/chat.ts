import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, ViewChild, ElementRef, HostListener, signal, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../../servicios/chat.service';
import { ChatStateService } from '../../servicios/chat-state.service';
import { SocketService } from '../../servicios/websocket/socket.service';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class ChatComponent implements OnInit, OnDestroy {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  private chatService = inject(ChatService);
  private chatState = inject(ChatStateService);
  private socketService = inject(SocketService);

  // Señales del estado del chat
  messages = this.chatState.messages;
  connectedUsers = this.chatState.connectedUsers;
  username = this.chatState.username;
  publicMessage = this.chatState.publicMessage;
  showEmojiPicker = this.chatState.showEmojiPicker;
  isMobileExpanded = this.chatState.isMobileExpanded;
  unreadCount = this.chatState.unreadCount;
  hasMessages = this.chatState.hasMessages;
  messagesCount = this.chatState.messagesCount;
  currentMessage = this.chatState.currentMessage;

  // Inputs del componente
  @Input() mode: 'global' | 'room' = 'global';
  @Input() roomId?: string;

  // Señales locales
  modeSignal = signal<'global' | 'room'>('global');
  isSending = false;
  isReconnecting = false;
  clickListenerAdded = false;
  scrollTimeout: any = null;
  
  // Emojis comunes
  commonEmojis = this.chatState.commonEmojis;

  private subscriptions = new Subscription();

  ngOnInit() {
    console.log('💬 ChatComponent inicializado');
    this.setupSocketListeners();
    this.autoJoinChat();
  }

  ngOnDestroy() {
    console.log('💬 ChatComponent destruido');
    this.subscriptions.unsubscribe();
    this.removeClickListener();
  }

  private setupSocketListeners() {
    // Escuchar mensajes del chat
    this.subscriptions.add(
      this.chatService.onMessage().subscribe((msg: ChatMessage) => {
        console.log('📩 Mensaje recibido:', msg.text, 'de:', msg.username);
        this.chatState.addMessage(msg);
        this.scrollToBottom();
      })
    );

    // Escuchar historial de mensajes
    this.subscriptions.add(
      this.chatService.onHistory().subscribe((history: ChatMessage[]) => {
        console.log('📜 Historial recibido:', history.length, 'mensajes');
        this.chatState.loadHistory(history);
        this.scrollToBottom();
      })
    );

    // Escuchar lista de usuarios conectados
    this.subscriptions.add(
      this.chatService.onUsersList().subscribe((users: string[]) => {
        console.log('👥 Usuarios conectados actualizados:', users.length);
        this.chatState.updateConnectedUsers(users);
      })
    );

    // Escuchar eventos de conexión
    this.subscriptions.add(
      this.chatService.onConnect().subscribe(() => {
        console.log('✅ Socket conectado');
        this.chatState.updateConnectionStatus(true);
        this.isReconnecting = false;
        this.autoJoinChat();
      })
    );

    this.subscriptions.add(
      this.chatService.onDisconnect().subscribe(() => {
        console.log('❌ Socket desconectado');
        this.chatState.updateConnectionStatus(false);
      })
    );

    this.subscriptions.add(
      this.chatService.onError().subscribe((error) => {
        console.error('⚠️ Error de conexión socket:', error);
        this.chatState.updateConnectionStatus(false);
      })
    );
  }

  private autoJoinChat() {
    const username = this.username();
    const currentSessionUser = this.chatState.activeSessionUser();

    // Solo unirse si el usuario es distinto (cambio de login) o si no hay sesión activa
    if (username && username !== currentSessionUser) {
      console.log(`🤝 Uniéndose al Chat Global Permanente como: ${username}`);
      
      this.chatService.joinChat(username, null); // Siempre Global
      this.chatState.activeSessionUser.set(username);
    }
  }

  // Métodos de UI
  toggleMobileChat() {
    this.isMobileExpanded.set(!this.isMobileExpanded());
    if (this.isMobileExpanded()) {
      this.unreadCount.set(0);
      this.scrollToBottom();
    }
  }

  toggleEmojiPicker(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.showEmojiPicker.set(!this.showEmojiPicker());
    
    if (this.showEmojiPicker() && !this.clickListenerAdded) {
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick.bind(this));
        this.clickListenerAdded = true;
      }, 0);
    }
  }

  private handleOutsideClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-picker-popup') && !target.closest('.emoji-trigger')) {
      this.showEmojiPicker.set(false);
      this.removeClickListener();
    }
  }

  private removeClickListener() {
    if (this.clickListenerAdded) {
      document.removeEventListener('click', this.handleOutsideClick.bind(this));
      this.clickListenerAdded = false;
    }
  }

  addEmoji(emoji: string) {
    const current = this.publicMessage();
    this.publicMessage.set(current + emoji);
    this.showEmojiPicker.set(false);
    this.removeClickListener();
  }

  // Enviar mensaje público
  sendPublicMessage() {
    const text = this.publicMessage().trim();
    const username = this.username();

    if (!text || !username || this.isSending) {
      return;
    }

    this.isSending = true;
    
    try {
      this.chatService.sendMessage(text, username, null); // Siempre al canal global
      this.publicMessage.set('');
      
      // Incrementar contador de no leídos si el chat está colapsado en móvil
      if (!this.isMobileExpanded()) {
        this.unreadCount.update(count => count + 1);
      }
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
    } finally {
      this.isSending = false;
    }
  }

  // Utilidades
  isUserOnline(username: string): boolean {
    return this.connectedUsers().includes(username);
  }

  formatTime(date: any): string {
    return this.chatState.formatTime(date);
  }

  scrollToBottom() {
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.scrollTimeout = setTimeout(() => {
      try {
        if (this.myScrollContainer?.nativeElement) {
          const element = this.myScrollContainer.nativeElement;
          element.scrollTop = element.scrollHeight;
        }
      } catch (err) {
        console.warn('⚠️ Error al hacer scroll:', err);
      }
    }, 100);
  }

  @HostListener('window:resize')
  onResize() {
    // En móvil, si el chat está expandido, hacer scroll al fondo
    if (this.isMobileExpanded()) {
      this.scrollToBottom();
    }
  }
}