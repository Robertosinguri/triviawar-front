import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
//import { BackgroundComponent } from '../background/background';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { Subscription } from 'rxjs';

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
  private cdr = inject(ChangeDetectorRef);

  private subs: Subscription = new Subscription();

  codigoSala: string = '';
  esHost: boolean = false;

  sala: any = null;
  jugadores: any[] = [];
  currentUser: any = null;

  maxJugadores: number = 4;
  emailInvitacion: string = '';

  tematicaJugador: string = '';
  estaListo: boolean = false;

  isLoading = false;
  iniciandoPartida = false;
  cuentaRegresiva: number = 0;

  async ngOnInit() {
    const user = this.authService.usuarioActual();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUser = {
      id: user.email || user.uid || 'anon-' + Date.now(),
      nombre: user.username || user.name
    };

    this.codigoSala = this.route.snapshot.queryParams['codigo'];
    this.esHost = this.route.snapshot.queryParams['host'] === 'true';

    if (!this.codigoSala) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Conectar y unirse (si no lo hizo ya en configurar-sala)
    this.socketService.connect();
    // Siempre enviamos join_room al llegar al lobby por si acaso (idempotencia en backend o re-conexión)
    this.socketService.joinRoom(this.codigoSala, this.currentUser);

    this.escucharSocket();
  }

  // Agregado helper para plantilla
  todosListos(): boolean {
    if (!this.jugadores || this.jugadores.length < 2) return false;
    return this.jugadores.every(j => j.configurado);
  }

  escucharSocket() {
    // Escuchar actualizaciones de sala
    this.subs.add(
      this.socketService.onRoomUpdated().subscribe((sala) => {
        if (sala) {
          this.sala = sala;
          this.jugadores = sala.jugadores || [];
          this.maxJugadores = sala.maxJugadores;

          // Sincronizar estado local si viene del servidor
          const me = this.jugadores.find(j => j.id === this.currentUser?.id);
          if (me) {
            this.estaListo = me.configurado;
            if (me.tematica) this.tematicaJugador = me.tematica;
          }

          this.cdr.detectChanges();
        }
      })
    );

    // Escuchar inicio de juego
    this.subs.add(
      this.socketService.onGameStarted().subscribe((gameData) => {
        console.log('🚀 Juego listo! Iniciando cuenta regresiva...');
        this.cuentaRegresiva = 3;
        
        const timer = setInterval(() => {
          this.cuentaRegresiva--;
          this.cdr.detectChanges();
          
          if (this.cuentaRegresiva <= 0) {
            clearInterval(timer);
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
        if (err && err.message && err.message.includes('tema ya fue elegido')) {
          alert('Esa temática ya fue elegida por otro jugador. ¡Elige otra!');
          this.estaListo = false;
          // Revertir en backend
          this.socketService.updateConfig(this.codigoSala, this.currentUser.id, {
            tematica: '',
            configurado: false
          });
          this.cdr.detectChanges();
        }
      })
    );
  }

  iniciarPartida() {
    if (this.esHost) {
      this.socketService.startGame(this.codigoSala);
    }
  }

  salirSala() {
    if (this.currentUser) {
      this.socketService.leaveRoom(this.codigoSala, this.currentUser.id);
    }
    this.router.navigate(['/dashboard']);
  }

  // Helpers de UI
  getSlotsVacios(): any[] {
    const total = this.maxJugadores || 4;
    const ocupados = this.jugadores ? this.jugadores.length : 0;
    const vacios = total - ocupados;
    return new Array(vacios > 0 ? vacios : 0);
  }

  copiado = false;
  copiarCodigo() {
    navigator.clipboard.writeText(this.codigoSala).then(() => {
      this.copiado = true;
      setTimeout(() => this.copiado = false, 2000);
    });
  }

  enviarInvitacion() { this.emailInvitacion = ''; }
  volver() { this.salirSala(); }

  // Configuración de jugador
  toggleListo() {
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
  }
}
