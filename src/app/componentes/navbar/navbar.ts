import { Component, OnInit, inject, OnDestroy, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { Router, RouterModule, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { SocketService } from '../../servicios/websocket/socket.service';
import { ChatStateService } from '../../servicios/chat-state.service';
import { Subscription } from 'rxjs';
import { AudioService } from '../../servicios/audio/audio.service';
import { ControlComponent } from '../control/control';
import { environment } from '../../../environments/environment';

const BASE = environment.mediaUrl || '';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterLink, RouterLinkActive, ControlComponent],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  private authService = inject(FirebaseAuthService);
  private router = inject(Router);
  private socketService = inject(SocketService);
  private chatStateService = inject(ChatStateService);
  private cdr = inject(ChangeDetectorRef);
  private audioService = inject(AudioService);
  private statsSub?: Subscription;
  // private estadisticasService = inject(EstadisticasService);

  @Input() pageTitle?: string;
  @Input() showBackBtn: boolean = false;
  @Output() onBack = new EventEmitter<void>();

  showStats = false;
  estadisticas: any | null = null;
  showMobileMenu = false;
  showAvatarSelector = false;
  showEnlargedAvatar = false;

  availableAvatars = [
    '01.webp', '02.webp', '03.webp', '04.webp', '05.webp', '06.webp',
    '07.webp', '08.webp', '09.webp', '10.webp', '11.webp', '12.webp',
    '13.webp', '14.webp', '15.webp', '16.webp', '17.webp', '18.webp',
    '19.webp', '20.webp', '21.webp', '22.webp', '23.webp', '24.webp'
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
    return user?.username || user?.name || user?.email?.split('@')[0] || 'Usuario';
  }

  getUserEmail(): string {
    const user = this.authService.usuarioActual();
    return user?.email || '';
  }

  getUserAvatar(): string {
    const user = this.authService.usuarioActual();
    const avatar = user?.picture;

    if (!avatar) return '';

    // Si es un nombre de archivo local (01.png, 02.png, 01.webp, etc.)
    if (avatar.match(/^\d+\.(png|webp)$/)) {
      // Convertir .png a .webp si es necesario
      const webpAvatar = avatar.replace(/\.png$/, '.webp');
      return `${BASE}/avatares/${webpAvatar}`;
    }

    // Si ya es una URL completa (http/https)
    if (avatar.startsWith('http')) {
      return avatar;
    }

    // Si ya tiene el prefijo avatares/
    if (avatar.startsWith('avatares/')) {
      return `${BASE}/${avatar}`;
    }

    // Fallback: asumir que es un archivo local
    return `${BASE}/avatares/${avatar}`;
  }

  hasAvatar(): boolean {
    return !!this.getUserAvatar();
  }

  getAvatarPath(filename: string): string {
    return `${BASE}/avatares/${filename}`;
  }

  private avatarErrorFlag = false;

  onAvatarError(event: any) {
    if (this.avatarErrorFlag) {
      event.target.src = '';
      return;
    }
    this.avatarErrorFlag = true;
    console.error('Error cargando avatar:', event.target.src);
    event.target.src = `${BASE}/avatares/01.webp`;
  }

  toggleEnlargedAvatar() {
    this.showEnlargedAvatar = !this.showEnlargedAvatar;
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
      // Limpiar TODO el estado del chat proactivamente antes de salir
      this.chatStateService.clearAllChatState();
      
      // Detener audio y desconectar socket al salir
      this.audioService.stopAll();
      this.socketService.disconnect();
      
      await this.authService.logout();
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
