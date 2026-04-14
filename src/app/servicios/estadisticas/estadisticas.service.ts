import { Injectable, inject } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface EstadisticasUsuario {
    partidasJugadas: number;
    mejorPuntaje: number;
    promedio: number;
    puntajeTotal: number;
    temasRecientes: string[];
    posicionRanking?: number;
}

export interface ResultadoJuego {
    userId: string;
    username: string;
    puntaje: number;
    respuestasCorrectas: number;
    totalPreguntas: number;
    tiempoTotal: number;
    tematica: string;
    dificultad: string;
    fecha?: Date | string;
}

export interface JugadorRanking {
    posicion: number;
    userId: string;
    email?: string;
    nombre: string;
    puntajeTotal: number;
    partidasJugadas: number;
    promedio: number;
}

@Injectable({
    providedIn: 'root'
})
export class EstadisticasService {
    private http = inject(HttpClient);
    private readonly API_URL = `${environment.apiUrl}/api/stats`;

    obtenerEstadisticasPersonales(userId: string, username: string): Observable<EstadisticasUsuario> {
        return this.http.get<any>(`${this.API_URL}/personal?userId=${userId}&username=${username}`).pipe(
            map(res => res.stats)
        );
    }

    obtenerRankingGlobal(limite: number = 50): Observable<JugadorRanking[]> {
        return this.http.get<any>(`${this.API_URL}/ranking?limite=${limite}`).pipe(
            map(res => res.ranking)
        );
    }

    guardarResultado(resultado: any): Promise<any> {
        // El juego ya llama a /games/submit-result directamente
        return this.http.post(`${environment.apiUrl}/api/games/submit-result`, resultado).toPromise();
    }

    // Alias para compatibilidad
    guardarResultadoPartida(resultado: any) {
        return from(this.guardarResultado(resultado));
    }
}
