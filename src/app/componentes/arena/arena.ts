import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
//import { BackgroundComponent } from '../background/background';
import { environment } from '../../../environments/environment';
import { AudioService } from '../../servicios/audio/audio.service'; // 🔊 Agregado

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
  modo: string = ''; // 'entrenamiento' o vacío para multijugador

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
    private audioService: AudioService // Agregado
  ) { }

  async ngOnInit() {
    await this.cargarUsuario();
    this.cargarConfiguracion();
    this.configurarWebSocket();
    this.iniciarArena();
  }

  ngOnDestroy() {
    this.limpiarTimer();
    // No desconectar WebSocket - puede ser usado por otros componentes
    // this.webSocketService.disconnect();
    this.audioService.stopArena(); // Agregado
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
    // WebSocket removido - usar solo HTTP
  }

  private async iniciarArena() {
    this.estadoJuego = 'cargando';
    this.tiempoInicio = Date.now();

    // 1. Intentar recuperar datos pasados por el Lobby (Router State)
    const navState = history.state;
    if (navState && navState.gameData && navState.gameData.preguntas) {
      console.log('📦 Datos de juego recibidos desde Lobby');
      this.cargarDatosJuego(navState.gameData);
      return;
    }

    // 2. Si no hay datos (ej. Refresh), intentar pedir estado actual al backend (TODO: Implementar API getRoom)
    // Por ahora, mostrar error o redirigir
    console.warn('⚠️ No hay datos de juego en estado. Posible recarga de página.');

    // Opción temporal: Intentar unirse de nuevo al socket y esperar sync (si hubiera esa lógica)
    // O simplemente redirigir al dashboard para evitar incoherencias
    this.audioService.play('incorrecto'); //  Agregado
    alert('Juego interrumpido por recarga. Vuelve al menú.');
    this.router.navigate(['/dashboard']);
  }

  private cargarDatosJuego(data: any) {
    if (data.preguntas && data.preguntas.length > 0) {
      this.preguntas = data.preguntas;
      this.totalPreguntas = data.preguntas.length;
      this.aiUsada = data.aiInfo?.model || data.aiUsada || 'IA';

      // 🎯 FIX: Cargar dificultad y temáticas desde gameData
      if (data.dificultad) {
        this.dificultad = data.dificultad;
        console.log('✅ Dificultad cargada desde gameData:', this.dificultad);
      }

      if (data.tematicas && Array.isArray(data.tematicas)) {
        this.tematicas = data.tematicas;
        console.log('✅ Temáticas cargadas desde gameData:', this.tematicas);
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
      this.audioService.playArena(); //  Agregado (con Fade)
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

  // Método legacy eliminado: obtenerPreguntas() ya no debe llamar a generate-questions
  private async obtenerPreguntas() {
    // Placeholder porsiaca
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
      this.cdr.detectChanges(); // 🔧 Force UI update

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
      this.audioService.play('click'); //  Agregado
    }
  }

  confirmarRespuesta() {
    if (this.preguntaActualObj) {
      this.limpiarTimer();
      this.mostrarRespuesta = true;

      if (this.respuestaSeleccionada === this.preguntaActualObj.respuestaCorrecta) {
        this.respuestaCorrecta = true;
        this.puntaje++;
        this.audioService.play('correcto'); //  Agregado
      } else {
        this.respuestaCorrecta = false;
        this.audioService.play('incorrecto'); //  Agregado
      }
    }
  }

  siguientePregunta() {
    this.audioService.play('click'); //  Agregado
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
      // Si no hay sesión, usar ID temporal para que el resultado se guarde y aparezca en el ranking
      const userId = usuario?.uid || usuario?.email || 'anon-' + Date.now();
      const displayName = usuario?.name || usuario?.username || this.nombreJugador || 'Jugador';

      const tiempoTotal = Math.floor((Date.now() - this.tiempoInicio) / 1000);

      // Enviar resultado al backend para que se guarde y se refleje en el ranking
      const response = await fetch(`${environment.apiUrl}/games/submit-result`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
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

      console.log('📥 Respuesta del backend:', data);
      console.log('🎯 Ranking recibido:', data.ranking);
      console.log('👑 Ganador recibido:', data.ganador);

      if (data.success) {
        if (data.allPlayersFinished) {

          // Guardar ranking y estadísticas en localStorage para resultados
          const datosCompletos = {
            ranking: data.ranking,
            estadisticasEquipo: data.estadisticasEquipo
          };

          console.log('💾 Guardando en localStorage:', {
            datosCompletos,
            ganador: data.ganador
          });

          localStorage.setItem('ranking-partida', JSON.stringify(datosCompletos));
          localStorage.setItem('ganador-partida', JSON.stringify(data.ganador));

          // Navegar a resultados con datos reales
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
        this.audioService.play('incorrecto'); //  Agregado
        alert('Error procesando resultados. Intenta de nuevo.');
      }
    } catch (error) {
      this.audioService.play('incorrecto'); // Agregado
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
    this.audioService.play('incorrecto'); // Agregado
    this.estadoJuego = 'finalizado';

    // Mostrar mensaje con opción de reintentar
    const reintentar = confirm(`❌ Error: ${mensaje}\n\n¿Quieres intentar recargar las preguntas?`);

    if (reintentar) {
      this.audioService.play('click'); // Agregado
      this.estadoJuego = 'cargando';
      this.iniciarArena();
    } else {
      this.salirArena();
    }
  }

  salirArena() {
    this.audioService.play('click'); // Agregado
    this.router.navigate(['/dashboard']);
  }

  private mostrarPantallaEspera(jugadoresTerminados: number, totalJugadores: number) {
    this.estadoJuego = 'finalizado';

    const arenaContainer = document.querySelector('.arena-container');
    if (arenaContainer) {
      arenaContainer.innerHTML = `
        <div class="waiting-screen">
          <h2>🏁 ¡Partida Terminada!</h2>
          <div class="waiting-message">
            <p>Has completado tu cuestionario.</p>
            <p>Esperando a que terminen los demás jugadores...</p>
            <div class="progress-info">
              <span class="progress-text">Jugadores terminados: ${jugadoresTerminados}/${totalJugadores}</span>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${(jugadoresTerminados / totalJugadores) * 100}%"></div>
              </div>
            </div>
            <div class="loading-spinner"></div>
          </div>
        </div>
      `;
    }

    // Polling optimizado para verificar si todos terminaron
    let pollCount = 0;
    const maxPolls = 20; // Máximo 1 minuto de polling

    const pollingInterval = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        clearInterval(pollingInterval);
        console.log('⚠️ Polling timeout, navegando a dashboard');
        this.router.navigate(['/dashboard']);
        return;
      }

      try {
        const response = await fetch(`${environment.apiUrl}/rooms/${this.roomCode}`);
        const salaData = await response.json();

        // Verificar si la sala tiene resultados finales
        if (salaData.estado === 'finalizada' || salaData.resultadosFinales) {
          clearInterval(pollingInterval);

          const datosCompletos = {
            ranking: salaData.resultadosFinales?.ranking || [],
            estadisticasEquipo: salaData.resultadosFinales?.estadisticasEquipo || null
          };
          localStorage.setItem('ranking-partida', JSON.stringify(datosCompletos));
          localStorage.setItem('ganador-partida', JSON.stringify(salaData.resultadosFinales?.ganador));

          this.router.navigate(['/resultados'], {
            queryParams: {
              roomCode: this.roomCode,
              tema: this.tematicas.join(','),
              dificultad: this.dificultad
            }
          });
        }
      } catch (error) {
        console.log('Error en polling:', error);
      }
    }, 5000); // Aumentar intervalo a 5s
  }
}