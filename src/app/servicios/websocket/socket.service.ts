import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';

@Injectable({
    providedIn: 'root'
})
export class SocketService {
    constructor(public socket: Socket) { }

    connect() { return this.socket.connect(); }
    disconnect() { return this.socket.disconnect(); }

    // Emisores (Cliente -> Servidor)
    createRoom(roomData: any) {
        this.socket.emit('create_room', roomData);
    }

    joinRoom(roomCode: string, player: any) {
        this.socket.emit('join_room', { roomCode, player });
    }

    leaveRoom(roomCode: string, userId: string) {
        this.socket.emit('leave_room', { roomCode, userId });
    }

    updateConfig(roomCode: string, userId: string, config: any) {
        this.socket.emit('update_config', { roomCode, userId, config });
    }

    startGame(roomCode: string) {
        this.socket.emit('start_game', { roomCode });
    }

    // Oyentes (Servidor -> Cliente)
    onRoomCreated(): Observable<any> {
        return this.socket.fromEvent('room_created');
    }

    onRoomUpdated(): Observable<any> {
        return this.socket.fromEvent('room_updated');
    }

    onGameStarted(): Observable<any> {
        return this.socket.fromEvent('game_started');
    }

    onGameLoading(): Observable<any> {
        return this.socket.fromEvent('game_loading');
    }

    // Estadísticas
    getMyStats(userId: string, username?: string) {
        this.socket.emit('get_my_stats', { userId, username });
    }

    onMyStatsReceived(): Observable<any> {
        return this.socket.fromEvent('my_stats_received');
    }

    getGlobalRanking(limite: number = 50) {
        this.socket.emit('get_global_ranking', { limite });
    }

    onGlobalRankingReceived(): Observable<any> {
        return this.socket.fromEvent('global_ranking_received');
    }

    saveGameResult(userId: string, resultado: any) {
        this.socket.emit('save_game_result', { userId, resultado });
    }

    onGameResultSaved(): Observable<any> {
        return this.socket.fromEvent('game_result_saved');
    }

    onError(): Observable<any> {
        return this.socket.fromEvent('error');
    }
}
