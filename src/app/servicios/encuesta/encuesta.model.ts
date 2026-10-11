/**
 * Modelos de la encuesta de bienvenida.
 * Los tipos de acá son el contrato con el backend: si algo cambia de un lado,
 * tiene que cambiar del otro.
 */

/** Estados posibles de una respuesta. */
export type EstadoEncuesta = 'completada' | 'excluida' | 'aplazada';

/** Una opción de respuesta. `excluye` marca la opción que corta la encuesta. */
export interface OpcionEncuesta {
  valor: string;
  excluye?: boolean;
}

/** Una pregunta de la encuesta. Cada pregunta admite UNA sola respuesta. */
export interface PreguntaEncuesta {
  /** Clave con la que se guarda en el backend. No cambiar sin actualizar el back. */
  id: string;
  titulo: string;
  opciones: OpcionEncuesta[];
  /** Aclaración opcional debajo del enunciado. */
  ayuda?: string;
}

/**
 * Respuestas: una sola opción (texto) por pregunta.
 *
 * A propósito NO se admite una lista: cada respuesta tiene que ser un dato
 * exclusivo para que los resultados se puedan contar sin ambigüedad.
 */
export type RespuestasEncuesta = Record<string, string>;

/** Datos del dispositivo, capturados automáticamente. */
export interface DispositivoEncuesta {
  so: string;
  navegador: string;
  pwaInstalada: boolean;
  pantalla: string;
  userAgent: string;
}

/** Contexto del usuario, capturado automáticamente. */
export interface ContextoEncuesta {
  zonaHoraria: string;
  idioma: string;
  plataforma: string;
  abrioEn: string;
}

/** Lo que se envía al backend. */
export interface PayloadEncuesta {
  estado: EstadoEncuesta;
  deviceId: string;
  uidAnonimo: string | null;
  idToken: string | null;
  respuestas: RespuestasEncuesta;
  comentario: string;
  dispositivo: DispositivoEncuesta;
  contexto: ContextoEncuesta;
  tiempoDeLlenadoSeg: number;
  intentosDeEnvio: number;
  abrioEn: string;
  /** Campo trampa: si viene con contenido, es un bot. */
  honeypot: string;
}

/** Respuesta del backend. */
export interface RespuestaEnvio {
  success: boolean;
  id?: string;
  estado?: EstadoEncuesta;
  duplicada?: boolean;
  /** Respuesta que sí cuenta, cuando esta quedó marcada como duplicada. */
  duplicadoDe?: string | null;
  error?: string;
  vinculada?: boolean;
}

/** Lo que se guarda en localStorage para decidir si la encuesta se vuelve a mostrar. */
export interface EstadoLocalEncuesta {
  estado: EstadoEncuesta;
  fecha: string;
}
