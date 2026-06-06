import { Injectable, Inject, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  /** ¿La app ya está instalada? */
  isInstalled = signal(false);

  /** ¿El navegador soporta beforeinstallprompt? (Chrome/Edge/Android) */
  canInstall = signal(false);

  /** ¿Es iOS Safari? */
  isIOS = signal(false);

  private deferredPrompt: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private init(): void {
    console.log('📲 PWA Service iniciado');

    // Detectar si ya está instalada
    const installed = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    this.isInstalled.set(installed);

    // Detectar iOS
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent)
      && /Safari/.test(navigator.userAgent)
      && !/Chrome/.test(navigator.userAgent);
    this.isIOS.set(ios);

    // Recuperar evento capturado en main.ts (antes de que Angular iniciara)
    const globalPrompt = (window as any).__pwaDeferredPrompt;
    if (globalPrompt) {
      this.deferredPrompt = globalPrompt;
      this.canInstall.set(true);
      console.log('📲 PWA: Instalación disponible (recuperado de main.ts)');
    }

    // Capturar beforeinstallprompt (por si llega después de que Angular inició)
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      // Si ya tenemos uno guardado, usar el nuevo
      this.deferredPrompt = e;
      this.canInstall.set(true);
      console.log('📲 PWA: Instalación disponible');
    });

    window.addEventListener('appinstalled', () => {
      console.log('📲 PWA: App instalada');
      this.deferredPrompt = null;
      this.canInstall.set(false);
      this.isInstalled.set(true);
    });
  }

  async install(): Promise<string> {
    if (this.isInstalled()) {
      return '✅ La aplicación ya está instalada exitosamente.';
    }

    if (this.isIOS()) {
      return '📱 En iOS (iPhone/iPad): Toca el botón de compartir y selecciona "Agregar a pantalla de inicio".';
    }

    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const result = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      this.canInstall.set(false);
      return result.outcome === 'accepted'
        ? '✅ ¡Instalación completada exitosamente!'
        : 'Instalación cancelada por el usuario.';
    }

    return '📲 Disponible para Google Chrome o Microsoft Edge (requiere conexión segura/HTTPS en producción).';
  }
}

