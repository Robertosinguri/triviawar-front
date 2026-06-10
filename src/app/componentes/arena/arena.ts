import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { resolveAvatarUrl } from '../../servicios/avatar-utils';
import { environment } from '../../../environments/environment';
import { AudioService } from '../../servicios/audio/audio.service';

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

interface JugadorEspera {
  id: string;
  nombre: string;
  esHost: boolean;
  terminado: boolean;
  picture?: string | null;
}

@Component({
  selector: 'app-arena',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './arena.html',
  styleUrls: ['./arena.scss']
})
export class ArenaComponent implements OnInit, OnDestroy {
  private subs: Subscription = new Subscription();

  roomCode: string = '';
  tematicas: string[] = [];
  dificultad: string = 'baby';
  modo: string = '';

  estadoJuego: 'cargando' | 'jugando' | 'finalizado' = 'cargando';
  preguntas: PreguntaArena[] = [];
  preguntaActual: number = 0;
  totalPreguntas: number = 0;

  preguntaActualObj: PreguntaArena | null = null;
  respuestaSeleccionada: number | null = null;
  mostrarRespuesta: boolean = false;
  respuestaCorrecta: boolean = false;

  rondaActual: number = 1;
  mostrarIntermedio: boolean = false;
  cuentaRegresivaIntermedio: number = 0;

  puntaje: number = 0;
  correctasCount: number = 0;
  tiempoRestante: number = 30;
  tiempoInicio: number = 0;
  timerInterval: any;

  nombreJugador: string = '';
  aiUsada: string = '';
  aiIndicator: string = '';

