import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { ChatStateService } from '../../servicios/chat-state.service';
import { EstadisticasService, EstadisticasUsuario } from '../../servicios/estadisticas/estadisticas.service';
import { AudioService } from '../../servicios/audio/audio.service';
import { ControlComponent } from '../control/control';
import { PwaInstallService } from '../../servicios/pwa/pwa-install.service';

@Component({
  selector: 'app-navbar-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule, ControlComponent],
  templateUrl: './navbar-mobile.html',
  styleUrls: ['./navbar-mobile.scss', './navbar.scss'] // Reutilizar estilos del navbar original
})
export class NavbarMobileComponent implements OnInit {
  showStats = false;
  estadisticas: EstadisticasUsuario | null = null;
  showAvatarSelector = false;
  mensajePwa = '';

  readonly pwaInstallService = inject(PwaInstallService);

  availableAvatars = [
    '01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp',
    '07.webp', '08.webp', '09.webp', '10.webp', '11.webp', '12.webp',
    '13.webp', '14.webp', '15.webp', '16.webp', '17.webp'
  ];

  private socketService = inject(SocketService);
  private chatStateService = inject(ChatStateService);
  private audioService = inject(AudioService);

  constructor(
    private router: Router,
    private authService: FirebaseAuthService,
    private estadisticasService: EstadisticasService
  ) {
    console.log('📱 NAVBAR MÓVIL CARGADO');
  }

  ngOnInit() {
    console.log('📱 NAVBAR MÓVIL INICIALIZADO');
    this.cargarEstadisticas();
  }

  getUserName(): string {
    const user = this.authService.currentUser$();
    return user?.name || user?.email?.split('@')[0] || user?.username || 'Usuario';
  }

  getUserEmail(): string {
    const user = this.authService.currentUser$();
    return user?.email || '';
  }

  getUserAvatar(): string {
    const user = this.authService.currentUser$();
    const avatar = user?.picture;
    if (!avatar) return '';

    if (avatar.match(/^\d+\.(png|webp)$/)) {
      const webpAvatar = avatar.replace(/\.png$/, '.webp');
      return `avatares/${webpAvatar}`;
    }
    if (avatar.startsWith('http')) return avatar;
    if (avatar.startsWith('avatares/')) return avatar;
    return `avatares/${avatar}`;
  }

  hasAvatar(): boolean {
    return !!this.getUserAvatar();
  }

  private avatarErrorFlag = false;

  abrirSelectorAvatar() {
    this.showAvatarSelector = true;
  }

  onAvatarError(event: any) {
    if (this.avatarErrorFlag) {
      event.target.src = '';
      return;
    }
    this.avatarErrorFlag = true;
    console.error('Error cargando avatar:', event.target.src);
    event.target.src = 'avatares/01.webp';
  }

  cerrarSelectorAvatar() {
    this.showAvatarSelector = false;
  }

  async seleccionarAvatar(avatar: string) {
    try {
      const success = await this.authService.actualizarAvatar(avatar);
      if (success) {
        this.showAvatarSelector = false;
      }
    } catch (error) {
      console.error('Error actualizando avatar:', error);
    }
  }

  private async cargarEstadisticas(): Promise<void> {
    try {
      const currentUser = this.authService.usuarioActual();

      if (!currentUser) return;

      const userId = currentUser.email;
      const username = currentUser.name || currentUser.username || 'Usuario';

      if (userId) {
        this.estadisticasService.obtenerEstadisticasPersonales(userId, username).subscribe({
          next: (stats) => {
            this.estadisticas = stats;
          },
          error: (error) => {
            console.error('Error cargando estadísticas:', error);
          }
        });
      }
    } catch (error) {
      console.error('Error en cargarEstadisticas:', error);
    }
  }

  toggleStats() {
    this.showStats = !this.showStats;
  }

  async instalarPwa() {
    this.mensajePwa = await this.pwaInstallService.install();

    // Auto-limpiar el mensaje después de 5 segundos
    if (this.mensajePwa) {
      setTimeout(() => {
        this.mensajePwa = '';
      }, 5000);
    }
  }

  async logout() {
    try {
      // Limpiar estado del chat antes de hacer logout
      this.chatStateService.clearAllChatState();
      
      // Desconectar socket y detener audio al salir
      this.socketService.disconnect();
      this.audioService.stopAll();
      
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }
}