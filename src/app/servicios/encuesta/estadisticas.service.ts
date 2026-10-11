import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { PanelEstadisticas } from './estadisticas.model';

/**
 * Servicio del panel de resultados de la encuesta.
 *
 * La clave de acceso NO vive en el código: la escribe la persona una vez, el
 * backend la valida (header `x-clave-acceso`) y recién ahí se guarda en el
 * navegador para no tener que tipearla de nuevo. Si el backend responde 401,
 * la clave guardada se descarta y vuelve a aparecer la pantalla de acceso.
 */
@Injectable({
  providedIn: 'root'
})
export class EstadisticasService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly API_URL = `${environment.apiUrl}/encuesta/estadisticas`;
  private readonly CLAVE_LOCAL = 'tw_panel_clave';

  // --- Estado expuesto a la vista -------------------------------------------

  readonly datos = signal<PanelEstadisticas | null>(null);
  readonly cargando = signal(false);
  readonly error = signal('');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Si ya había una clave guardada, se intenta entrar directo.
      const guardada = this.leerClave();
      if (guardada) {
        void this.cargar(guardada);
      }
    }
  }

  /**
   * Pide el panel al backend.
   * La clave sólo se guarda cuando el backend la aceptó.
   */
  async cargar(clave?: string): Promise<boolean> {
    const claveAUsar = (clave ?? this.leerClave()).trim();

    if (!claveAUsar) {
      this.error.set('Ingresá la clave de acceso.');
      return false;
    }

    this.cargando.set(true);
    this.error.set('');

    try {
      const respuesta = await firstValueFrom(
        this.http.get<PanelEstadisticas>(this.API_URL, {
          headers: { 'x-clave-acceso': claveAUsar }
        })
      );

      this.guardarClave(claveAUsar);
      this.datos.set(respuesta);
      return true;

    } catch (error) {
      const estado = (error as { status?: number })?.status;

      if (estado === 401) {
        this.error.set('La clave no es correcta.');
        this.borrarClave();
      } else if (estado === 429) {
        this.error.set('Demasiados intentos fallidos. Esperá unos minutos y volvé a probar.');
      } else if (estado === 503) {
        this.error.set('El panel no está configurado en el servidor.');
      } else {
        this.error.set('No se pudieron cargar las estadísticas. Reintentá.');
      }

      return false;

    } finally {
      this.cargando.set(false);
    }
  }

  /** Cierra la sesión del panel en este navegador. */
  salir(): void {
    this.borrarClave();
    this.datos.set(null);
    this.error.set('');
  }

  // --- Clave ----------------------------------------------------------------

  private leerClave(): string {
    if (!isPlatformBrowser(this.platformId)) return '';
    try {
      return localStorage.getItem(this.CLAVE_LOCAL) || '';
    } catch {
      return '';
    }
  }

  private guardarClave(clave: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.CLAVE_LOCAL, clave);
    } catch {
      // Si el navegador bloquea localStorage, la clave simplemente no se recuerda.
    }
  }

  private borrarClave(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.removeItem(this.CLAVE_LOCAL);
    } catch {
      // Nada que hacer: no había clave guardada.
    }
  }
}
