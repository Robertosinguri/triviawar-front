/**
 * Tipos del panel de resultados de la encuesta.
 * Reflejan exactamente lo que devuelve `GET /encuesta/estadisticas` del backend.
 */

/** Una fila de la sábana: una respuesta tal como quedó guardada. */
export interface FilaEncuesta {
  id: string;
  fecha: string | null;
  actualizadoEn: string | null;
  estado: string;
  /** Versión del cuestionario con la que se relevó esta respuesta. */
  versionCuestionario: string | null;
  respuestas: Record<string, string>;
  comentario: string;
  email: string | null;
  emailVerificado: boolean;
  nombre: string | null;
  dispositivo: {
    so: string | null;
    navegador: string | null;
    pwaInstalada: boolean;
  };
  /** Contexto técnico de la captura: también es parte del origen del dato. */
  contexto: {
    zonaHoraria: string | null;
    idioma: string | null;
    plataforma: string | null;
    abrioEn: string | null;
  };
  intentosDeCambio: number;
  /**
   * Si esta respuesta es de alguien que ya había respondido (misma cuenta o mismo
   * correo), acá está el id de la respuesta que sí cuenta. La fila se conserva
   * como evidencia, pero queda fuera de la muestra válida.
   */
  duplicadoDe: string | null;
  sospechosa: boolean;
  senalesDeRiesgo: string[];
}

/** Panel completo: ficha técnica, distribuciones, contexto y sábana. */
export interface PanelEstadisticas {
  generadoEn: string;
  /**
   * Zona horaria de referencia del estudio (ej. `America/Argentina/Buenos_Aires`).
   * El backend agrupa los días del panel con este criterio: el front la usa para
   * mostrar las horas igual (y no con la zona del navegador).
   */
  zonaHoraria: string;
  /** Versión del cuestionario vigente al momento del corte. */
  versionCuestionario: string;
  /** Cuántos registros hay de cada versión (para detectar mezclas). */
  versiones: Record<string, number>;
  total: number;
  truncado: boolean;
  estados: {
    completada: number;
    excluida: number;
    aplazada: number;
    /** La misma persona ya había respondido: fuera de la muestra válida. */
    duplicada: number;
    otros: number;
  };
  muestra: {
    /** Encuestas completas: es el denominador de todos los porcentajes. */
    valida: number;
    /** Quedaron fuera por el filtro de exclusión. */
    descartadas: number;
    /** Dijeron "en otro momento" y todavía no volvieron. */
    abandonos: number;
    /** Respuestas descartadas por ser de alguien que ya había respondido. */
    duplicadas: number;
    tasaFinalizacion: number;
  };
  identidad: {
    conCorreoVerificado: number;
    conCorreo: number;
    anonimas: number;
    porcentajeVerificado: number;
  };
  calidad: {
    sospechosas: number;
    conIntentosDeCambio: number;
  };
  dispositivo: {
    movil: number;
    escritorio: number;
    desconocido: number;
    pwaInstalada: number;
    porSo: Record<string, number>;
    porNavegador: Record<string, number>;
  };
  porDia: {
    fecha: string;
    total: number;
    completadas: number;
  }[];
  /** Conteo por valor guardado, para cada pregunta. */
  distribuciones: Record<string, Record<string, number>>;
  listado: FilaEncuesta[];
}

/** Una opción ya calculada, lista para dibujar la barra. */
export interface OpcionContada {
  valor: string;
  cantidad: number;
  porcentaje: number;
}

/** Una pregunta con su distribución resuelta. */
export interface BloquePregunta {
  id: string;
  titulo: string;
  total: number;
  opciones: OpcionContada[];
}
