import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, inject, ViewChild, ElementRef, effect, signal, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService, ChatMessage, GroupUpdateMessage } from '../../servicios/chat.service';
import { ChatStateService, PrivateMessage } from '../../servicios/chat-state.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrls: ['./chat.scss']
})
export class ChatComponent implements OnInit, OnDestroy, OnChanges {
  @Input() mode: 'global' | 'room' = 'global';
  @Input() roomId: string | null = null;
  
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;

  private chatService = inject(ChatService);
  private chatState = inject(ChatStateService);
  
  // === ACCESO DIRECTO A LOS SIGNALS DEL ESTADO PERSISTENTE ===
  
  // Estado del chat (persistente durante toda la sesión)
  messages = this.chatState.messages;
  privateMessages = this.chatState.privateMessages;
  connectedUsers = this.chatState.connectedUsers;
  activeTab = this.chatState.activeTab;
  
  // Mensajes separados por pestaña
  publicMessage = this.chatState.publicMessage;
  privateMessage = this.chatState.privateMessage;
  
  // Grupo privado persistente
  privateGroupMembers = this.chatState.privateGroupMembers;
  
  // Estado de UI
  showEmojiPicker = this.chatState.showEmojiPicker;
  showUserSuggestions = this.chatState.showUserSuggestions;
  isConnected = this.chatState.isConnected;
  isMobileExpanded = this.chatState.isMobileExpanded;
  unreadCount = this.chatState.unreadCount;
  
  // Computed signals del estado
  username = this.chatState.username;
  hasMessages = this.chatState.hasMessages;
  messagesCount = this.chatState.messagesCount;
  privateMessagesCount = this.chatState.privateMessagesCount;
  filteredUsers = this.chatState.filteredUsers;
  hasPrivateGroup = this.chatState.hasPrivateGroup;
  currentMessage = this.chatState.currentMessage;
  
  // Emojis comunes
  commonEmojis = this.chatState.commonEmojis;
  
  private subscriptions = new Subscription();
  private isSending = false; 
  private isReconnecting = false; 
  private clickListenerAdded = false;
  private scrollTimeout: any = null;

  // Señales internas para reactividad de inputs
  private roomIdSignal = signal<string | null>(null);
  private modeSignal = signal<'global' | 'room'>('global');

