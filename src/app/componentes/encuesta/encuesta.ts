import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  effect,
  inject
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { EncuestaService } from '../../servicios/encuesta/encuesta.service';
import { PREGUNTA_COMENTARIO, TEXTOS } from '../../servicios/encuesta/encuesta-preguntas';

/**
 * Encuesta de bienvenida: modal que se antepone a todo sobre el login.
 *
 * Reglas de salida (no hay forma de escaparse por otro lado):
 * - Se cierra con "En otro momento" (salida inmediata: vuelve a ofrecerse en la
 *   próxima recarga, porque no se guarda ningún plazo).
 * - Se cierra sola ~2 segundos después de enviar (pantalla de agradecimiento).
 * - Se cierra sola si el usuario queda excluido por el filtro.
 * - NO se cierra con ESC, ni con click afuera, ni con el botón "atrás" de Android.
 */
@Component({
  selector: 'app-encuesta',
  imports: [],
  templateUrl: './encuesta.html',
  styleUrl: './encuesta.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Encuesta implements OnInit, OnDestroy {
  protected readonly encuesta = inject(EncuestaService);
  protected readonly textos = TEXTOS;
  protected readonly preguntaComentario = PREGUNTA_COMENTARIO;

  private readonly platformId = inject(PLATFORM_ID);

  /** Milisegundos que se ve la pantalla de agradecimiento antes de cerrarse. */
  private readonly MS_ANTES_DE_CERRAR = 2400;

  private temporizadorCierre?: ReturnType<typeof setTimeout>;
  private trampaAtrasActiva = false;
  private escuchaPopState?: () => void;

  constructor() {
    // Trampa del botón "atrás" de Android: mientras el modal está abierto se
    // empuja un estado al historial; si el usuario aprieta atrás, se vuelve a
    // empujar para que no pueda salir del modal por esa vía.
    effect(() => {
      if (this.encuesta.visible()) {
        this.activarTrampaAtras();
      } else {
        this.desactivarTrampaAtras();
      }
    });

    // Al llegar al agradecimiento, el modal se cierra solo.
    effect(() => {
      if (this.encuesta.estadoVista() === 'gracias') {
        this.temporizadorCierre = setTimeout(() => this.encuesta.cerrar(), this.MS_ANTES_DE_CERRAR);
      }
    });
  }

  ngOnInit(): void {
    void this.encuesta.inicializar();
  }

  ngOnDestroy(): void {
    if (this.temporizadorCierre) clearTimeout(this.temporizadorCierre);
    this.desactivarTrampaAtras();
  }

  // --- Interacción -----------------------------------------------------------

  protected esSeleccionada(preguntaId: string, valor: string): boolean {
    return this.encuesta.estaSeleccionada(preguntaId, valor);
  }

  protected seleccionar(preguntaId: string, valor: string): void {
    this.encuesta.seleccionar(preguntaId, valor);
  }

  protected onComentario(evento: Event): void {
    const valor = (evento.target as HTMLTextAreaElement).value;
    this.encuesta.actualizarComentario(valor.slice(0, this.preguntaComentario.maximoCaracteres));
  }

  protected onHoneypot(evento: Event): void {
    this.encuesta.honeypot.set((evento.target as HTMLInputElement).value);
  }

  protected enviar(): void {
    void this.encuesta.enviar();
  }

  /** "En otro momento": cierra sin confirmación y vuelve en 7 días. */
  protected posponer(): void {
    this.encuesta.posponer();
  }

  protected cerrarGracias(): void {
    if (this.temporizadorCierre) clearTimeout(this.temporizadorCierre);
    this.encuesta.cerrar();
  }

  // --- Trampa del botón atrás ------------------------------------------------

  private activarTrampaAtras(): void {
    if (this.trampaAtrasActiva || !isPlatformBrowser(this.platformId)) return;

    this.trampaAtrasActiva = true;
    history.pushState({ encuestaAbierta: true }, '');

    this.escuchaPopState = () => {
      // Volvió a apretar atrás: se empuja de nuevo para que siga dentro.
      history.pushState({ encuestaAbierta: true }, '');
    };

    window.addEventListener('popstate', this.escuchaPopState);
  }

  private desactivarTrampaAtras(): void {
    if (!this.trampaAtrasActiva || !isPlatformBrowser(this.platformId)) return;

    this.trampaAtrasActiva = false;

    if (this.escuchaPopState) {
      window.removeEventListener('popstate', this.escuchaPopState);
      this.escuchaPopState = undefined;
    }

    // Nota: a propósito NO se llama a history.back(). La entrada extra que se
    // empujó apunta a la misma URL, así que si el usuario aprieta atrás después
    // de cerrar el modal, simplemente se queda en el login.
  }
}
