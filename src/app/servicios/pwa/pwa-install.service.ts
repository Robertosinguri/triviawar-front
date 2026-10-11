import { Injectable, Inject, PLATFORM_ID, computed, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

/**
 * Evento no estándar que emiten los navegadores basados en Chromium
 * (Chrome/Edge en Android, escritorio y Samsung Internet) para ofrecer
 * la instalación nativa de una PWA.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

type Plataforma = 'ios' | 'android' | 'desktop' | 'desconocida';

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  /** ¿La app se está ejecutando ya instalada (modo standalone)? */
  readonly isInstalled = signal(false);

  /** ¿El navegador ofreció el prompt nativo de instalación? */
  readonly canInstall = signal(false);

  /** ¿Es un dispositivo Apple real (iOS/iPadOS)? */
  readonly isIOS = signal(false);

  /** ¿Es Android? */
  readonly isAndroid = signal(false);

  /** ¿Estamos dentro del navegador embebido de otra app (Instagram, Facebook, WhatsApp...)? */
  readonly isInAppBrowser = signal(false);

  /**
   * ¿Es Firefox? Es importante porque Firefox NO implementa `beforeinstallprompt`
   * en ninguna plataforma (ni Android ni escritorio): la instalación de una PWA
   * sólo se puede hacer desde su propio menú.
   */
  readonly isFirefox = signal(false);

  /**
   * ¿Conviene ofrecer el botón "Abrir en Chrome"?
   *
   * Firefox en Android no puede disparar el instalador, pero Chrome sí. Con el
   * esquema `intent://` se puede saltar de Firefox a Chrome y ahí el usuario sí
   * obtiene la instalación de un clic (WebAPK real).
   */
  readonly puedeAbrirEnChrome = computed(() => this.isAndroid() && this.isFirefox());

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private standaloneQuery: MediaQueryList | null = null;

  constructor(@Inject(PLATFORM_ID) private readonly platformId: object) {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  // ---------------------------------------------------------------------------
  // Inicialización
  // ---------------------------------------------------------------------------

  private init(): void {
    console.log('📲 PWA Service iniciado');

    this.isInstalled.set(this.detectarInstalada());

    const plataforma = this.detectarPlataforma();
    this.isIOS.set(plataforma === 'ios');
    this.isAndroid.set(plataforma === 'android');
    this.isInAppBrowser.set(this.detectarNavegadorEmbebido());
    // En iOS la instalación es por el menú de compartir, así que ahí no aplica el aviso de Firefox.
    this.isFirefox.set(plataforma !== 'ios' && /firefox|fxios/i.test(this.userAgent));

    console.log(
      `📲 PWA: plataforma=${plataforma} | firefox=${this.isFirefox()} | navegador embebido=${this.isInAppBrowser()}`
    );
    console.log('📲 PWA: userAgent =', this.userAgent);

    // Diagnóstico: ¿el navegador implementa la API para instalar con un clic?
    // En Firefox (Gecko) SIEMPRE es false, en cualquier plataforma.
    const soportaPromptNativo = 'onbeforeinstallprompt' in window;
    console.log(
      `📲 PWA: ¿soporta instalación con un clic (beforeinstallprompt)? = ${soportaPromptNativo}`
    );
    if (!soportaPromptNativo) {
      console.log(
        '📲 PWA: este navegador sólo permite instalar desde su propio menú (Firefox, Safari/iOS o navegadores embebidos).'
      );
    }

    // Recuperar el evento capturado en main.ts (antes de que Angular iniciara)
    const earlyPrompt = (globalThis as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent })
      .__pwaDeferredPrompt;
    if (earlyPrompt) {
      this.guardarPrompt(earlyPrompt);
    }

    // Capturar beforeinstallprompt por si llega después de que Angular inició
    window.addEventListener('beforeinstallprompt', (event: Event) => {
      event.preventDefault();
      this.guardarPrompt(event as BeforeInstallPromptEvent);
    });

    window.addEventListener('appinstalled', () => {
      console.log('📲 PWA: App instalada');
      this.limpiarPrompt();
      this.isInstalled.set(true);
    });

    // Si el usuario abre la instalación (o la app pasa a standalone) sin evento appinstalled
    this.standaloneQuery = window.matchMedia('(display-mode: standalone)');
    this.standaloneQuery.addEventListener?.('change', (event: MediaQueryListEvent) => {
      if (event.matches) {
        this.isInstalled.set(true);
        this.limpiarPrompt();
      }
    });
  }

  private guardarPrompt(evento: BeforeInstallPromptEvent): void {
    this.deferredPrompt = evento;
    this.canInstall.set(true);
    console.log('📲 PWA: instalación nativa disponible');
  }

  private limpiarPrompt(): void {
    this.deferredPrompt = null;
    (globalThis as unknown as { __pwaDeferredPrompt?: BeforeInstallPromptEvent }).__pwaDeferredPrompt = undefined;
    this.canInstall.set(false);
  }

  // ---------------------------------------------------------------------------
  // Detección de plataforma
  // ---------------------------------------------------------------------------

  private get userAgent(): string {
    return navigator.userAgent || '';
  }

  private get plataformaUaData(): string {
    const nav = navigator as unknown as { userAgentData?: { platform?: string } };
    return (nav.userAgentData?.platform || '').toLowerCase();
  }

  private get plataformaNavigator(): string {
    const nav = navigator as unknown as { platform?: string };
    return (nav.platform || '').toLowerCase();
  }

  /**
   * IMPORTANTE: no usar la heurística clásica "contiene Safari y no contiene Chrome"
   * para decidir si es iOS.
   *
   * Varios navegadores de Android (WebView, navegadores embebidos y navegadores
   * stock antiguos) envían "Safari" en el User-Agent. Con esa heurística el
   * dispositivo Android se detectaba como Apple y el botón "Instalar" mostraba el
   * instructivo de iPhone en vez de disparar la instalación nativa.
   */
  private detectarPlataforma(): Plataforma {
    const ua = this.userAgent;
    const uaData = this.plataformaUaData;
    const platform = this.plataformaNavigator;

    const esAndroid = /android/i.test(ua) || uaData.includes('android');

    // iPadOS 13+ se identifica como "Macintosh"; se distingue por pantalla táctil.
    const esMacConTouch =
      (uaData.includes('mac') || platform.includes('mac')) && (navigator.maxTouchPoints || 0) > 1;

    const esApple =
      /iphone|ipad|ipod/i.test(ua) || /iphone|ipad|ipod/i.test(uaData) || esMacConTouch;

    // Nunca clasificar un Android como iOS.
    if (esApple && !esAndroid) return 'ios';
    if (esAndroid) return 'android';
    if (/windows|macintosh|mac os x|cros|linux|x11/i.test(ua) || uaData) return 'desktop';

    return 'desconocida';
  }

  /**
   * Detecta navegadores embebidos (WebViews) donde la instalación de PWAs no está
   * disponible, para avisarle al usuario que abra el sitio en Chrome.
   */
  private detectarNavegadorEmbebido(): boolean {
    const ua = this.userAgent;

    // WebView de Android: el User-Agent incluye "; wv)"
    if (/android/i.test(ua) && /;\s*wv[;)]/i.test(ua)) return true;

    return /(FBAN|FBAV|FB_IAB|Instagram|Line\/|WhatsApp|TikTok|BytedanceWebview|SnapChat|Pinterest|MicroMessenger|GSA\/)/i.test(
      ua
    );
  }

  private detectarInstalada(): boolean {
    if (typeof window.matchMedia !== 'function') return false;

    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const minimalUi = window.matchMedia('(display-mode: minimal-ui)').matches;
    const iosStandalone = (navigator as unknown as { standalone?: boolean }).standalone === true;

    return standalone || minimalUi || iosStandalone;
  }

  // ---------------------------------------------------------------------------
  // Instalación
  // ---------------------------------------------------------------------------

  async install(): Promise<string> {
    if (this.isInstalled()) {
      return '✅ Trivia War ya está instalada en este dispositivo.';
    }

    // 1) Prioridad absoluta: el prompt nativo del navegador (Chrome/Edge/Android).
    if (this.deferredPrompt) {
      try {
        const promptEvent = this.deferredPrompt;
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        this.limpiarPrompt();

        return outcome === 'accepted'
          ? '✅ ¡Listo! La app se está instalando en tu dispositivo.'
          : 'Instalación cancelada. Podés volver a intentarlo desde el menú del navegador.';
      } catch (error) {
        // El prompt puede haber quedado obsoleto: se limpia y se muestran instrucciones.
        console.warn('📲 PWA: el prompt nativo falló, se muestran instrucciones manuales', error);
        this.limpiarPrompt();
      }
    }

    // 2) Navegadores embebidos: no permiten instalar la PWA.
    if (this.isInAppBrowser()) {
      return '⚠️ Estás navegando dentro de otra app (Instagram, Facebook, WhatsApp...). Abrí el enlace en Chrome para poder instalar Trivia War.';
    }

    // 3) Firefox: no implementa beforeinstallprompt en ninguna plataforma, por eso
    //    el botón nunca puede abrir el instalador nativo. La instalación se hace
    //    desde el menú propio del navegador.
    if (this.isFirefox()) {
      return this.isAndroid()
        ? '🦊 Estás en Firefox (Android). Firefox no tiene instalación con un clic: tocá el menú ⋮ y elegí "Install" / "Agregar app a la pantalla de inicio". O usá el botón "Abrir en Chrome" para instalarla como app de verdad.'
        : '🦊 Firefox de escritorio no permite instalar apps web. Abrí Trivia War en Chrome o Edge y elegí "Instalar aplicación".';
    }

    // 4) Instrucciones según la plataforma REAL del dispositivo.
    if (this.isIOS()) {
      return '📱 iPhone/iPad: tocá el botón Compartir (⬆️) y elegí "Agregar a pantalla de inicio".';
    }

    if (this.isAndroid()) {
      return '📱 Android (Chrome): abrí el menú ⋮ y elegí "Instalar aplicación" o "Agregar a pantalla de inicio". Si no aparece, recargá la página una vez.';
    }

    return '💻 Para instalar usá Chrome o Edge: menú del navegador → "Instalar aplicación" (el sitio debe estar en HTTPS).';
  }

  /**
   * Abre el sitio en Chrome desde Firefox (Android).
   *
   * El único puente entre navegadores desde la web es el esquema `intent://` de
   * Android. Si Chrome no está instalado, `browser_fallback_url` hace que el
   * sistema abra la URL normal en el navegador por defecto.
   */
  abrirEnChrome(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const url = `${window.location.origin}${window.location.pathname}${window.location.search}`;

    // Sin `intent://` disponible (escritorio, iOS) se abre una pestaña nueva.
    if (!this.isAndroid()) {
      window.open(url, '_blank', 'noopener');
      return;
    }

    const sinEsquema = url.replace(/^https?:\/\//, '');
    const urlDeRespaldo = encodeURIComponent(url);
    const intentUrl =
      `intent://${sinEsquema}#Intent;scheme=https;package=com.android.chrome;` +
      `S.browser_fallback_url=${urlDeRespaldo};end`;

    console.log('📲 PWA: abriendo en Chrome ->', intentUrl);

    try {
      window.location.href = intentUrl;
    } catch (error) {
      console.warn('📲 PWA: no se pudo abrir el intent de Chrome', error);
      window.open(url, '_blank', 'noopener');
    }
  }
}
