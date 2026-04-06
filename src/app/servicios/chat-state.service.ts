import { Injectable, signal, computed, inject } from '@angular/core';
import { ChatMessage } from './chat.service';
import { FirebaseAuthService } from './auth/firebase-auth.service';

export interface PrivateMessage {
  id: string;
  text: string;
  username: string;
  target: string;
  timestamp: Date;
  isPrivate: boolean;
}

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  private authService = inject(FirebaseAuthService);

  // === ESTADO PERSISTENTE DEL CHAT ===
  
  // Mensajes globales/sala (persistentes durante toda la sesión)
  messages = signal<ChatMessage[]>([]);
  
  // Mensajes privados/sub-chats (persistentes durante toda la sesión)
  privateMessages = signal<PrivateMessage[]>([]);
  
  // Usuarios conectados (actualizado en tiempo real)
  connectedUsers = signal<string[]>([]);
  
  // Pestaña activa (global o private)
  activeTab = signal<'global' | 'private'>('global');
  
  // Mensaje actual en el input (separado por pestaña)
  publicMessage = signal('');      // Para pestaña Global
  privateMessage = signal('');     // Para pestaña Privado
  
  // Grupo privado persistente (usuarios agregados al chat privado)
  privateGroupMembers = signal<string[]>([]);
  
  // Estado de UI
  showEmojiPicker = signal(false);
  showUserSuggestions = signal(false);
  
  // Estado de conexión del socket
  isConnected = signal(false);
  
  // === COMPUTED SIGNALS ===
  
  // Nombre de usuario actual
  username = computed(() => {
    const user = this.authService.currentUser$();
    return user?.username || 'Invitado';
  });
  
  // ¿Hay mensajes en la pestaña activa?
  hasMessages = computed(() => {
    const list = this.activeTab() === 'global' ? this.messages() : this.privateMessages();
    return list.length > 0;
  });
  
  // Conteo de mensajes globales
  messagesCount = computed(() => this.messages().length);
  
  // Conteo de mensajes privados
  privateMessagesCount = computed(() => this.privateMessages().length);
  
  // Mensaje actual según pestaña activa
  currentMessage = computed(() => {
    return this.activeTab() === 'global' ? this.publicMessage() : this.privateMessage();
  });
  
  // Usuarios filtrados para sugerencias de @ (solo en privado)
  filteredUsers = computed(() => {
    const text = this.privateMessage();
    const index = text.lastIndexOf('@');
    if (index === -1) return [];
    
    const query = text.substring(index + 1).toLowerCase();
    const currentUser = this.username();
    
    return this.connectedUsers().filter(u => 
      u.toLowerCase().includes(query) && 
      u !== currentUser &&
      !this.privateGroupMembers().includes(u) // No mostrar ya agregados
    );
  });
  
  // ¿Hay usuarios en el grupo privado?
  hasPrivateGroup = computed(() => this.privateGroupMembers().length > 0);
  
  // === MÉTODOS PARA MANIPULAR EL ESTADO ===
  
  // Agregar mensaje global
  addMessage(msg: ChatMessage) {
    console.log('📝 [ChatState] Agregando mensaje global:', msg.text, 'Total:', this.messages().length + 1);
    this.messages.update(current => [...current, msg]);
  }
  
  // Agregar mensaje privado
  addPrivateMessage(msg: PrivateMessage) {
    console.log('📝 [ChatState] Agregando mensaje privado:', msg.text, 'Total:', this.privateMessages().length + 1);
    this.privateMessages.update(current => [...current, msg]);
  }
  
  // Actualizar lista de usuarios conectados
  updateConnectedUsers(users: string[]) {
    this.connectedUsers.set(users);
  }
  
  // Actualizar estado de conexión
  updateConnectionStatus(connected: boolean) {
    this.isConnected.set(connected);
  }
  
  // Cambiar pestaña activa
  switchTab(tab: 'global' | 'private') {
    console.log('🔄 [ChatState] Cambiando pestaña a:', tab, 
                'Globales:', this.messages().length, 
                'Privados:', this.privateMessages().length,
                'Miembros grupo:', this.privateGroupMembers().length);
    this.activeTab.set(tab);
  }
  
  // === GRUPO PRIVADO PERSISTENTE ===
  
  // Agregar usuario al grupo privado
  addToPrivateGroup(username: string) {
    if (!this.privateGroupMembers().includes(username)) {
      console.log('👥 [ChatState] Agregando usuario al grupo privado:', username);
      this.privateGroupMembers.update(members => [...members, username]);
    }
  }
  
  // Agregar múltiples usuarios al grupo privado
  addMultipleToPrivateGroup(usernames: string[]) {
    usernames.forEach(username => this.addToPrivateGroup(username));
  }
  
  // Remover usuario del grupo privado
  removeFromPrivateGroup(username: string) {
    this.privateGroupMembers.update(members => members.filter(u => u !== username));
  }
  
  // Limpiar grupo privado
  clearPrivateGroup() {
    this.privateGroupMembers.set([]);
  }
  
  // Verificar si un usuario está en el grupo privado
  isInPrivateGroup(username: string): boolean {
    return this.privateGroupMembers().includes(username);
  }
  
  // === MÉTODOS DE UTILIDAD ===
  
  // Formatear hora para mostrar
  formatTime(date: any): string {
    const d = new Date(date);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // Verificar si un mensaje es propio
  isOwnMessage(username: string): boolean {
    return username === this.username();
  }
  
  // Obtener mensajes para la pestaña activa
  getActiveMessages() {
    return this.activeTab() === 'global' ? this.messages() : this.privateMessages();
  }
  
  // Limpiar mensajes (útil para testing o logout)
  clearMessages() {
    this.messages.set([]);
    this.privateMessages.set([]);
  }
  
  // Cargar historial desde backend
  loadHistory(history: ChatMessage[]) {
    console.log('📜 [ChatState] Cargando historial:', history.length, 'mensajes');
    this.messages.set([...history]);
  }
  
  // Emojis comunes
  readonly commonEmojis: string[] = [
    '😂', '🤣', '❤️', '😍', '👍', '🔥', '🚀', '🎮', '🏆', '💯', 
    '😮', '🤔', '😢', '💀', '✨', '👋', '😎', '😜', '🙌', '🌈',
    '⚡', '🍕', '💻', '💡', '🎉'
  ];
}