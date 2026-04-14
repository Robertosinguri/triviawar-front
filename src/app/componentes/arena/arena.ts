import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { environment } from '../../../environments/environment';
import { AudioService } from '../../servicios/audio/audio.service'; // 🔊 Importado

interface PreguntaArena {
  id: string;
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  tematica: string;
  dificultad: string;
  aportadoPor?: string;
  aiIndicator?: string;
}

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arena.html',
  styleUrls: ['./arena.scss']
})
export class ArenaComponent implements OnInit, OnDestroy {
  // Configuración de la arena
  roomCode: string = '';
  tematicas: string[] = [];
  dificultad: string = 'baby';
  modo: string = ''; 

  // Estado del juego
  estadoJuego: 'cargando' | 'jugando' | 'finalizado' = 'cargando';
  preguntas: PreguntaArena[] = [];
  preguntaActual: number = 0;
  totalPreguntas: number = 5;

  // Estado de la pregunta actual
  preguntaActualObj: PreguntaArena | null = null;
  respuestaSeleccionada: number | null = null;
  mostrarRespuesta: boolean = false;
  respuestaCorrecta: boolean = false;

  // Puntaje y tiempo
  puntaje: number = 0;
  tiempoRestante: number = 30;
  tiempoInicio: number = 0;
  timerInterval: any;

  // Usuario actual
  nombreJugador: string = '';

