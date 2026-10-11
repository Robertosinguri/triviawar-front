import { PreguntaEncuesta } from './encuesta.model';

/**
 * ⚙️ ACÁ SE EDITA LA ENCUESTA.
 *
 * Todo el contenido vive en este archivo: para cambiar un texto, agregar o
 * quitar una opción, o agregar una pregunta nueva, se toca únicamente esto.
 * La lógica del componente y del servicio NO necesita cambios.
 *
 * Reglas:
 * - `id`: clave con la que se guarda la respuesta. Si se cambia, hay que
 *   actualizar la lista de respuestas esperadas en el backend
 *   (`src/controllers/encuestaController.js`).
 * - TODAS las preguntas son de UNA sola opción. Cada respuesta es un dato
 *   exclusivo: así los resultados se cuentan sin ambigüedad (los porcentajes
 *   suman 100). El backend rechaza cualquier envío con más de una opción.
 * - La pregunta se redacta EN FUNCIÓN de las opciones: cada opción tiene que ser
 *   una respuesta directa al enunciado, y las opciones no pueden solaparse.
 * - `excluye: true` → al elegirla se corta la encuesta (filtro de exclusión)
 *   y las preguntas siguientes se ocultan.
 */

export const PREGUNTAS: PreguntaEncuesta[] = [
  {
    id: 'nivelEducativo',
    titulo: '¿Cuál es tu nivel educativo más alto?',
    opciones: [
      { valor: 'Secundario (en curso o completo)' },
      { valor: 'Terciario / Universitario (en curso o completo)' },
      { valor: 'Capacitaciones o estudio autodidacta frecuente' },
      { valor: 'Ninguno de los anteriores', excluye: true }
    ]
  },
  {
    id: 'experienciaTradicional',
    titulo: '¿Cómo te resulta estudiar con métodos tradicionales (libros, PDFs, apuntes)?',
    opciones: [
      { valor: 'Me resulta un proceso tedioso, solitario y me cuesta mantener la concentración.' },
      { valor: 'Siento que leo o repaso mucho, pero me falta feedback constante para saber si realmente lo entendí.' },
      { valor: 'Me da mucha pereza tener que armar mis propios resúmenes o cuestionarios de práctica.' },
      { valor: 'Disfruto y me siento cómodo con la lectura tradicional (libros, ensayos, estudio autónomo clásico).' }
    ]
  },
  {
    id: 'comoAprende',
    titulo: '¿Cuál es tu forma habitual de aprender o repasar?',
    opciones: [
      { valor: 'Leo textos, apuntes, PDFs o libros de forma solitaria.' },
      { valor: 'Busco videos explicativos largos en YouTube.' },
      { valor: 'Intento debatir o repasar con otras personas (por chat o en juntadas).' },
      { valor: 'Uso aplicaciones de preguntas/respuestas o juegos educativos.' }
    ]
  },
  {
    id: 'sumariaLaApp',
    titulo: 'Si existiera una app para aprender y repasar compitiendo en trivias con tus amigos (con preguntas de IA), ¿la sumarías a tus aplicaciones?',
    opciones: [
      { valor: 'Sí, totalmente (me divierte aprender jugando y compitiendo con otros).' },
      { valor: 'Tal vez (depende de los temas o materias disponibles).' },
      { valor: 'No (prefiero otros métodos de lectura o entretenimiento).' }
    ]
  }
];

/** La caja de comentarios, que va al final y es opcional. */
export const PREGUNTA_COMENTARIO = {
  id: 'comentario',
  titulo: '¿Qué te frustra o te divierte cuando aprendés algo nuevo?',
  ayuda: 'Opcional',
  maximoCaracteres: 500
};

/** Todos los textos de la interfaz. */
export const TEXTOS = {
  titulo: 'Queremos conocerte',
  subtitulo: 'Son 4 preguntas rápidas, no te va a llevar más de un minuto. Nos ayudás un montón a construir TriviaWar.',
  botonEnviar: 'Enviar respuestas',
  botonEnPosponer: 'En otro momento',
  botonReintentar: 'Reintentar',
  botonListo: 'Listo',
  validacionIncompleta: 'Respondé todas las preguntas para enviar tus respuestas.',
  agradecimientoTitulo: '¡Gracias!',
  agradecimientoTexto: 'Tu respuesta quedó registrada. Nos ayuda un montón a seguir construyendo TriviaWar.',
  errorEnvio: 'No pudimos guardar tu respuesta. Revisá tu conexión y volvé a intentarlo: no se borró nada de lo que respondiste.'
};

/** Segundos mínimos de llenado antes de que la encuesta esté lista. */
export const SEGUNDOS_MINIMOS_LLENADO = 8;

/*
  ¿CUÁNDO SE VUELVE A MOSTRAR LA ENCUESTA?
  ----------------------------------------
  "En otro momento" sólo la cierra en ese instante: no guarda ningún plazo.

  Mientras el usuario NO la haya completado, la encuesta se vuelve a ofrecer
  cada vez que recarga la página o reingresa al login. Es una oferta activa a
  propósito. La única forma de que no vuelva a aparecer es responderla (o caer
  en el filtro de exclusión, que también cuenta como respondida).
*/

/** Devuelve true si la opción elegida corta la encuesta (filtro de exclusión). */
export const esOpcionExcluyente = (preguntaId: string, valor: string): boolean => {
  const pregunta = PREGUNTAS.find((p) => p.id === preguntaId);
  return Boolean(pregunta?.opciones.find((o) => o.valor === valor && o.excluye));
};

/** Preguntas que corresponden según si el usuario fue excluido o no. */
export const preguntasVisibles = (excluido: boolean): PreguntaEncuesta[] =>
  excluido ? PREGUNTAS.slice(0, 1) : PREGUNTAS;