  jugadoresEspera: JugadorEspera[] = [];
  mostrandoEspera: boolean = false;
  totalJugadoresSala: number = 0;
  private pollingEspera: any = null;
  private navegandoAResultados: boolean = false;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: FirebaseAuthService,
    private socketService: SocketService,
    private cdr: ChangeDetectorRef,
    private audioService: AudioService
  ) { }

  async ngOnInit() {
    // Actualizar la ruta para el AudioService
    this.audioService.actualizarRutaActual('/arena');
    await this.cargarUsuario();
    this.cargarConfiguracion();
    this.configurarWebSocket();
    this.iniciarArena();
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.limpiarTimer();
    if (this.pollingEspera) {
      clearInterval(this.pollingEspera);
      this.pollingEspera = null;
    }
    this.audioService.guardarEstadoMusicaAntesDeNavegar();
    this.audioService.stopArena();
  }

  private async cargarUsuario() {
    try {
      const user = this.authService.usuarioActual();
      this.nombreJugador = user?.username || user?.name || 'Jugador';
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
    this.socketService.connect();

    this.subs.add(
      this.socketService.onRankingUpdate().subscribe((data: any) => {
        if (data && data.roomPlayers) {
          this.jugadoresEspera = data.roomPlayers;
          if (data.ranking && data.ranking.length >= this.totalJugadoresSala) {
            this.totalJugadoresSala = data.ranking.length > this.totalJugadoresSala ? data.ranking.length : this.totalJugadoresSala;
          }
          this.cdr.detectChanges();
        }
      })
    );
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
    this.audioService.play('incorrecto');
    alert('Juego interrumpido por recarga. Vuelve al menú.');
    this.router.navigate(['/dashboard']);
  }

  private cargarDatosJuego(data: any) {
    if (data.preguntas && data.preguntas.length > 0) {
      this.preguntas = data.preguntas;
      this.totalPreguntas = data.preguntas.length;
      this.aiUsada = data.aiInfo?.model || data.aiUsada || 'IA';

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
      this.audioService.playArena();
      this.iniciarTimer();
      this.cdr.detectChanges();
    } else {
      this.mostrarErrorIA('No se recibieron preguntas válidas');
    }
  }

  getShortAiName(): string {
    const model = (this.aiUsada || '').toLowerCase();
    if (model.includes('gemini')) return 'Gemini';
    if (model.includes('groq')) return 'Groq';
    if (model.includes('cohere')) return 'Cohere';
    if (model.includes('hugging') || (model.includes('llama') && !model.includes('groq'))) return 'Llama';
    if (model.includes('openrouter')) return 'OpenRouter';
    return 'IA';
  }

  private async obtenerPreguntas() {
    // Placeholder
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
      this.audioService.play('click');
    }
  }

  confirmarRespuesta() {
    if (this.preguntaActualObj) {
      this.limpiarTimer();
      this.mostrarRespuesta = true;

      if (this.respuestaSeleccionada === this.preguntaActualObj.respuestaCorrecta) {
        this.respuestaCorrecta = true;
        this.correctasCount++;
        
        let puntosBase = 10;
        if (this.preguntaActualObj.dificultad === 'conocedor') puntosBase = 20;
        else if (this.preguntaActualObj.dificultad === 'killer') puntosBase = 30;

        this.puntaje += puntosBase;
        this.audioService.play('correcto');
      } else {
        this.respuestaCorrecta = false;
        this.audioService.play('incorrecto');
      }
    }
  }

  siguientePregunta() {
    this.audioService.play('click');
    if (this.esUltimaPregunta()) {
      this.finalizarArena();
    } else {
      if (this.modo !== 'entrenamiento') {
        const preguntasPorRonda = this.tematicas.length || 1;
        if ((this.preguntaActual + 1) % preguntasPorRonda === 0) {
          this.mostrarIntermedio = true;
          this.rondaActual++;
          this.limpiarTimer();
          this.cuentaRegresivaIntermedio = 5;

          const intervalTimer = setInterval(() => {
            this.cuentaRegresivaIntermedio--;
            this.cdr.detectChanges();
            if (this.cuentaRegresivaIntermedio <= 0) {
              clearInterval(intervalTimer);
              this.mostrarIntermedio = false;
              this.preguntaActual++;
              this.cargarPreguntaActual();
              this.iniciarTimer();
              this.cdr.detectChanges();
            }
          }, 1000);
          return;
        }
      }

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
      const displayName = usuario?.username || usuario?.name || this.nombreJugador || 'Jugador';

      const tiempoTotal = Math.floor((Date.now() - this.tiempoInicio) / 1000);

      const resultPayload = {
        roomCode: this.roomCode,
        userId,
        username: displayName,
        puntaje: this.puntaje,
        respuestasCorrectas: this.correctasCount,
        totalPreguntas: this.totalPreguntas,
        tiempoTotal,
        tematica: this.tematicas.join(','),
        dificultad: this.dificultad
      };

      const response = await fetch(`${environment.apiUrl}/games/submit-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultPayload)
      });

      const data = await response.json();

      console.log('📥 Respuesta del backend:', data);

      if (data.success) {
        this.socketService.notifyProgress(this.roomCode);

        if (data.allPlayersFinished) {
          const datosCompletos = {
            ranking: data.ranking,
            estadisticasEquipo: data.estadisticasEquipo
          };

          localStorage.setItem('ranking-partida', JSON.stringify(datosCompletos));
          localStorage.setItem('ganador-partida', JSON.stringify(data.ganador));

          this.mostrarPantallaEspera(data);

          setTimeout(() => {
            if (this.mostrandoEspera) {
              this.router.navigate(['/resultados'], {
                queryParams: {
                  roomCode: this.roomCode,
                  tema: this.tematicas.join(','),
                  dificultad: this.dificultad,
                  modo: this.modo
                }
              });
            }
          }, 2500);
        } else {
          this.mostrarPantallaEspera(data);
        }
      } else {
        this.audioService.play('incorrecto');
        alert('Error procesando resultados. Intenta de nuevo.');
      }
    } catch (error) {
      this.audioService.play('incorrecto');
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

  get jugadoresPendientes(): number {
    return this.totalJugadoresSala - this.jugadoresEspera.filter(j => j.terminado).length;
  }

  get jugadoresFinalizados(): JugadorEspera[] {
    return this.jugadoresEspera.filter(j => j.terminado);
  }

  avatarUrl(jugador: JugadorEspera): string | null {
    if (!jugador.picture) return null;
    if (jugador.picture.startsWith('http')) return jugador.picture;
    return resolveAvatarUrl(jugador.picture);
  }

  private mostrarErrorIA(mensaje: string) {
    this.limpiarTimer();
    this.audioService.play('incorrecto');
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

 // arena.component.ts - En salirArena y ngOnDestroy
salirArena() {
  if (!confirm('⚠️ ¿Salir de la arena? Perderás el progreso de esta partida.')) return;
  this.audioService.play('click');
  this.audioService.guardarEstadoMusicaAntesDeNavegar();
  this.audioService.stopArena();
  this.audioService.actualizarRutaActual('/dashboard');
  this.router.navigate(['/dashboard']);
}


  private mostrarPantallaEspera(data: any) {
    this.estadoJuego = 'finalizado';
    this.mostrandoEspera = true;
    this.totalJugadoresSala = data.totalPlayers || data.roomPlayers?.length || 0;

    if (data.roomPlayers && data.roomPlayers.length > 0) {
      this.jugadoresEspera = data.roomPlayers;
    } else {
      this.jugadoresEspera = [{
        id: data.userId || 'yo',
        nombre: this.nombreJugador,
        esHost: false,
        terminado: true
      }];
    }

    this.cdr.detectChanges();

    if (this.pollingEspera) {
      clearInterval(this.pollingEspera);
    }

    let pollCount = 0;
    const maxPolls = 40;

    this.pollingEspera = setInterval(async () => {
      pollCount++;

      if (pollCount > maxPolls) {
        clearInterval(this.pollingEspera);
        this.pollingEspera = null;
        console.log('⚠️ Polling timeout, navegando a dashboard');
        this.router.navigate(['/dashboard']);
        return;
      }

      try {
        const response = await fetch(`${environment.apiUrl}/rooms/${this.roomCode}`);

        if (response.status === 404) {
          clearInterval(this.pollingEspera);
          this.pollingEspera = null;
          console.log('🗑️ Sala eliminada, navegando a dashboard');
          this.router.navigate(['/dashboard']);
          return;
        }

        const salaData = await response.json();

        if (salaData.jugadores && this.jugadoresEspera.length > 0) {
          const idsEnSala = salaData.jugadores.map((j: any) => j.id);
          const antes = this.jugadoresEspera.length;
          this.jugadoresEspera = this.jugadoresEspera.filter(j => idsEnSala.includes(j.id));
          if (this.jugadoresEspera.length !== antes) {
            this.totalJugadoresSala = salaData.jugadores.length;
            this.cdr.detectChanges();
          }
        }

        if (salaData.estado === 'finalizada' || salaData.resultadosFinales) {
          clearInterval(this.pollingEspera);
          this.pollingEspera = null;

          if (salaData.resultadosFinales) {
            const datosCompletos = {
              ranking: salaData.resultadosFinales.ranking || [],
              estadisticasEquipo: salaData.resultadosFinales.estadisticasEquipo || null
            };
            localStorage.setItem('ranking-partida', JSON.stringify(datosCompletos));
            localStorage.setItem('ganador-partida', JSON.stringify(salaData.resultadosFinales.ganador));
          }

          this.jugadoresEspera = this.jugadoresEspera.map(j => ({ ...j, terminado: true }));
          this.totalJugadoresSala = this.jugadoresEspera.length;
          this.cdr.detectChanges();

          if (this.navegandoAResultados) return;
          this.navegandoAResultados = true;

          setTimeout(() => {
            this.router.navigate(['/resultados'], {
              queryParams: {
                roomCode: this.roomCode,
                tema: this.tematicas.join(','),
                dificultad: this.dificultad
              }
            });
          }, 2000);
        }
      } catch (error) {
        console.log('Error en polling:', error);
      }
    }, 5000);
  }
}