  // Indicador de IA
  aiUsada: string = '';
  aiIndicator: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: FirebaseAuthService,
    private cdr: ChangeDetectorRef,
    private audioService: AudioService // 🔊 Inyectado
  ) { }

  async ngOnInit() {
    await this.cargarUsuario();
    this.cargarConfiguracion();
    this.configurarWebSocket();
    this.iniciarArena();
  }

  ngOnDestroy() {
    this.limpiarTimer();
    // 🔊 Detener música de arena al salir
    this.audioService.stopArena(); 
  }

  private async cargarUsuario() {
    try {
      const user = this.authService.usuarioActual();
      this.nombreJugador = user?.name || user?.username || 'Jugador';
    } catch (error) {
      this.nombreJugador = 'Jugador';
    }
  }

  private cargarConfiguracion() {
    const params = this.route.snapshot.queryParams;
    this.roomCode = params['roomCode'] || '';
    this.dificultad = params['dificultad'] || 'baby';
    this.modo = params['modo'] || '';

    if (params['tematicas']) {
      this.tematicas = params['tematicas'].split(',').filter((t: string) => t.trim());
    }
  }

  private configurarWebSocket() {
    // WebSocket removido - usar solo HTTP según código nuevo
  }

  private async iniciarArena() {
    this.estadoJuego = 'cargando';
    this.tiempoInicio = Date.now();

    const navState = history.state;
    if (navState && navState.gameData && navState.gameData.preguntas) {
      console.log('📦 Datos de juego recibidos desde Lobby');
      this.cargarDatosJuego(navState.gameData);
      return;
    }

    console.warn('⚠️ No hay datos de juego en estado. Posible recarga de página.');
    this.audioService.play('incorrecto'); // 🔊 Feedback de error
    alert('Juego interrumpido por recarga. Vuelve al menú.');
    this.router.navigate(['/dashboard']);
  }

  private cargarDatosJuego(data: any) {
    if (data.preguntas && data.preguntas.length > 0) {
      this.preguntas = data.preguntas;
      this.totalPreguntas = data.preguntas.length;
      this.aiUsada = data.aiInfo?.model || data.aiUsada || 'IA';

      if (data.dificultad) this.dificultad = data.dificultad;

      if (data.tematicas && Array.isArray(data.tematicas)) {
        this.tematicas = data.tematicas;
      } else if (data.tematica) {
        this.tematicas = Array.isArray(data.tematica) ? data.tematica : [data.tematica];
      }

      const modelLower = this.aiUsada.toLowerCase();
      if (modelLower.includes('gemini')) this.aiIndicator = '🤖';
      else if (modelLower.includes('cohere')) this.aiIndicator = '🧡';
      else if (modelLower.includes('llama')) this.aiIndicator = '🦙';
      else if (modelLower.includes('mistral')) this.aiIndicator = '🌪️';
      else this.aiIndicator = '✨';

      this.cargarPreguntaActual();
      this.estadoJuego = 'jugando';
      
      // 🔊 Iniciar música de batalla específica de Arena
      this.audioService.playArena(); 

      this.iniciarTimer();
      this.cdr.detectChanges();
    } else {
      this.mostrarErrorIA('No se recibieron preguntas válidas');
    }
  }

  getShortAiName(): string {
    const model = (this.aiUsada || '').toLowerCase();
    if (model.includes('groq')) return 'Groq';
    if (model.includes('cohere')) return 'Cohere';
    if (model.includes('hugging') || (model.includes('llama') && !model.includes('groq'))) return 'Llama';
    if (model.includes('openrouter')) return 'OpenRouter';
    return 'IA';
  }

  private cargarPreguntaActual() {
    if (this.preguntaActual < this.preguntas.length) {
      this.preguntaActualObj = this.preguntas[this.preguntaActual];
      this.respuestaSeleccionada = null;
      this.mostrarRespuesta = false;
      this.respuestaCorrecta = false;
      this.tiempoRestante = 30;
    }
  }

  private iniciarTimer() {
    this.limpiarTimer();
    this.timerInterval = setInterval(() => {
      this.tiempoRestante--;
      this.cdr.detectChanges(); 

      if (this.tiempoRestante <= 0) {
        this.tiempoAgotado();
      }
    }, 1000);
  }

  private limpiarTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private tiempoAgotado() {
    this.limpiarTimer();
    if (!this.mostrarRespuesta) {
      this.confirmarRespuesta();
    }
  }

  seleccionarRespuesta(indice: number) {
    if (!this.mostrarRespuesta) {
      this.respuestaSeleccionada = indice;
      this.audioService.play('click'); // 🔊 Sonido al elegir
    }
  }

  confirmarRespuesta() {
    if (this.preguntaActualObj) {
      this.limpiarTimer();
      this.mostrarRespuesta = true;

      if (this.respuestaSeleccionada === this.preguntaActualObj.respuestaCorrecta) {
        this.respuestaCorrecta = true;
        this.puntaje++;
        this.audioService.play('correcto'); // 🔊 ¡Acierto!
      } else {
        this.respuestaCorrecta = false;
        this.audioService.play('incorrecto'); // 🔊 Error
      }
    }
  }

  siguientePregunta() {
    this.audioService.play('click'); // 🔊 Feedback al click
    if (this.esUltimaPregunta()) {
      this.finalizarArena();
    } else {
      this.preguntaActual++;
      this.cargarPreguntaActual();
      this.iniciarTimer();
    }
  }

  private async finalizarArena() {
    this.limpiarTimer();
    this.estadoJuego = 'finalizado';

    try {
      const usuario = this.authService.usuarioActual();
      const userId = usuario?.uid || usuario?.email || 'anon-' + Date.now();
      const displayName = usuario?.name || usuario?.username || this.nombreJugador || 'Jugador';
      const tiempoTotal = Math.floor((Date.now() - this.tiempoInicio) / 1000);

      const response = await fetch(`${environment.apiUrl}/games/submit-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: this.roomCode,
          userId,
          username: displayName,
          puntaje: this.puntaje,
          respuestasCorrectas: this.puntaje,
          totalPreguntas: this.totalPreguntas,
          tiempoTotal,
          tematica: this.tematicas.join(','),
          dificultad: this.dificultad
        })
      });

      const data = await response.json();

      if (data.success) {
        if (data.allPlayersFinished) {
          const datosCompletos = {
            ranking: data.ranking,
            estadisticasEquipo: data.estadisticasEquipo
          };

          localStorage.setItem('ranking-partida', JSON.stringify(datosCompletos));
          localStorage.setItem('ganador-partida', JSON.stringify(data.ganador));

          this.router.navigate(['/resultados'], {
            queryParams: {
              roomCode: this.roomCode,
              tema: this.tematicas.join(','),
              dificultad: this.dificultad,
              modo: this.modo
            }
          });
        } else {
          this.mostrarPantallaEspera(data.playersFinished, data.totalPlayers);
        }
      } else {
        this.audioService.play('incorrecto'); // 🔊 Error en proceso
        alert('Error procesando resultados. Intenta de nuevo.');
      }
    } catch (error) {
      this.audioService.play('incorrecto'); // 🔊 Error de conexión
      alert('Error de conexión. Verifica tu internet.');
    }
  }

  esUltimaPregunta(): boolean {
    return this.preguntaActual >= this.totalPreguntas - 1;
  }

  get progreso(): number {
    return ((this.preguntaActual + 1) / this.totalPreguntas) * 100;
  }

  getLetraOpcion(indice: number): string {
    return String.fromCharCode(65 + indice);
  }

  getTematicasTexto(): string {
    return this.tematicas.join(' vs ');
  }

  private mostrarErrorIA(mensaje: string) {
    this.limpiarTimer();
    this.audioService.play('incorrecto'); // 🔊 Sonido de error
    this.estadoJuego = 'finalizado';

    const reintentar = confirm(`❌ Error: ${mensaje}\n\n¿Quieres intentar recargar las preguntas?`);

    if (reintentar) {
      this.audioService.play('click');
      this.estadoJuego = 'cargando';
      this.iniciarArena();
    } else {
      this.salirArena();
    }
  }

  salirArena() {
    this.audioService.play('click');
    this.router.navigate(['/dashboard']);
  }

  private mostrarPantallaEspera(jugadoresTerminados: number, totalJugadores: number) {
    this.estadoJuego = 'finalizado';
    // La UI de espera se genera dinámicamente según el código original
  }
}