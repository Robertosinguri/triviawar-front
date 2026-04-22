import { Injectable, signal, computed, inject } from '@angular/core';
import { ChatMessage } from './chat.service';
import { FirebaseAuthService } from './auth/firebase-auth.service';

@Injectable({ providedIn: 'root' })
export class ChatStateService {
  private authService = inject(FirebaseAuthService);

  // === ESTADO PERSISTENTE DEL CHAT ===
  
  // Mensajes globales/sala (persistentes durante toda la sesión)
  messages = signal<ChatMessage[]>([]);
  
  // Usuarios conectados (actualizado en tiempo real)
  connectedUsers = signal<string[]>([]);
  
  // Pestaña activa (solo global ahora)
  activeTab = signal<'global'>('global');
  
  // Mensaje actual en el input
  publicMessage = signal('');
  
  // Estado de UI
  showEmojiPicker = signal(false);
  
  // Estado Responsive
  isMobileExpanded = signal(false);
  unreadCount = signal(0);
  
  // Estado de conexión del socket
  isConnected = signal(false);
  
  // Identidad actualmente sincronizada en el socket (para evitar re-joins innecesarios)
  activeSessionUser = signal<string | null>(null);
  
  // === COMPUTED SIGNALS ===
  
  // Nombre de usuario actual
  username = computed(() => {
    const user = this.authService.currentUser$();
    return user?.username || 'Invitado';
  });
  
  // ¿Hay mensajes?
  hasMessages = computed(() => this.messages().length > 0);
  
  // Conteo de mensajes
  messagesCount = computed(() => this.messages().length);
  
  // Mensaje actual
  currentMessage = computed(() => this.publicMessage());
  
  // === MÉTODOS PARA MANIPULAR EL ESTADO ===
  
  // Agregar mensaje global
  addMessage(msg: ChatMessage) {
    console.log('📝 [ChatState] Agregando mensaje global:', msg.text, 'Total:', this.messages().length + 1);
    this.messages.update(current => [...current, msg]);
  }
  
  // Actualizar lista de usuarios conectados
  updateConnectedUsers(users: string[]) {
    this.connectedUsers.set(users);
  }
  
  // Actualizar estado de conexión
  updateConnectionStatus(connected: boolean) {
    this.isConnected.set(connected);
  }
  
  // Cambiar pestaña activa (solo global ahora)
  switchTab(tab: 'global') {
    console.log('🔄 [ChatState] Cambiando pestaña a:', tab, 
                'Globales:', this.messages().length);
    this.activeTab.set(tab);
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
  
  // Obtener mensajes activos
  getActiveMessages() {
    return this.messages();
  }
  
  // Limpiar mensajes (útil para testing o logout)
  clearMessages() {
    console.log('🧹 [ChatState] Limpiando todos los mensajes');
    this.messages.set([]);
  }

  // Limpiar mensajes de una sala específica
  clearRoomMessages(roomId: string) {
    if (!roomId) return;
    
    console.log(`🧹 [ChatState] Limpiando mensajes de sala: ${roomId}`);
    this.messages.update(current => 
      current.filter(msg => msg.roomId !== roomId)
    );
  }

  // Limpiar TODO el estado del chat
  clearAllChatState() {
    console.log('🧹 [ChatState] Limpiando TODO el estado del chat');
    
    // Limpiar mensajes
    this.messages.set([]);
    
    // Limpiar input
    this.publicMessage.set('');
    
    // Resetear pestaña a global
    this.activeTab.set('global');
    
    // Limpiar estado de UI
    this.showEmojiPicker.set(false);
    this.isMobileExpanded.set(false);
    this.unreadCount.set(0);
    this.activeSessionUser.set(null); // Resetear sesión al limpiar todo
    
    console.log('✅ [ChatState] Estado del chat completamente limpiado');
  }

  // Limpiar estado cuando cambia el usuario (por si hay cambio de usuario sin logout)
  clearOnUserChange(newUsername: string) {
    const currentUsername = this.username();
    if (currentUsername !== newUsername && currentUsername !== 'Invitado') {
      console.log(`🔄 [ChatState] Cambio de usuario detectado: ${currentUsername} -> ${newUsername}. Limpiando chat.`);
      this.clearAllChatState();
    }
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