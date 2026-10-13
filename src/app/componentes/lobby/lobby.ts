import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { Subscription } from 'rxjs';
import { AudioService } from '../../servicios/audio/audio.service';
import { environment } from '../../../environments/environment';

import { ChatComponent } from '../chat/chat';
import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-lobby',
  standalone: true,
  imports: [FormsModule, CommonModule, ChatComponent, NavbarComponent],
  templateUrl: './lobby.html',
  styleUrls: ['./lobby.scss']
})
export class LobbyComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(FirebaseAuthService);
  private socketService = inject(SocketService);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private audioService = inject(AudioService);

  private subs: Subscription = new Subscription();
  private heartbeatTimer: any = null;

  codigoSala: string = '';
  esHost: boolean = false;

  sala: any = null;
  jugadores: any[] = [];
  currentUser: any = null;

  // 0 = todavía no conocemos la capacidad real de la sala (no asumimos 4)
  maxJugadores: number = 0;
  emailInvitacion: string = '';

  tematicaJugador: string = '';
  estaListo: boolean = false;

  isLoading = false;
  iniciandoPartida = false;
  cuentaRegresiva: number = 0;

  // Evita mandar leave_room cuando la salida es por inicio de partida o porque ya se salió manualmente
  private yendoAArena = false;
  private yaSalio = false;

  async ngOnInit() {
    const user = this.authService.usuarioActual();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = {
      id: user.uid || user.email || 'anon-' + Date.now(),
      nombre: user.username || user.name
    };

    this.codigoSala = this.route.snapshot.queryParams['codigo'];
    this.esHost = this.route.snapshot.queryParams['host'] === 'true';

    if (!this.codigoSala) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // INICIAR música de lobby SOLO si no hay música sonando
    if (!this.audioService.isHayMusicaSonando()) {
      console.log('No hay música sonando, iniciando música de lobby');
      this.audioService.playFondo();
    } else {
      console.log('Ya hay música sonando, continuando en lobby');
    }

    // Conectar y suscribir PRIMERO, para no perder el primer room_updated
    this.socketService.connect();
    this.escucharSocket();

    // Cargar el estado real de la sala por HTTP (no depender solo del broadcast)
    this.cargarSala();

    // Recién ahora unirse (provoca el broadcast al resto)
    this.socketService.joinRoom(this.codigoSala, this.currentUser);

    // Heartbeat para que el backend sepa que la sala sigue activa
    this.heartbeatTimer = setInterval(() => {
      if (this.codigoSala && !this.yaSalio && !this.yendoAArena) {
        this.socketService.heartbeat(this.codigoSala);
      }
    }, 60000);
  }

  private cargarSala() {
    this.http.get<any>(`${environment.apiUrl}/rooms/${this.codigoSala}`).subscribe({
      next: (sala) => this.aplicarSala(sala),
      error: () => {
        // Si la sala no existe, el error de join_room se encarga de avisar y navegar
      }
    });
  }

  private aplicarSala(sala: any) {
    if (!sala) return;
    this.sala = sala;
    this.jugadores = sala.jugadores || [];
    if (sala.maxJugadores) this.maxJugadores = sala.maxJugadores;

    const me = this.jugadores.find(j => j.id === this.currentUser?.id);
    if (me) {
      this.estaListo = me.configurado;
      if (me.tematica) this.tematicaJugador = me.tematica;
    }

    this.cdr.detectChanges();
  }

  todosListos(): boolean {
    if (!this.jugadores || this.jugadores.length < 2) return false;
    return this.jugadores.every(j => j.configurado);
  }

  escucharSocket() {
    // Escuchar actualizaciones de sala
    this.subs.add(
      this.socketService.onRoomUpdated().subscribe((sala) => {
        this.aplicarSala(sala);
      })
    );

    // Escuchar inicio de juego
    this.subs.add(
      this.socketService.onGameStarted().subscribe((gameData) => {
        console.log('Juego listo! Iniciando cuenta regresiva...');

        // No debemos salir de la sala: vamos a la arena
        this.yendoAArena = true;
        this.detenerHeartbeat();

        // DETENER la música de lobby
        this.audioService.stopFondo();

        this.cuentaRegresiva = 3;

        const timer = setInterval(() => {
          this.cuentaRegresiva--;
          this.cdr.detectChanges();

          if (this.cuentaRegresiva <= 0) {
            clearInterval(timer);

            // Iniciar música de arena
            this.audioService.playArena();

            this.router.navigate(['/arena'], {
              queryParams: { roomCode: this.codigoSala },
              state: { gameData: gameData }
            });
          }
        }, 1000);
      })
    );

    // Escuchar errores
    this.subs.add(
      this.socketService.onError().subscribe((err: any) => {
        console.error('Socket error:', err);
        const msg = (err && err.message) || '';

        if (msg.includes('tema ya fue elegido')) {
          alert('Esa temática ya fue elegida por otro jugador. Elige otra!');
          this.estaListo = false;
          this.socketService.updateConfig(this.codigoSala, this.currentUser.id, {
            tematica: '',
            configurado: false
          });
          this.cdr.detectChanges();
          return;
        }

        if (msg.includes('No se pudieron generar las preguntas') || msg.includes('Error iniciando juego')) {
          // El backend devolvió la sala a 'esperando' y avisó a todos los jugadores
          alert('La IA no pudo generar las preguntas esta vez. Vuelvan a intentarlo.');
          this.estaListo = false;
          this.socketService.updateConfig(this.codigoSala, this.currentUser.id, {
            tematica: this.tematicaJugador || '',
            configurado: false
          });
          this.cdr.detectChanges();
          return;
        }

        if (msg.includes('Sala no encontrada') || msg.includes('ya ha comenzado') || msg.includes('Sala llena')) {
          alert('No se pudo entrar a la sala: ' + msg);
          this.yaSalio = true;
          this.detenerHeartbeat();
          this.router.navigate(['/dashboard']);
        }
      })
    );
  }

  iniciarPartida() {
    if (this.esHost) {
      this.audioService.play('click');
      this.socketService.startGame(this.codigoSala);
    }
  }

  salirSala() {
    this.audioService.play('click');
    this.salirDeLaSala();
    // Guardar estado antes de salir para que el dashboard sepa que debe reanudar
    this.audioService.guardarEstadoMusicaAntesDeNavegar();
    this.audioService.stopFondo();
    this.router.navigate(['/dashboard']);
  }

  // Libera el lugar del jugador en la sala (evita salas fantasma)
  private salirDeLaSala() {
    if (this.yaSalio) return;
    this.yaSalio = true;
    this.detenerHeartbeat();
    if (this.currentUser && this.codigoSala) {
      this.socketService.leaveRoom(this.codigoSala, this.currentUser.id);
    }
  }

  private detenerHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  getSlotsVacios(): any[] {
    const total = this.maxJugadores || 0;
    const ocupados = this.jugadores ? this.jugadores.length : 0;
    const vacios = total - ocupados;
    return new Array(vacios > 0 ? vacios : 0);
  }

  copiado = false;
  copiarCodigo() {
    this.audioService.play('click');
    navigator.clipboard.writeText(this.codigoSala).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 2000);
    });
  }

  enviarInvitacion() { 
    this.emailInvitacion = ''; 
  }
  
  volver() { 
    this.salirSala(); 
  }

  // Configuración de jugador
  toggleListo() {
    this.audioService.play('click');
    
    if (!this.estaListo) {
      if (!this.tematicaJugador.trim()) {
        alert('Por favor ingresa una temática para jugar.');
        return;
      }
      this.estaListo = true;
      this.socketService.updateConfig(this.codigoSala, this.currentUser.id, {
        tematica: this.tematicaJugador.trim(),
        configurado: true
      });
    } else {
      this.estaListo = false;
      this.socketService.updateConfig(this.codigoSala, this.currentUser.id, {
        tematica: '',
        configurado: false
      });
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
    this.detenerHeartbeat();

    // Si se abandona el lobby por navegación (no por inicio de partida ni por el botón Salir),
    // hay que liberar el lugar para no dejar salas fantasma.
    if (!this.yendoAArena && !this.yaSalio) {
      this.salirDeLaSala();
    }
  }
}
