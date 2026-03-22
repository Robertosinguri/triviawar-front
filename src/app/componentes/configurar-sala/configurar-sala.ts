import { Component, OnInit, OnDestroy, ChangeDetectorRef, inject } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
//import { BackgroundComponent } from '../background/background';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { Subscription } from 'rxjs';

interface ConfiguracionJugador {
  tematica: string;
  dificultad: 'baby' | 'conocedor' | 'killer' | '';
  jugadores?: number;
}

@Component({
  selector: 'app-configurar-sala',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './configurar-sala.html',
  styleUrls: ['./configurar-sala.scss']
})
export class ConfigurarSalaComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(FirebaseAuthService);
  private socketService = inject(SocketService);
  private cdr = inject(ChangeDetectorRef);

  private subs: Subscription = new Subscription();

  isLoading = false;
  configuracion: ConfiguracionJugador = {
    tematica: '',
    dificultad: '',
    jugadores: 2
  };

  esHost: boolean = true;
  codigoSala: string = '';

  sugerenciasTematicas: string[] = [
    'deportes', 'historia', 'ciencia', 'música',
    'cine', 'tecnología', 'cocina', 'arte'
  ];

  infoSalaExistente?: any;
  currentUserId: string = '';

  async ngOnInit() {
    const user = this.authService.usuarioActual();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }
    this.currentUserId = user.email || '';

    // Conectar socket si no lo está
    this.socketService.connect();

    this.esHost = this.router.url.includes('crear');

    if (!this.esHost) {
      this.codigoSala = this.route.snapshot.queryParams['codigo'] || '';
      // Unirse como invitado al confirmar
    }

    // Escuchar eventos de socket
    this.escucharSocket();
  }

  escucharSocket() {
    // Al crear sala
    this.subs.add(
      this.socketService.onRoomCreated().subscribe((sala) => {
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
        if (sala) {
          this.router.navigate(['/lobby'], {
            queryParams: { codigo: sala.id, host: 'true' }
          });
        }
      })
    );

    // Al unirse (escuchar room_updated o success) 
    // Nota: Si joinRoom emite room_updated a todos, podemos usar eso para confirmar
    this.subs.add(
      this.socketService.onRoomUpdated().subscribe((sala) => {
        if (this.isLoading && !this.esHost && sala.id === this.codigoSala) {
          // Confirmación exitosa de unión
          setTimeout(() => {
            this.isLoading = false;
            this.cdr.detectChanges();
          });
          this.router.navigate(['/lobby'], {
            queryParams: { codigo: this.codigoSala, host: 'false' }
          });
        }
      })
    );

    this.subs.add(
      this.socketService.onError().subscribe((err) => {
        // alert('Error: ' + err.message);
        setTimeout(() => {
          this.isLoading = false;
          this.cdr.detectChanges();
        });
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  tematicaInvalida: boolean = false;

  validarTematica(event: any) {
    const valor = event.target.value.trim();
    const palabras = valor.split(/\s+/);
    if (palabras.length > 3) {
      this.configuracion.tematica = palabras.slice(0, 3).join(' ');
    }
    this.tematicaInvalida = false;
  }

  contarPalabras(texto: string): number {
    return texto?.trim() ? texto.trim().split(/\s+/).length : 0;
  }

  esConfiguracionValida(): boolean {
    return this.configuracion.tematica.trim() !== '' &&
      this.configuracion.dificultad !== '' &&
      (!this.esHost || (this.configuracion.jugadores || 0) >= 2);
  }

  // Getter helper para plantilla
  getDistribucionPreguntas(): string {
    if (!this.configuracion.jugadores) return '';
    const p = Math.floor(5 / this.configuracion.jugadores);
    const extra = 5 % this.configuracion.jugadores;
    return extra === 0 ? `${p} preguntas por jugador` : `${p}-${p + 1} preguntas por jugador`;
  }

  async crearSala() {
    if (!this.esConfiguracionValida() || this.isLoading) return;
    this.isLoading = true;

    const user = this.authService.usuarioActual();
    if (!user) return;

    const userId = user.email || user.uid || 'anon-' + Date.now();

    const roomData = {
      nombre: `${user.username || user.name}'s Game`,
      maxJugadores: this.configuracion.jugadores!,
      host: {
        id: userId,
        nombre: user.name || user.username || 'Host',
        tematica: this.configuracion.tematica.trim(),
        dificultad: this.configuracion.dificultad
      }
    };

    // Emitir via socket
    this.socketService.createRoom(roomData);
  }

  async confirmarConfiguracion() {
    if (!this.esConfiguracionValida() || this.isLoading) return;
    this.isLoading = true;

    const user = this.authService.usuarioActual();
    if (!user) return;

    const jugadorData = {
      id: user.email || user.uid || 'anon-' + Date.now(),
      nombre: user.name || user.username || 'Invitado',
      tematica: this.configuracion.tematica.trim(),
      dificultad: this.configuracion.dificultad
    };

    this.socketService.joinRoom(this.codigoSala, jugadorData);
  }

  seleccionarSugerencia(sugerencia: string) {
    this.configuracion.tematica = sugerencia;
  }

  volver() {
    this.router.navigate(['/dashboard']);
  }

  copiado = false;
  copiarCodigo() {
    navigator.clipboard.writeText(this.codigoSala).then(() => {
      this.copiado = true;
      this.cdr.detectChanges();
    });
  }
}