  constructor() {
    // EL MOTOR MAESTRO: Reacciona a cualquier cambio de Identidad, Sala o Conexión
    effect(() => {
      const user = this.username();
      const room = this.roomIdSignal();
      const connected = this.isConnected();
      const mode = this.modeSignal();

      // No sincronizar si no hay conexión o el usuario es el genérico inicial
      if (!connected) return;

      untracked(() => {
        this.masterSync(user, room, mode);
      });
    });
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['roomId']) {
      this.roomIdSignal.set(changes['roomId'].currentValue);
    }
    if (changes['mode']) {
      this.modeSignal.set(changes['mode'].currentValue);
    }
  }

  ngOnInit() {
    // Asegurar conexión de socket
    this.chatService.connect();

    // Actualizar estado de conexión inicial
    if (this.chatService.isConnected()) {
      this.chatState.updateConnectionStatus(true);
    }

    // Escuchar eventos de conexión (para futuras reconexiones)
    this.subscriptions.add(
      this.chatService.onConnect().subscribe(() => {
        console.log('✅ [Chat] Socket conectado/reconectado');
        this.chatState.updateConnectionStatus(true);
        this.isReconnecting = true;
        
        // El 'effect' se encargará de la sincronización al detectar isConnected() -> true
        
        setTimeout(() => { this.isReconnecting = false; }, 2000);
      })
    );

    // Escuchar errores de conexión
    this.subscriptions.add(
      this.chatService.onError().subscribe((error) => {
        console.error('❌ Error en socket de chat:', error);
        this.chatState.updateConnectionStatus(false);
      })
    );

    // Escuchar desconexión
    this.subscriptions.add(
      this.chatService.onDisconnect().subscribe(() => {
        console.log('🔌 Socket desconectado');
        this.chatState.updateConnectionStatus(false);
      })
    );

    // ESCUCHAR MENSAJES GLOBALES
    this.subscriptions.add(
      this.chatService.onMessage().subscribe((msg: ChatMessage) => {
        console.log('📬 Mensaje recibido:', msg.text);
        
        // Procesar todo como global (sin filtros de sala por instrucción del usuario)
        this.addMessageWithScroll(msg);

        // Manejo de notificaciones en móvil
        if (!this.isMobileExpanded() && !msg.isSystem) {
          this.unreadCount.update(c => c + 1);
        }
      })
    );

    // ESCUCHAR MENSAJES PRIVADOS (con grupos bidireccionales)
    this.subscriptions.add(
      this.chatService.onPrivateMessage().subscribe((msg: any) => {
        console.log('📬 Mensaje PRIVADO recibido:', msg);
        
        // Convertir a formato PrivateMessage
        const privateMsg: PrivateMessage = {
          id: msg.id || `pm-${Date.now()}`,
          text: msg.text,
          username: msg.username,
          target: msg.target || msg.targetUsername || 'varios',
          timestamp: new Date(msg.timestamp || Date.now()),
          isPrivate: true
        };
        
        // Agregar al estado persistente
        this.chatState.addPrivateMessage(privateMsg);
        
        // === GRUPOS BIDIRECCIONALES AUTOMÁTICOS ===
        // Si el mensaje tiene información de grupo bidireccional
        if (msg.groupAction === 'add_mutual' && msg.mutualUsers) {
          console.log('👥 [Grupo Bidireccional] Agregando usuarios mutuamente:', msg.mutualUsers);
          
          // Agregar todos los usuarios mutuos a nuestro grupo
          msg.mutualUsers.forEach((user: string) => {
            if (user !== this.username()) {
              this.chatState.addToPrivateGroup(user);
            }
          });
        }
        
        // Si el mensaje viene de otro usuario, agregarlo automáticamente a nuestro grupo
        if (msg.username !== this.username()) {
          console.log(`👥 [Auto-agregar] Agregando ${msg.username} a nuestro grupo privado`);
          this.chatState.addToPrivateGroup(msg.username);
        }
        
        // Scroll si estamos en pestaña de privados
        if (this.activeTab() === 'private') {
          this.scheduleScroll();
        }

        // Manejo de notificaciones en móvil para privados
        if (!this.isMobileExpanded() && msg.username !== this.username()) {
          this.unreadCount.update(c => c + 1);
        }
      })
    );

    // ESCUCHAR ACTUALIZACIONES DE GRUPO
    this.subscriptions.add(
      this.chatService.onGroupUpdate().subscribe((update: GroupUpdateMessage) => {
        console.log('👥 [Grupo Update] Recibido:', update);
        
        if (update.username === this.username()) {
          console.log('👥 [Grupo Update] Actualizando nuestro grupo con:', update.members);
          
          // Sincronizar nuestro grupo local con el del backend
          const currentMembers = this.privateGroupMembers();
          const newMembers = update.members.filter(m => m !== this.username());
          
          // Agregar miembros que no tenemos
          newMembers.forEach(member => {
            if (!currentMembers.includes(member)) {
              this.chatState.addToPrivateGroup(member);
            }
          });
        }
      })
    );

    // ESCUCHAR INFORMACIÓN DE GRUPO
    this.subscriptions.add(
      this.chatService.onGroupInfo().subscribe((info: GroupUpdateMessage) => {
        console.log('👥 [Grupo Info] Recibido:', info);
        
        if (info.username === this.username()) {
          console.log('👥 [Grupo Info] Sincronizando grupo con backend:', info.members);
          
          // Limpiar y sincronizar completamente
          this.chatState.clearPrivateGroup();
          info.members.forEach(member => {
            if (member !== this.username()) {
              this.chatState.addToPrivateGroup(member);
            }
          });
        }
      })
    );

    // ESCUCHAR LISTA DE USUARIOS
    this.subscriptions.add(
      this.chatService.onUsersList().subscribe((users: string[]) => {
        this.chatState.updateConnectedUsers(users);
      })
    );

    // Escuchar historial (solo para global)
    if (this.mode === 'global') {
      this.subscriptions.add(
        this.chatService.onHistory().subscribe((history: ChatMessage[]) => {
          // Ignorar historial si estamos en proceso de reconexión
          if (this.isReconnecting) {
            console.log('📜 [Chat] Ignorando historial durante reconexión');
            return;
          }
          
          console.log('📜 Historial cargado:', history.length, 'mensajes');
          this.chatState.loadHistory(history);
          this.scheduleScroll();
        })
      );
    }
  }

  onInputChange(event: any) {
    const text = this.privateMessage();
    const index = text.lastIndexOf('@');
    
    // Mostrar sugerencias solo en pestaña Privado
    if (this.activeTab() === 'private' && index !== -1) {
      const query = text.substring(index + 1);
      this.showUserSuggestions.set(!query.includes(' '));
    } else {
      this.showUserSuggestions.set(false);
    }
  }

  selectMention(user: string) {
    const text = this.privateMessage();
    const index = text.lastIndexOf('@');
    const newText = text.substring(0, index) + '@' + user + ' ';
    this.privateMessage.set(newText);
    this.showUserSuggestions.set(false);
    
    // Devolver foco al input
    setTimeout(() => {
      const input = document.querySelector('.chat-input-area input') as HTMLInputElement;
      if (input) input.focus();
    }, 0);
  }

  switchTab(tab: 'global' | 'private') {
    this.chatState.switchTab(tab);
    this.showEmojiPicker.set(false);
    this.removeDocumentClickListener();
    this.scheduleScroll();
  }

  // Formatear destinos para mostrar en UI
  formatTargets(target: string): string {
    if (!target || target === 'varios') return 'varios usuarios';
    if (target.includes(',')) {
      const users = target.split(',').map(u => `@${u.trim()}`).join(' ');
      return users;
    }
    return `@${target}`;
  }

  // Formatear miembros del grupo privado
  formatGroupMembers(): string {
    const members = this.privateGroupMembers();
    if (members.length === 0) return 'Ningún usuario agregado';
    if (members.length === 1) return `@${members[0]}`;
    return `${members.length} usuarios: ${members.map(u => `@${u}`).join(' ')}`;
  }

  private addMessageWithScroll(msg: ChatMessage) {
    // Agregar al estado persistente
    this.chatState.addMessage(msg);
    
    // Scroll si estamos en pestaña global
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

  toggleMobileChat() {
    const newState = !this.isMobileExpanded();
    this.isMobileExpanded.set(newState);
    if (newState) {
      this.unreadCount.set(0);
      this.scheduleScroll();
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.removeDocumentClickListener();
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }
  }

  // === MÉTODOS SEPARADOS PARA CADA CHAT ===

  // Enviar mensaje PÚBLICO (global o sala)
  sendPublicMessage() {
    const text = this.publicMessage().trim();
    if (!text || this.isSending) return;

    this.isSending = true;
    this.chatService.sendMessage(text, this.username(), null); // Siempre sin roomId
    this.publicMessage.set('');
    this.showEmojiPicker.set(false);
    this.removeDocumentClickListener();
    this.scheduleScroll();
    
    // Resetear flag después de un breve delay para permitir nuevo envío
    setTimeout(() => {
      this.isSending = false;
    }, 500);
  }

  // Enviar mensaje PRIVADO al grupo (con grupos bidireccionales)
  sendPrivateMessage() {
    const text = this.privateMessage().trim();
    if (!text || this.isSending) return;

    this.isSending = true;

    // Detectar si hay menciones @ para agregar al grupo
    if (text.includes('@')) {
      const mentionedUsers: string[] = [];
      let currentText = text;
      
      while (currentText.includes('@')) {
        const atIndex = currentText.indexOf('@');
        const afterAt = currentText.substring(atIndex + 1);
        const spaceIndex = afterAt.indexOf(' ');
        
        if (spaceIndex === -1) {
          // Última palabra (el mensaje)
          break;
        }
        
        const username = afterAt.substring(0, spaceIndex);
        if (username && this.connectedUsers().includes(username)) {
          mentionedUsers.push(username);
        }
        
        // Continuar con el resto del texto
        currentText = afterAt.substring(spaceIndex);
      }
      
      // Agregar usuarios mencionados al grupo privado
      if (mentionedUsers.length > 0) {
        this.chatState.addMultipleToPrivateGroup(mentionedUsers);
        console.log(`👥 Usuarios agregados a nuestro grupo:`, mentionedUsers);
      }
      
      // Extraer el mensaje (todo después del último @usuario)
      const lastAtIndex = text.lastIndexOf('@');
      const afterLastAt = text.substring(lastAtIndex + 1);
      const lastSpaceIndex = afterLastAt.indexOf(' ');
      const messagePart = afterLastAt.substring(lastSpaceIndex + 1);
      
      if (messagePart.trim()) {
        this.sendPrivateMessageToGroup(messagePart, mentionedUsers);
        this.privateMessage.set('');
        this.isSending = false;
        return;
      }
    }
    
    // Si no hay @, enviar a todo el grupo privado
    this.sendPrivateMessageToGroup(text, []);
    this.privateMessage.set('');
    this.isSending = false;
  }

  // Enviar mensaje a todos los miembros del grupo privado
  private sendPrivateMessageToGroup(text: string, newlyAddedUsers: string[] = []) {
    const groupMembers = this.privateGroupMembers();
    
    if (groupMembers.length === 0) {
      console.warn('⚠️ No hay usuarios en el grupo privado');
      this.isSending = false;
      return;
    }
    
    console.log(`📤 Enviando mensaje PRIVADO a ${groupMembers.length} usuarios:`, groupMembers);
    
    // Enviar a cada miembro del grupo (con grupos bidireccionales)
    this.chatService.sendPrivateMessage(groupMembers, text, this.username());
    
    // NOTA: NO agregamos el mensaje localmente aquí porque el backend
    // enviará una copia de vuelta al remitente (línea 144 en chatHandler.js)
    // Esto evita duplicación de mensajes.
    
    this.showEmojiPicker.set(false);
    this.scheduleScroll();
  }

  // Método general para enviar mensaje (compatibilidad)
  sendMessage() {
    if (this.activeTab() === 'global') {
      this.sendPublicMessage();
    } else {
      this.sendPrivateMessage();
    }
  }

  formatTime(date: any): string {
    return this.chatState.formatTime(date);
  }

  // === LÓGICA MAESTRA DE SINCRONIZACIÓN (UNIFICADA) ===
  private masterSync(user: string, room: string | null, mode: 'global' | 'room') {
    // Solo sincronizamos si cambia el USUARIO (Identidad) y no coincide con la sesión activa global
    if (user === this.chatState.activeSessionUser()) {
      return;
    }

    console.log(`📡 [Chat MasterSync] Sincronizando identidad para: ${user}`);

    // Unirse al canal global del usuario
    this.chatService.joinChat(user, null);

    // Actualizar la sesión activa global para que otros componentes sepan que ya estamos sincronizados
    this.chatState.activeSessionUser.set(user);

    // Limpiar estado solo si el usuario cambió de verdad (logout/login)
    // Nota: El reset real lo maneja ChatStateService.clearOnUserChange si es necesario
    
    // Asegurar grupo privado
    setTimeout(() => {
      this.chatService.getPrivateGroup(user);
    }, 500);
  }

  toggleEmojiPicker(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.showEmojiPicker.update(current => !current);
    if (this.showEmojiPicker()) this.addDocumentClickListener();
    else this.removeDocumentClickListener();
  }

  addEmoji(emoji: string) {
    if (this.activeTab() === 'global') {
      this.publicMessage.update(current => current + emoji);
    } else {
      this.privateMessage.update(current => current + emoji);
    }
    
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