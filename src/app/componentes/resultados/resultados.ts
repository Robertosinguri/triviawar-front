import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
//import { BackgroundComponent } from '../background/background';
import { EstadisticasService, JugadorRanking } from '../../servicios/estadisticas/estadisticas.service';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';

interface ResultadoJugador {
  userId: string;
  username: string;
  puntaje: number;
  tiempoTotal: number;
  porcentaje: number;
  posicion: number;
  tematica?: string;
  respuestasCorrectas?: number;
  totalPreguntas?: number;
}

interface JugadorGlobal {
  userId: string;
  username: string;
  puntosTotales: number;
  posicion: number;
  esMiPosicion: boolean;
}

interface EstadisticasEquipo {
  totalJugadores: number;
  respuestasCorrectasTotales: number;
  respuestasTotales: number;
  promedioAciertos: number;
  tiempoPromedioEquipo: number;
  mejorTiempo: number;
  peorTiempo: number;
}

import { ChatComponent } from '../chat/chat';

@Component({
  selector: 'app-resultados',
  standalone: true,
  imports: [CommonModule, ChatComponent],
  templateUrl: './resultados.html',
  styleUrls: ['./resultados.scss']
})
export class ResultadosComponent implements OnInit {
  resultados: ResultadoJugador[] = [];
  ganador: ResultadoJugador | null = null;
  miResultado: ResultadoJugador | null = null;
  rankingGlobal: JugadorGlobal[] = [];
  estadisticasEquipo: EstadisticasEquipo | null = null;
  roomCode: string = '';
  tematica: string = '';
  dificultad: string = '';
  miUserId: string = '';
  nombreUsuarioActual: string = 'Mi Usuario';
  esEntrenamiento: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private estadisticasService: EstadisticasService,
    private authService: FirebaseAuthService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit() {
    await this.cargarResultados();
  }

