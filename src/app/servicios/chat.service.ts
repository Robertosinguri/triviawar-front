import { Injectable, inject } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { SocketService } from './websocket/socket.service';

export interface ChatMessage {
    id: string;
    text: string;
    username: string;
    timestamp: Date;
    roomId?: string | null;
    isSystem?: boolean;
}

@Injectable({
    providedIn: 'root'
})
export class ChatService {
    private socketService = inject(SocketService);
    private isSocketConnected = false;
    private connectionSubscriptions = new Subscription();

    // Conectar socket
    connect() {
        this.socketService.connect();
        // Limpiar suscripciones previas
        this.connectionSubscriptions.unsubscribe();
        this.connectionSubscriptions = new Subscription();
        
        // Escuchar eventos de conexión para actualizar estado
        this.connectionSubscriptions.add(
            this.socketService.socket.fromEvent<void>('connect').subscribe(() => {
                this.isSocketConnected = true;
                console.log('✅ ChatService: Socket conectado');
            })
        );
        
        this.connectionSubscriptions.add(
            this.socketService.socket.fromEvent<void>('disconnect').subscribe(() => {
                this.isSocketConnected = false;
                console.log('❌ ChatService: Socket desconectado');
            })
        );
    }

    // Verificar si el socket está conectado
    isConnected(): boolean {
        return this.isSocketConnected;
    }

    // Obtener ID del socket
    getSocketId(): string | undefined {
        try {
            // Intentar acceder al ID del socket de diferentes maneras
            const socket: any = this.socketService.socket;
            return socket?.ioSocket?.id || socket?.id || 'unknown';
        } catch (error) {
            return 'error';
        }
    }

    // Escuchar eventos de conexión
    onConnect(): Observable<void> {
        return this.socketService.socket.fromEvent<void>('connect');
    }

    // Escuchar eventos de desconexión
    onDisconnect(): Observable<void> {
        return this.socketService.socket.fromEvent<void>('disconnect');
    }

    // Escuchar errores de conexión
    onError(): Observable<any> {
        return this.socketService.socket.fromEvent<any>('error');
    }

    // Unirse al flujo de mensajes del chat (notificar entrada)
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
            console.error('❌ Socket no conectado, no se puede enviar mensaje');
        }
    }

    // Unirse a sala de chat
    joinChatRoom(roomId: string) {
        if (this.isConnected()) {
            console.log(`📤 Uniéndose a sala de chat: ${roomId}`);
            this.socketService.socket.emit('chat:join_room', roomId);
        } else {
            console.warn('⚠️ Socket no conectado, intentando conectar...');
            this.connect();
            const connectSub = this.onConnect().subscribe(() => {
                console.log(`📤 (Retry) Uniéndose a sala de chat: ${roomId}`);
                this.socketService.socket.emit('chat:join_room', roomId);
                connectSub.unsubscribe();
            });
        }
    }

    // Salir de sala de chat
    leaveChatRoom(roomId: string) {
        if (this.isConnected()) {
            console.log(`📤 Saliendo de sala de chat: ${roomId}`);
            this.socketService.socket.emit('chat:leave_room', roomId);
        }
    }

    // Recibir mensajes (Global o Sala)
    onMessage(): Observable<ChatMessage> {
        return this.socketService.socket.fromEvent<ChatMessage>('chat:message');
    }

    // Recibir historial (Solo Global)
    onHistory(): Observable<ChatMessage[]> {
        return this.socketService.socket.fromEvent<ChatMessage[]>('chat:history');
    }

    // Limpiar recursos
    ngOnDestroy() {
        this.connectionSubscriptions.unsubscribe();
    }

    // --- NUEVAS FUNCIONALIDADES PARA SUB-CHATS ---

    // Recibir lista de usuarios conectados
    onUsersList(): Observable<string[]> {
        return this.socketService.socket.fromEvent<string[]>('chat:users_list');
    }

    // Recibir mensajes privados
    onPrivateMessage(): Observable<any> {
        return this.socketService.socket.fromEvent<any>('chat:private_message');
    }

    // Enviar mensaje privado (Sub-chat)
    sendPrivateMessage(targetUsername: string, text: string, fromUsername: string) {
        if (this.isConnected()) {
            console.log(`📤 Enviando mensaje PRIVADO a ${targetUsername}: "${text}"`);
            this.socketService.socket.emit('chat:private_message', {
                text,
                targetUsername,
                fromUsername
            });
        }
    }
}