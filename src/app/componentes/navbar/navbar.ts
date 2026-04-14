import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { Router, RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { ChatStateService } from '../../servicios/chat-state.service';
import { Subscription } from 'rxjs';


@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(FirebaseAuthService);
  private router = inject(Router);
  private socketService = inject(SocketService);
  private chatStateService = inject(ChatStateService);
  private cdr = inject(ChangeDetectorRef);
  private statsSub?: Subscription;
  // private estadisticasService = inject(EstadisticasService);

  @Input() pageTitle?: string;
  @Input() showBackBtn: boolean = false;
  @Output() onBack = new EventEmitter<void>();

  showStats = false;
  estadisticas: any | null = null;
  showMobileMenu = false;
  showAvatarSelector = false;

  availableAvatars = [
    '01.png', '02.png', '03.png', '04.png', '05.png', '06.png',
    '07.png', '08.png', '09.png', '10.png', '11.png', '12.png',
    '13.png', '14.png', '15.png', '16.png', '17.png', '18.png',
    '19.png', '20.png', '21.png', '22.png', '23.png', '24.png'
  ];

  constructor() {
    console.log('🖥️ NAVBAR DESKTOP CARGADO');
  }

  ngOnInit() {
    console.log('🖥️ NAVBAR DESKTOP INICIALIZADO');

    // Mover lógica a otro lado si es necesario
    // ...

    // 📊 Suscribirse a las estadísticas desde el socket
    this.statsSub = this.socketService.onMyStatsReceived().subscribe(stats => {
      console.log('💹 Estadísticas recibidas en Navbar:', stats);
      this.estadisticas = stats;
      this.cdr.detectChanges(); // 🔧 Evitar error NG0100
    });
  }

  getUserName(): string {
    const user = this.authService.usuarioActual();
    return user?.name || user?.email?.split('@')[0] || user?.username || 'Usuario';
  }

  getUserEmail(): string {
    const user = this.authService.usuarioActual();
    return user?.email || '';
  }

  getUserAvatar(): string {
    const user = this.authService.usuarioActual();
    const avatar = user?.picture;

    if (!avatar) return '';

    // Si es un nombre de archivo local (01.png, 02.png, etc.)
    if (avatar.match(/^\d+\.png$/)) {
      return `avatares/${avatar}`; // Sin slash inicial para que Angular lo resuelva correctamente
    }

    // Si ya es una URL completa (http/https)
    if (avatar.startsWith('http')) {
      return avatar;
    }

    // Si ya tiene el prefijo avatares/
    if (avatar.startsWith('avatares/')) {
      return avatar;
    }

    // Fallback: asumir que es un archivo local
    return `avatares/${avatar}`;
  }

  hasAvatar(): boolean {
    return !!this.getUserAvatar();
  }

  getAvatarPath(filename: string): string {
    return `avatares/${filename}`;
  }

  onAvatarError(event: any) {
    console.error('Error cargando avatar:', event.target.src);
    event.target.src = 'avatares/01.png'; // Fallback a avatar por defecto
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
        console.log('Avatar actualizado:', avatar);
      } else {
        alert('Error actualizando avatar');
      }
    } catch (error) {
      console.error('Error actualizando avatar:', error);
      alert('Error actualizando avatar');
    }
  }

  private cargarEstadisticas() {
    const user = this.authService.usuarioActual();
    if (user) {
      // 🎯 IMPORTANTE: Usar UID si existe, sino email (como en Arena)
      const userId = user.uid || user.email;
      if (!userId) return;

      console.log('📡 Solicitando estadísticas reales para:', userId);

      this.socketService.connect();
      this.socketService.getMyStats(userId, user.name);
    }
  }

  toggleStats() {
    this.showStats = !this.showStats;
    if (this.showStats && !this.estadisticas) {
      this.cargarEstadisticas();
    }
  }

  toggleMobileMenu() {
    this.showMobileMenu = !this.showMobileMenu;

    // Prevenir scroll del body cuando el menú está abierto
    if (this.showMobileMenu) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  closeMobileMenu() {
    this.showMobileMenu = false;
    document.body.style.overflow = '';
  }

  // Cerrar menú al navegar
  onMenuItemClick() {
    this.closeMobileMenu();
  }

  // Emite acción al presionar "Volver" en la barra de contexto de la página
  onBackClick() {
    this.onBack.emit();
  }

  async logout() {
    console.log('🚪 LOGOUT EJECUTADO');
    try {
      // Limpiar estado del chat antes de hacer logout
      this.chatStateService.clearMessages();
      this.chatStateService.clearPrivateGroup();
      
      await this.authService.logout();
      this.socketService.disconnect();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('❌ Error en logout:', error);
    }
  }

  ngOnDestroy() {
    // Limpiar overflow del body
    document.body.style.overflow = '';
    if (this.statsSub) {
      this.statsSub.unsubscribe();
    }
  }
}
