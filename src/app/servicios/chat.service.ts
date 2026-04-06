import { Injectable, inject } from '@angular/core';
import { SocketService } from './websocket/socket.service';
import { Observable } from 'rxjs';

export interface ChatMessage {
  id: string;
  text: string;
  username: string;
  timestamp: Date;
  roomId?: string | null;
  isSystem?: boolean;
}

export interface GroupUpdateMessage {
  id: string;
  type: 'group_updated' | 'group_info';
  username: string;
  members: string[];
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private socketService = inject(SocketService);

  // Conectar al socket de chat
  connect() {
    this.socketService.connect();
  }

  // Verificar si está conectado
  isConnected(): boolean {
    return this.socketService.socket?.connected || false;
  }

  // Obtener ID del socket
  getSocketId(): string | undefined {
    return this.socketService.socket?.id;
  }

  // Eventos de conexión
  onConnect(): Observable<void> {
    return this.socketService.socket.fromEvent('connect');
  }

  onDisconnect(): Observable<void> {
    return this.socketService.socket.fromEvent('disconnect');
  }

  onError(): Observable<any> {
    return this.socketService.socket.fromEvent('connect_error');
  }

  // Unirse al chat (global o sala)
  joinChat(username: string, roomId?: string | null) {
    if (this.isConnected()) {
      console.log(`📤 Enviando chat:join - usuario: ${username}, sala: ${roomId || 'global'}`);
      this.socketService.socket.emit('chat:join', { username, roomId: roomId || null });
    } else {
      console.warn('⚠️ Socket no conectado, intentando conectar...');
      this.connect();
      // Esperar a que se conecte y luego enviar
      const connectSub = this.onConnect().subscribe(() => {
        console.log(`📤 (Retry) Enviando chat:join - usuario: ${username}, sala: ${roomId || 'global'}`);
        this.socketService.socket.emit('chat:join', { username, roomId: roomId || null });
        connectSub.unsubscribe();
      });
    }
  }

  // Enviar mensaje
  sendMessage(text: string, username: string, roomId?: string | null) {
    if (this.isConnected()) {
      console.log(`📤 Enviando mensaje: "${text}", usuario: ${username}, sala: ${roomId || 'global'}`);
      this.socketService.socket.emit('chat:send_message', {
        text,
        username,
        roomId: roomId || null
      });
    } else {
      console.warn('⚠️ Socket no conectado, intentando conectar...');
      this.connect();
      const connectSub = this.onConnect().subscribe(() => {
        console.log(`📤 (Retry) Enviando mensaje: "${text}", usuario: ${username}, sala: ${roomId || 'global'}`);
        this.socketService.socket.emit('chat:send_message', {
          text,
          username,
          roomId: roomId || null
        });
        connectSub.unsubscribe();
      });
    }
  }

  // Enviar mensaje privado (1-a-1 o 1-a-muchos) con grupos bidireccionales
  sendPrivateMessage(targetUsername: string | string[], text: string, fromUsername: string) {
    if (this.isConnected()) {
      // Convertir a string separado por comas si es array
      const targetUsers = Array.isArray(targetUsername) 
        ? targetUsername.join(',') 
        : targetUsername;
      
      console.log(`📤 Enviando mensaje PRIVADO a ${targetUsers}: "${text}" (con grupos bidireccionales)`);
      this.socketService.socket.emit('chat:private_message', {
        text,
        targetUsername: targetUsers,
        fromUsername
      });
    } else {
      console.warn('⚠️ Socket no conectado, intentando conectar...');
      this.connect();
      const connectSub = this.onConnect().subscribe(() => {
        const targetUsers = Array.isArray(targetUsername) 
          ? targetUsername.join(',') 
          : targetUsername;
        
        console.log(`📤 (Retry) Enviando mensaje PRIVADO a ${targetUsers}: "${text}"`);
        this.socketService.socket.emit('chat:private_message', {
          text,
          targetUsername: targetUsers,
          fromUsername
        });
        connectSub.unsubscribe();
      });
    }
  }

  // Obtener miembros del grupo privado desde el backend
  getPrivateGroup(username: string) {
    if (this.isConnected()) {
      console.log(`📤 Solicitando grupo privado para: ${username}`);
      this.socketService.socket.emit('chat:get_private_group', { username });
    }
  }

  // Unirse a sala de chat específica
  joinChatRoom(roomId: string) {
    if (this.isConnected()) {
      console.log(`📤 Uniéndose a sala de chat: ${roomId}`);
      this.socketService.socket.emit('chat:join_room', { roomId });
    }
  }

  // Salir de sala de chat específica
  leaveChatRoom(roomId: string) {
    if (this.isConnected()) {
      console.log(`📤 Saliendo de sala de chat: ${roomId}`);
      this.socketService.socket.emit('chat:leave_room', { roomId });
    }
  }

  // --- ESCUCHAR EVENTOS ---

  // Recibir mensajes (globales o de sala)
  onMessage(): Observable<ChatMessage> {
    return this.socketService.socket.fromEvent('chat:message');
  }

  // Recibir historial de mensajes
  onHistory(): Observable<ChatMessage[]> {
    return this.socketService.socket.fromEvent('chat:history');
  }

  // Recibir mensajes privados (con información de grupos bidireccionales)
  onPrivateMessage(): Observable<any> {
    return this.socketService.socket.fromEvent('chat:private_message');
  }

  // Recibir actualizaciones de grupo
  onGroupUpdate(): Observable<GroupUpdateMessage> {
    return this.socketService.socket.fromEvent('chat:group_update');
  }

  // Recibir información de grupo
  onGroupInfo(): Observable<GroupUpdateMessage> {
    return this.socketService.socket.fromEvent('chat:group_info');
  }

  // Recibir lista de usuarios conectados
  onUsersList(): Observable<string[]> {
    return this.socketService.socket.fromEvent('chat:users_list');
  }
}