  private async cargarResultados() {
    const params = this.route.snapshot.queryParams;
    this.roomCode = params['roomCode'] || 'TEST123';
    this.tematica = params['tema'] || 'Deportes';
    this.dificultad = params['dificultad'] || 'conocedor';
    this.esEntrenamiento = params['modo'] === 'entrenamiento';

    // Obtener el mismo identificador que se usó en Arena
    try {
      const user = this.authService.usuarioActual();
      // Usar uid primero, luego email, igual que en Arena
      this.miUserId = user?.uid || user?.email || 'anon-' + Date.now();
      this.nombreUsuarioActual = user?.name || user?.username || 'Mi Usuario';
      console.log('👤 Usuario identificado:', this.miUserId, this.nombreUsuarioActual);
    } catch (error) {
      this.miUserId = 'anon-' + Date.now();
      this.nombreUsuarioActual = 'Mi Usuario';
    }

    // Obtener resultados reales del localStorage (guardados por arena)
    const rankingGuardado = localStorage.getItem('ranking-partida');
    const ganadorGuardado = localStorage.getItem('ganador-partida');

    console.log('📦 Datos en localStorage:', { rankingGuardado, ganadorGuardado });

    if (rankingGuardado) {
      try {
        let ganadorData = null;
        const datosCompletos = JSON.parse(rankingGuardado);
        console.log('📊 Datos parseados:', datosCompletos);

        // Si es un objeto con ranking y estadisticas
        if (datosCompletos.ranking) {
          this.resultados = datosCompletos.ranking;
          this.estadisticasEquipo = datosCompletos.estadisticasEquipo || null;
        } else {
          // Formato anterior, solo array de resultados
          this.resultados = datosCompletos;
        }

        // 🛡️ Sanitize results to ensure required properties exist, preventing display errors.
        this.resultados = this.resultados.map(jugador => {
          const aciertos = jugador.respuestasCorrectas || 0;
          const total = jugador.totalPreguntas || 0;
          let porcentaje = jugador.porcentaje ?? 0;

          // AUTO-CORRECCIÓN: Si el porcentaje es 0 pero tenemos datos crudos, recalculamos.
          if (porcentaje === 0 && total > 0) {
            porcentaje = Math.round((aciertos / total) * 100);
          }

          return {
            ...jugador,
            puntaje: jugador.puntaje ?? 0,
            tiempoTotal: jugador.tiempoTotal ?? 0,
            porcentaje: porcentaje,
          };
        });

        if (ganadorGuardado) {
          ganadorData = JSON.parse(ganadorGuardado);
          // Also sanitize the explicit winner object
          ganadorData = {
            ...ganadorData,
            puntaje: ganadorData.puntaje ?? 0,
            tiempoTotal: ganadorData.tiempoTotal ?? 0,
            porcentaje: ganadorData.porcentaje ?? 0,
          };
        }

        // Asignar ganador y mi resultado
        // FIX: Priorizar el ganador encontrado en el ranking (posicion 1), ya que 'ranking-partida' 
        // suele tener los datos más completos/actualizados del backend (puntos, tiempo, porcentaje).
        const ganadorDelRanking = this.resultados.find(r => r.posicion === 1);
        this.ganador = ganadorDelRanking || ganadorData || this.resultados[0] || null;
      } catch (error) {
        console.error('❌ Error parseando datos:', error);
        this.crearDatosFallback();
      }
    } else {
      console.warn('⚠️ No hay datos en localStorage, usando fallback');
      this.crearDatosFallback();
    }

    console.log('✅ Resultados cargados y sanitizados:', this.resultados);
    console.log('👑 Ganador asignado:', this.ganador);

    // Busca el resultado del usuario actual en la lista
    this.miResultado = this.resultados.find(r => r.userId === this.miUserId) || null;

    // Sobrescribe la temática con la del resultado real, que puede ser una combinación.
    if (this.ganador?.tematica) {
      this.tematica = this.ganador.tematica;
    }

    console.log('🔍 Buscando mi resultado con userId:', this.miUserId);
    console.log('📋 Resultados disponibles:', this.resultados.map(r => ({ userId: r.userId, username: r.username })));
    console.log('✨ Mi resultado encontrado:', this.miResultado);
    console.log('👑 Ganador completo:', this.ganador);
    console.log('🎯 Propiedades del ganador:', {
      username: this.ganador?.username,
      userId: this.ganador?.userId,
      puntaje: this.ganador?.puntaje,
      porcentaje: this.ganador?.porcentaje
    });

    // Forzar detección de cambios
    this.cdr.detectChanges();

    // Cargar ranking global
    this.cargarRankingGlobal();
  }

  getMedalla(posicion: number): string {
    switch (posicion) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '🏅';
    }
  }

  formatearTiempo(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return minutos > 0 ? `${minutos}m ${segs}s` : `${segs}s`;
  }



  private cargarRankingGlobal() {
    // Usar exactamente el mismo servicio que el dashboard
    this.estadisticasService.obtenerRankingGlobal(4).subscribe({
      next: (rankingCompleto) => {
        if (rankingCompleto && rankingCompleto.length > 0) {
          // Convertir directamente a formato JugadorGlobal usando email como identificador
          this.rankingGlobal = rankingCompleto.map((jugador) => ({
            userId: jugador.userId,
            username: jugador.nombre,
            puntosTotales: jugador.puntajeTotal,
            posicion: jugador.posicion,
            esMiPosicion: jugador.userId === this.miUserId
          }));

          this.cdr.detectChanges();
        } else {
          this.rankingGlobal = [];
        }
      },
      error: (error) => {
        this.rankingGlobal = [];
      }
    });
  }

  volverAlDashboard() {
    this.router.navigate(['/dashboard']);
  }

  trackByUserId(index: number, item: ResultadoJugador): string {
    return item.userId;
  }

  trackByGlobalUserId(index: number, item: JugadorGlobal): string {
    return item.userId;
  }

  private crearDatosFallback() {
    // Crear datos de fallback solo para el usuario actual
    this.resultados = [
      {
        userId: this.miUserId,
        username: this.nombreUsuarioActual,
        puntaje: 0,
        tiempoTotal: 0,
        porcentaje: 0,
        posicion: 1
      }
    ];

    this.ganador = this.resultados[0];
    this.miResultado = this.resultados[0];
  }
}