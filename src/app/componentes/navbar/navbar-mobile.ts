import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { EstadisticasService, EstadisticasUsuario } from '../../servicios/estadisticas/estadisticas.service';

@Component({
  selector: 'app-navbar-mobile',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar-mobile.html',
  styleUrls: ['./navbar-mobile.scss', './navbar.scss'] // Reutilizar estilos del navbar original
})
export class NavbarMobileComponent implements OnInit {
  showStats = false;
  estadisticas: EstadisticasUsuario | null = null;
  showAvatarSelector = false;

  availableAvatars = [
    '01.png', '02.png', '03.png', '04.png', '05.png', '06.png',
    '07.png', '08.png', '09.png', '10.png', '11.png', '12.png',
    '13.png', '14.png', '15.png', '16.png', '17.png', '18.png',
    '19.png', '20.png', '21.png', '22.png', '23.png', '24.png'
  ];

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
    const avatarPath = user?.picture ? `/avatares/${user.picture}` : '';
    return avatarPath;
  }

  hasAvatar(): boolean {
    return !!this.getUserAvatar();
  }

  abrirSelectorAvatar() {
    this.showAvatarSelector = true;
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

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Error en logout:', error);
    }
  }
}