import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { FirebaseAuthService } from '../auth/firebase-auth.service';
import { PwaInstallService } from '../pwa/pwa-install.service';
import {
  ContextoEncuesta,
  DispositivoEncuesta,
  EstadoEncuesta,
  EstadoLocalEncuesta,
  PayloadEncuesta,
  RespuestaEnvio,
  RespuestasEncuesta
} from './encuesta.model';
import {
  PREGUNTAS,
  SEGUNDOS_MINIMOS_LLENADO,
  TEXTOS,
  esOpcionExcluyente
} from './encuesta-preguntas';

/**
 * Servicio de la encuesta de bienvenida.
 *
 * Responsabilidades:
 * - Decidir si la encuesta debe mostrarse (según localStorage).
 * - Mantener el estado de las respuestas y del envío.
 * - Capturar automáticamente el contexto del dispositivo.
 * - Enviar al backend y vincular la respuesta después del login.
 *
 * Importante: el modal NO bloquea el login. Cualquiera de las salidas deja al
 * usuario en la pantalla de login, listo para autenticarse.
 */
@Injectable({
  providedIn: 'root'
})
export class EncuestaService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(FirebaseAuthService);
  private readonly pwaInstall = inject(PwaInstallService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly API_URL = `${environment.apiUrl}/encuesta`;

  /** Claves de localStorage. */
  private readonly CLAVES = {
    dispositivo: 'tw_encuesta_device_id',
    estado: 'tw_encuesta_estado',
    uidAnonimo: 'tw_encuesta_uid_anonimo',
    pendiente: 'tw_encuesta_pendiente_vinculacion',
    /* Los borradores de respuestas ya no se usan: cada visita arranca en blanco.
       Se conserva la clave para borrar lo que hayan dejado versiones previas. */
    borradorViejo: 'tw_encuesta_borrador'
  } as const;

  // --- Estado expuesto a la vista -------------------------------------------

  /** Si el modal está visible. */
  readonly visible = signal(false);

  /** Pantalla que se está mostrando dentro del modal. */
  readonly estadoVista = signal<'encuesta' | 'gracias'>('encuesta');

  /** Respuestas elegidas, por id de pregunta. */
  readonly respuestas = signal<RespuestasEncuesta>({});

  /** Texto libre del final. */
  readonly comentario = signal('');

  /** Campo trampa: está oculto, un humano nunca lo llena. */
  readonly honeypot = signal('');

  readonly enviando = signal(false);
  readonly errorEnvio = signal('');
  readonly intentosDeEnvio = signal(0);
  readonly uidAnonimo = signal<string | null>(null);

  // --- Derivados -------------------------------------------------------------

  /** ¿El usuario eligió la opción que corta la encuesta? */
  readonly excluido = computed(() => {
    const respuesta = this.respuestas()['nivelEducativo'];
    if (typeof respuesta !== 'string') return false;
    return esOpcionExcluyente('nivelEducativo', respuesta);
  });

  /** Preguntas que corresponde mostrar según el filtro de exclusión. */
  readonly preguntasVisibles = computed(() =>
    this.excluido() ? PREGUNTAS.slice(0, 1) : PREGUNTAS
  );

  /** ¿Están todas las preguntas visibles respondidas? */
  readonly completo = computed(() =>
    this.preguntasVisibles().every((pregunta) => this.estaRespondida(pregunta.id))
  );

  /** Progreso de 0 a 100, para la barra superior. */
  readonly progreso = computed(() => {
    const total = this.preguntasVisibles().length;
    if (total === 0) return 0;
    const respondidas = this.preguntasVisibles().filter((p) => this.estaRespondida(p.id)).length;
    return Math.round((respondidas / total) * 100);
  });

  // --- Estado interno --------------------------------------------------------

  private dispositivoId = '';
  private momentoApertura = '';
  private scrollBloqueado = false;

  private get hayNavegador(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // --- Ciclo de vida ---------------------------------------------------------

  /**
   * Se llama al montar el login. Decide si corresponde abrir la encuesta y
   * crea la sesión anónima (sin pedirle nada al usuario).
   *
   * Cada visita arranca en blanco: no se restauran respuestas de visitas
   * anteriores, para que al recargar el usuario pueda empezar de cero.
   */
  async inicializar(): Promise<void> {
    if (!this.hayNavegador) return;

    this.dispositivoId = this.obtenerDispositivoId();

    // Borra los borradores que hayan guardado versiones anteriores de la app.
    this.borrar(this.CLAVES.borradorViejo);

    if (!this.debeMostrarse()) {
      console.log('📋 Encuesta: ya fue respondida, no se vuelve a ofrecer');
      return;
    }

    this.limpiarRespuestasLocales();

    // La sesión anónima no es obligatoria: si falla, seguimos con el deviceId.
    this.uidAnonimo.set(await this.authService.iniciarSesionAnonima());

    if (!this.momentoApertura) {
      this.momentoApertura = new Date().toISOString();
    }

    this.visible.set(true);
    this.bloquearScroll(true);

    console.log(`📋 Encuesta: abierta | dispositivo=${this.dispositivoId} | anónimo=${this.uidAnonimo() ?? 'no'}`);
  }

  // --- Interacción -----------------------------------------------------------

  /** ¿La opción está elegida? */
  estaSeleccionada(preguntaId: string, valor: string): boolean {
    return this.respuestas()[preguntaId] === valor;
  }

  /**
   * Marca la opción elegida. Cada pregunta admite UNA sola respuesta: elegir otra
   * opción reemplaza la anterior (no se acumula, no se desmarca).
   */
  seleccionar(preguntaId: string, valor: string): void {
    this.errorEnvio.set('');
    this.respuestas.update((previas) => ({ ...previas, [preguntaId]: valor }));
  }

  actualizarComentario(valor: string): void {
    this.comentario.set(valor);
  }

  // --- Salidas ---------------------------------------------------------------

  /**
   * "En otro momento": cierra el modal en ese instante, sin confirmación.
   *
   * A propósito NO se guarda como respondida ni se guarda ningún plazo: la
   * encuesta se vuelve a ofrecer apenas el usuario recargue la página o
   * reingrese al login, mientras no la haya contestado.
   *
   * Al backend sí se le avisa, así queda registrado que este dispositivo la
   * postergó (y cuántas veces).
   */
  posponer(): void {
    // Queda anotado para que, si después se loguea, su cuenta se vincule a esta
    // respuesta y sepamos quién dejó la encuesta para más tarde.
    this.marcarPendienteDeVinculacion();
    this.cerrar();

    // Se avisa al backend sin bloquear la interfaz: si falla, no le importa al usuario.
    void this.enviarAlBackend('aplazada', true);
  }

  /** Cierra el modal (después del agradecimiento, del aplazo o al desmontar). */
  cerrar(): void {
    this.visible.set(false);
    this.bloquearScroll(false);
  }

  /** Envía la respuesta al backend. */
  async enviar(): Promise<void> {
    if (!this.completo() || this.enviando()) {
      this.errorEnvio.set(this.completo() ? '' : TEXTOS.validacionIncompleta);
      return;
    }

    const estado: EstadoEncuesta = this.excluido() ? 'excluida' : 'completada';
    const ok = await this.enviarAlBackend(estado, false);

    if (ok) {
      this.guardarEstadoLocal(estado);
      this.marcarPendienteDeVinculacion();
      this.limpiarRespuestasLocales();
      this.estadoVista.set('gracias');
    }
  }

  // --- Vinculación con la cuenta (se llama después del login) ----------------

  /**
   * Si el usuario respondió la encuesta antes de loguearse, ahora se enriquece
   * esa respuesta con su correo verificado, su nombre y su uid real.
   * Se puede llamar sin problema aunque no haya encuesta: no hace nada.
   */
  async vincularConLaCuenta(): Promise<void> {
    if (!this.hayNavegador) return;

    const dispositivoId = this.dispositivoId || this.leer(this.CLAVES.dispositivo);
    const uidAnonimo = this.leer(this.CLAVES.uidAnonimo);
    const huboEncuesta = this.leer(this.CLAVES.pendiente) === 'true';

    if (!huboEncuesta && !uidAnonimo) return;

    // Sólo se vincula con una cuenta real (Google). Una sesión anónima no
    // aporta ningún dato nuevo y además confundiría el uid guardado.
    if (this.authService.esSesionAnonima()) return;

    const idToken = await this.authService.obtenerIdToken();
    if (!idToken) return;

    try {
      const respuesta = await firstValueFrom(
        this.http.post<RespuestaEnvio>(`${this.API_URL}/vincular`, {
          deviceId: dispositivoId,
          uidAnonimo,
          idToken
        })
      );

      console.log('🔗 Encuesta vinculada con la cuenta:', respuesta);

      // Si se vinculó (o si no había encuesta que vincular) ya no hay nada pendiente.
      this.borrar(this.CLAVES.pendiente);
    } catch (error) {
      // Se deja la marca para reintentar en el próximo login.
      console.warn('🔗 No se pudo vincular la encuesta, se reintentará en el próximo login:', error);
    }
  }

  // --- Envío -----------------------------------------------------------------

  private async enviarAlBackend(estado: EstadoEncuesta, silencioso: boolean): Promise<boolean> {
    if (!this.hayNavegador) return false;

    if (!silencioso) {
      this.enviando.set(true);
      this.errorEnvio.set('');
    }

    this.intentosDeEnvio.update((n) => n + 1);

    const payload: PayloadEncuesta = {
      estado,
      deviceId: this.dispositivoId || this.obtenerDispositivoId(),
      uidAnonimo: this.uidAnonimo(),
      idToken: await this.authService.obtenerIdToken(),
      respuestas: estado === 'aplazada' ? {} : this.respuestas(),
      comentario: estado === 'completada' ? this.comentario() : '',
      dispositivo: this.capturarDispositivo(),
      contexto: this.capturarContexto(),
      tiempoDeLlenadoSeg: this.segundosTranscurridos(),
      intentosDeEnvio: this.intentosDeEnvio(),
      abrioEn: this.momentoApertura,
      honeypot: this.honeypot()
    };

    try {
      const respuesta = await firstValueFrom(
        this.http.post<RespuestaEnvio>(`${this.API_URL}/submit`, payload)
      );

      if (!respuesta?.success) {
        throw new Error(respuesta?.error || 'El servidor rechazó la respuesta');
      }

      console.log(`📋 Encuesta enviada (${estado}) -> id=${respuesta.id} duplicada=${respuesta.duplicada}`);
      return true;

    } catch (error) {
      console.error('❌ Error al enviar la encuesta:', error);

      if (!silencioso) {
        this.errorEnvio.set(TEXTOS.errorEnvio);
      }
      return false;

    } finally {
      if (!silencioso) this.enviando.set(false);
    }
  }

  // --- Persistencia local ----------------------------------------------------

  private obtenerDispositivoId(): string {
    const guardado = this.leer(this.CLAVES.dispositivo);
    if (guardado) return guardado;

    const nuevo = this.generarId();
    this.escribir(this.CLAVES.dispositivo, nuevo);
    return nuevo;
  }

  private generarId(): string {
    const cripto = globalThis.crypto as Crypto | undefined;
    if (cripto?.randomUUID) return cripto.randomUUID();
    return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /**
   * ¿Corresponde ofrecer la encuesta?
   *
   * Sí, siempre, mientras el usuario no la haya respondido. Lo único que la
   * silencia es haberla completado (o haber caído en el filtro de exclusión,
   * que también se guarda como respondida).
   *
   * Ojo: "En otro momento" NO se guarda acá. Esa salida sólo cierra el modal
   * en ese instante, así que al recargar la página o volver al login la
   * encuesta se ofrece otra vez.
   */
  private debeMostrarse(): boolean {
    const guardado = this.leerEstadoLocal();
    if (!guardado) return true;

    // Ya la completó o quedó excluido: no se le vuelve a mostrar nunca.
    return guardado.estado !== 'completada' && guardado.estado !== 'excluida';
  }

  private guardarEstadoLocal(estado: EstadoEncuesta): void {
    const datos: EstadoLocalEncuesta = { estado, fecha: new Date().toISOString() };
    this.escribir(this.CLAVES.estado, JSON.stringify(datos));
  }

  private leerEstadoLocal(): EstadoLocalEncuesta | null {
    const crudo = this.leer(this.CLAVES.estado);
    if (!crudo) return null;

    try {
      const datos = JSON.parse(crudo) as EstadoLocalEncuesta;
      return datos?.estado ? datos : null;
    } catch {
      return null;
    }
  }

  /** Deja el formulario en blanco (sin tocar lo que ya se haya enviado). */
  private limpiarRespuestasLocales(): void {
    this.respuestas.set({});
    this.comentario.set('');
    this.honeypot.set('');
    this.errorEnvio.set('');
  }

  private marcarPendienteDeVinculacion(): void {
    if (this.uidAnonimo()) {
      this.escribir(this.CLAVES.uidAnonimo, this.uidAnonimo() as string);
    }
    this.escribir(this.CLAVES.pendiente, 'true');
  }

  // --- Captura de contexto ---------------------------------------------------

  private capturarDispositivo(): DispositivoEncuesta {
    const userAgent = navigator.userAgent || '';
    const ua = userAgent;

    let so = 'Desconocido';
    if (/android/i.test(ua)) so = 'Android';
    else if (/iphone|ipod/i.test(ua)) so = 'iOS';
    else if (/ipad/i.test(ua)) so = 'iPadOS';
    else if (/windows/i.test(ua)) so = 'Windows';
    else if (/mac os x|macintosh/i.test(ua)) so = 'macOS';
    else if (/cros/i.test(ua)) so = 'ChromeOS';
    else if (/linux|x11/i.test(ua)) so = 'Linux';

    let navegador = 'Desconocido';
    if (/edg\//i.test(ua)) navegador = 'Edge';
    else if (/opr\/|opera/i.test(ua)) navegador = 'Opera';
    else if (/samsungbrowser/i.test(ua)) navegador = 'Samsung Internet';
    else if (/firefox|fxios/i.test(ua)) navegador = 'Firefox';
    else if (/chrome|crios/i.test(ua)) navegador = 'Chrome';
    else if (/safari/i.test(ua)) navegador = 'Safari';

    return {
      so,
      navegador,
      pwaInstalada: this.pwaInstall.isInstalled(),
      pantalla: `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
      userAgent
    };
  }

  private capturarContexto(): ContextoEncuesta {
    const nav = navigator as unknown as { userAgentData?: { platform?: string }; platform?: string };

    return {
      zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      idioma: navigator.language || '',
      plataforma: nav.userAgentData?.platform || nav.platform || '',
      abrioEn: this.momentoApertura
    };
  }

  private segundosTranscurridos(): number {
    if (!this.momentoApertura) return 0;
    const inicio = new Date(this.momentoApertura).getTime();
    if (!Number.isFinite(inicio)) return 0;
    return Math.round((Date.now() - inicio) / 1000);
  }

  /** Expuesto para que el componente pueda avisar de respuestas sospechosas. */
  esDemasiadoRapido(): boolean {
    return this.segundosTranscurridos() < SEGUNDOS_MINIMOS_LLENADO;
  }

  // --- Bloqueo de scroll -----------------------------------------------------

  private bloquearScroll(bloquear: boolean): void {
    if (!this.hayNavegador || this.scrollBloqueado === bloquear) return;

    document.body.style.overflow = bloquear ? 'hidden' : '';
    this.scrollBloqueado = bloquear;
  }

  // --- Helpers de localStorage ----------------------------------------------

  private estaRespondida(preguntaId: string): boolean {
    const valor = this.respuestas()[preguntaId];
    return typeof valor === 'string' && valor.trim().length > 0;
  }

  private leer(clave: string): string | null {
    if (!this.hayNavegador) return null;
    try {
      return localStorage.getItem(clave);
    } catch {
      return null;
    }
  }

  private escribir(clave: string, valor: string): void {
    if (!this.hayNavegador) return;
    try {
      localStorage.setItem(clave, valor);
    } catch {
      // Modo incógnito o almacenamiento lleno: se ignora, no es crítico.
    }
  }

  private borrar(clave: string): void {
    if (!this.hayNavegador) return;
    try {
      localStorage.removeItem(clave);
    } catch {
      // Ignorado a propósito.
    }
  }
}
