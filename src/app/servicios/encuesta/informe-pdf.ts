import { PREGUNTAS, PREGUNTA_COMENTARIO, SEGUNDOS_MINIMOS_LLENADO } from './encuesta-preguntas';
import { BloquePregunta, FilaEncuesta, OpcionContada, PanelEstadisticas } from './estadisticas.model';

/**
 * Armado del informe en PDF del panel de resultados.
 *
 * El objetivo de este documento no es sólo mostrar los porcentajes: es dejar
 * asentado de dónde sale cada dato. Por eso arranca con la ficha técnica
 * ("origen de los datos") y termina con la sábana de respuestas crudas, que
 * permite auditar cualquier número del informe contra el registro individual.
 *
 * pdfmake se importa de forma diferida: pesa cerca de 2 MB entre motor y
 * tipografías, así que sólo se descarga cuando alguien pide el informe.
 */

/** Nodo del documento pdfmake: es un objeto con la forma que espera la librería. */
type Nodo = object;

interface PdfMakeLike {
  addVirtualFileSystem?: (vfs: unknown) => void;
  vfs?: Record<string, string>;
  createPdf: (definicion: Nodo) => { download: (nombre?: string) => void };
}

/** Pregunta de la que sale la intención de uso. */
const PREGUNTA_INTENCION = 'sumariaLaApp';

/**
 * Datos institucionales que van en la portada.
 *
 * Es lo primero que hay que tocar si cambia el cuatrimestre, el equipo docente,
 * la comisión o los integrantes del grupo.
 */
const INSTITUCION = {
  universidad: 'Universidad de la Ciudad de Buenos Aires',
  materia: 'Taller de Emprendedurismo',
  periodo: '2do Cuatrimestre 2026',
  docentes: ['Cottini, Juan Manuel', 'Foricher, Tomás', 'Moneda, Pedro', 'Rshaid, Bernardo'],
  alumnos: ['Nahuel C.', 'Sánchez B.', 'Carmona A.', 'López O.', 'Fortunesky I.', 'Singuri R.'],
  grupo: 'Grupo 18',
  comision: 'Comisión 2'
} as const;

/** "Grupo 18 – Comisión 2", para usarlo en la portada, el encabezado y el pie. */
const GRUPO = `${INSTITUCION.grupo} – ${INSTITUCION.comision}`;

/** Ancho de las barras dibujadas dentro de las tablas (en puntos). */
const ANCHO_BARRA = 104;

/**
 * Paleta del informe.
 *
 * Son los colores de la marca llevados a tonos legibles sobre papel blanco: el
 * cian y el amarillo originales quedan demasiado claros para imprimir.
 */
const COLOR = {
  cian: '#0089a0',
  tinta: '#24262f',
  suave: '#6b7280',
  linea: '#d9dee5',
  fondo: '#f3f5f8',
  magenta: '#c73f74',
  alerta: '#a63a22'
} as const;

/* ═════════════════════════ Formato y utilidades ═════════════════════════ */

const redondear = (numero: number, decimales = 1): number => {
  const factor = 10 ** decimales;
  return Math.round(numero * factor) / factor;
};

const porcentaje = (cantidad: number, total: number): number =>
  total ? redondear((cantidad / total) * 100) : 0;

const porcentajeTexto = (cantidad: number, total: number): string => `${porcentaje(cantidad, total)}%`;

const siNo = (valor: boolean): string => (valor ? 'Sí' : 'No');

const oGuion = (valor: string | null | undefined): string => (valor && valor.trim() ? valor : '—');

const formatearFechaHora = (iso: string | null | undefined): string => {
  if (!iso) return '—';

  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return '—';

  return fecha.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/** La fecha viene como "AAAA-MM-DD": se muestra como "DD/MM" para la serie diaria. */
const formatearDia = (dia: string): string => {
  const partes = dia.split('-');
  return partes.length === 3 ? `${partes[2]}/${partes[1]}` : dia;
};

const letra = (indice: number): string => String.fromCharCode(65 + indice);

const plural = (cantidad: number, singular: string, plural_: string): string =>
  `${cantidad} ${cantidad === 1 ? singular : plural_}`;

/* ═════════════════════════ Piezas reutilizables ═════════════════════════ */

const tituloSeccion = (texto: string): Nodo => ({
  text: texto,
  fontSize: 12,
  bold: true,
  color: COLOR.cian,
  margin: [0, 18, 0, 6]
});

const th = (texto: string, alineacion: 'left' | 'right' | 'center' = 'left'): Nodo => ({
  text: texto,
  fontSize: 7.5,
  bold: true,
  color: COLOR.suave,
  alignment: alineacion,
  fillColor: COLOR.fondo
});

const td = (texto: string, alineacion: 'left' | 'right' = 'left'): Nodo => ({
  text: texto,
  fontSize: 8.5,
  color: COLOR.tinta,
  alignment: alineacion
});

const parrafo = (texto: string): Nodo => ({
  text: texto,
  fontSize: 8.5,
  color: COLOR.suave,
  margin: [0, 0, 0, 5]
});

/** Barra de proporción: fondo gris tenue y el valor encima, en cian. */
const barra = (cantidad: number, total: number): Nodo => {
  const proporcion = total ? Math.min(1, cantidad / total) : 0;

  return {
    canvas: [
      { type: 'rect', x: 0, y: 0, w: ANCHO_BARRA, h: 8, r: 3, color: COLOR.fondo },
      {
        type: 'rect',
        x: 0,
        y: 0,
        w: Math.max(cantidad > 0 ? 2 : 0, ANCHO_BARRA * proporcion),
        h: 8,
        r: 3,
        color: COLOR.cian
      }
    ]
  };
};

/** Tarjetas del encabezado (etiqueta arriba, valor abajo). */
const celdaDato = (etiqueta: string, valor: string): Nodo => ({
  stack: [
    { text: etiqueta.toUpperCase(), fontSize: 7, color: COLOR.suave },
    { text: valor, fontSize: 10.5, bold: true, color: COLOR.tinta, margin: [0, 2, 0, 0] }
  ]
});

/** Fila de la ficha técnica: campo y detalle. */
const filaFicha = (campo: string, detalle: string): Nodo[] => [
  { text: campo, fontSize: 8, bold: true, color: COLOR.cian },
  { text: detalle, fontSize: 8.5, color: COLOR.tinta }
];

/** Fila de una tabla de tres columnas (concepto, cantidad, porcentaje). */
const filaConteo = (concepto: string, cantidad: number, total: number): Nodo[] => [
  td(concepto),
  td(String(cantidad), 'right'),
  td(total ? `${porcentaje(cantidad, total)}%` : '—', 'right')
];

/* ═════════════════════════ Estilos de tabla ═════════════════════════ */

const LAYOUT_TABLA = {
  hLineWidth: (indice: number, nodo: { table: { body: unknown[] } }): number =>
    indice === 0 || indice === 1 || indice === nodo.table.body.length ? 0.8 : 0.35,
  vLineWidth: (): number => 0,
  hLineColor: (indice: number): string => (indice === 0 || indice === 1 ? COLOR.cian : COLOR.linea),
  paddingLeft: (): number => 6,
  paddingRight: (): number => 6,
  paddingTop: (): number => 3.5,
  paddingBottom: (): number => 3.5
};

const LAYOUT_FICHA = {
  hLineWidth: (): number => 0.35,
  vLineWidth: (): number => 0,
  hLineColor: (): string => COLOR.linea,
  paddingLeft: (): number => 0,
  paddingRight: (): number => 8,
  paddingTop: (): number => 4,
  paddingBottom: (): number => 4
};

const LAYOUT_TARJETA = {
  hLineWidth: (): number => 0.5,
  vLineWidth: (): number => 0.5,
  hLineColor: (): string => COLOR.linea,
  vLineColor: (): string => COLOR.linea,
  paddingLeft: (): number => 9,
  paddingRight: (): number => 9,
  paddingTop: (): number => 7,
  paddingBottom: (): number => 7
};

const LAYOUT_CITA = {
  hLineWidth: (): number => 0,
  vLineWidth: (indice: number): number => (indice === 0 || indice === 1 ? 1.5 : 0),
  vLineColor: (): string => COLOR.cian,
  paddingLeft: (): number => 8,
  paddingRight: (): number => 0,
  paddingTop: (): number => 2,
  paddingBottom: (): number => 2
};

/* ═════════════════════════ Cálculos ═════════════════════════ */

/**
 * Distribución de cada pregunta.
 *
 * Se calcula acá (y no se recibe ya armado) para que el informe sea autónomo:
 * recibe la misma respuesta cruda del backend que usa el panel y llega a los
 * mismos números por su cuenta.
 */
export const contarBloques = (datos: PanelEstadisticas): BloquePregunta[] =>
  PREGUNTAS.map((pregunta) => {
    const conteo = datos.distribuciones[pregunta.id] || {};
    const total = Object.values(conteo).reduce((suma, cantidad) => suma + cantidad, 0);
    const conocidas = new Set(pregunta.opciones.map((opcion) => opcion.valor));

    const opciones: OpcionContada[] = pregunta.opciones.map((opcion) => {
      const cantidad = conteo[opcion.valor] || 0;
      return { valor: opcion.valor, cantidad, porcentaje: porcentaje(cantidad, total) };
    });

    // Si una opción cambió de texto, lo ya guardado no se pierde: se agrega al
    // final del bloque para que el informe siga cuadrando con la base.
    for (const [valor, cantidad] of Object.entries(conteo)) {
      if (!conocidas.has(valor)) {
        opciones.push({ valor, cantidad, porcentaje: porcentaje(cantidad, total) });
      }
    }

    return { id: pregunta.id, titulo: pregunta.titulo, total, opciones };
  });

/* ═════════════════════════ Secciones del informe ═════════════════════════ */

/**
 * Encabezado institucional de la portada: universidad, materia, cuatrimestre,
 * equipo docente, alumnos y comisión. Es lo que identifica el trabajo antes de
 * entrar en los resultados.
 */
const bloqueInstitucional = (): Nodo[] => {
  const dato = (etiqueta: string, valor: string): Nodo => ({
    text: [
      { text: `${etiqueta}: `, bold: true, color: COLOR.suave },
      { text: valor, color: COLOR.tinta }
    ],
    fontSize: 8,
    margin: [0, 1.5, 0, 0]
  });

  return [
    {
      text: INSTITUCION.universidad.toUpperCase(),
      fontSize: 10,
      bold: true,
      color: COLOR.cian,
      characterSpacing: 1.1
    },
    {
      text: INSTITUCION.materia,
      fontSize: 11.5,
      bold: true,
      color: COLOR.tinta,
      margin: [0, 3, 0, 0]
    },
    dato('AÑO LECTIVO/CUATRIMESTRE', INSTITUCION.periodo),
    dato('EQUIPO DOCENTE', INSTITUCION.docentes.join(' – ')),
    dato('Alumnos', INSTITUCION.alumnos.join(' / ')),
    { text: GRUPO, fontSize: 9.5, bold: true, color: COLOR.tinta, margin: [0, 4, 0, 0] },
    {
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.8, lineColor: COLOR.linea }],
      margin: [0, 11, 0, 0]
    }
  ];
};

const bloqueCabecera = (datos: PanelEstadisticas): Nodo[] => [
  ...bloqueInstitucional(),
  { text: 'TRIVIA WAR', fontSize: 9, bold: true, color: COLOR.cian, characterSpacing: 1.4, margin: [0, 13, 0, 0] },
  {
    text: 'Informe de resultados de la encuesta',
    fontSize: 19,
    bold: true,
    color: COLOR.tinta,
    margin: [0, 3, 0, 0]
  },
  {
    text: `Encuesta de validación: ${PREGUNTAS.length} preguntas cerradas de opción única y un comentario abierto opcional.`,
    fontSize: 9.5,
    color: COLOR.suave,
    margin: [0, 4, 0, 0]
  },
  {
    margin: [0, 14, 0, 0],
    table: {
      widths: ['*', '*', '*'],
      body: [
        [
          celdaDato('Corte del informe', formatearFechaHora(datos.generadoEn)),
          celdaDato('Muestra válida', `${datos.muestra.valida} encuestas completas`),
          celdaDato('Registros totales', `${datos.total} (incluye descartes y aplazos)`)
        ]
      ]
    },
    layout: LAYOUT_TARJETA
  },
  {
    text: `Documento confidencial. Contiene datos de contacto de los encuestados (${plural(datos.identidad.conCorreoVerificado, 'respuesta', 'respuestas')} con identidad verificada). Circulación limitada al grupo de trabajo.`,
    fontSize: 7.5,
    italics: true,
    color: COLOR.magenta,
    margin: [0, 10, 0, 0]
  }
];

/**
 * Ficha técnica: el "origen de los datos".
 *
 * Es la sección que hace auditable el informe: dice de dónde salen los datos,
 * cómo se relevaron, cuántos son, qué controles se aplicaron y qué no se puede
 * concluir con ellos.
 */
const bloqueOrigen = (datos: PanelEstadisticas): Nodo[] => {
  const primero = datos.listado.length ? datos.listado[datos.listado.length - 1].fecha : null;
  const versiones = Object.entries(datos.versiones || {});
  const versionTexto = versiones.length
    ? versiones.map(([version, cantidad]) => `${version} (${cantidad})`).join(' · ')
    : 'sin registros';

  const filas: Nodo[][] = [
    filaFicha(
      'Fuente',
      'Encuesta en línea autoadministrada: la persona completa el formulario por su cuenta, sin encuestador ni entrevista.'
    ),
    filaFicha(
      'Instrumento',
      `Cuestionario de ${PREGUNTAS.length} preguntas cerradas de opción única y una pregunta abierta opcional. Versión vigente: ${datos.versionCuestionario}. Versiones presentes en los datos: ${versionTexto}.`
    ),
    filaFicha(
      'Canal de captura',
      'Se presenta como ventana modal al ingresar a la aplicación TriviaWar (pantalla de bienvenida), antes de cualquier identificación. Aplica igual al sitio web y a la aplicación instalada.'
    ),
    filaFicha(
      'Origen del registro',
      'Base de datos de la aplicación (colección mvpp-encuestas), escrita por el backend propio. Los números de este informe son la lectura directa de esa base al momento del corte: no hay carga manual, ni reproceso, ni estimación.'
    ),
    filaFicha(
      'Universo y selección',
      'Personas que ingresan a la aplicación. Muestra autoseleccionada (de conveniencia): sin marco muestral, sin cuotas y sin ponderación.'
    ),
    filaFicha(
      'Unidad de análisis',
      'Un registro por dispositivo. El identificador del registro es el usuario anónimo o el identificador de dispositivo, de modo que los reintentos no generan respuestas duplicadas.'
    ),
    filaFicha(
      'Método de respuesta',
      'Preguntas de opción única y respuesta obligatoria, con opciones mutuamente excluyentes: por eso los porcentajes de cada pregunta suman 100%. Una pregunta filtro excluye a quien no pertenece al segmento y corta el cuestionario.'
    ),
    filaFicha(
      'Inmutabilidad',
      'Las respuestas quedan congeladas al enviarse: se conserva la primera y no la última. Si alguien intenta reenviar o modificarlas, el sistema lo registra como intento pero no altera el dato guardado.'
    ),
    filaFicha(
      'Período de relevamiento',
      `Captura continua. Primer registro: ${formatearFechaHora(primero)} · Corte del informe: ${formatearFechaHora(datos.generadoEn)} · Días con actividad: ${datos.porDia.length}`
    ),
    filaFicha(
      'Tamaño de la muestra',
      `${plural(datos.muestra.valida, 'encuesta completa', 'encuestas completas')} (base de todos los porcentajes), ${datos.muestra.descartadas} descartadas por el filtro de exclusión, ${datos.muestra.duplicadas} descartadas por duplicado y ${datos.muestra.abandonos} aplazadas ("en otro momento"). Registros totales: ${datos.total}. Tasa de finalización: ${datos.muestra.tasaFinalizacion}%.`
    ),
    filaFicha(
      'Respuestas duplicadas',
      `La misma persona puede responder desde el celular y después desde la computadora. Para que eso no infle la muestra, al iniciar sesión con Google la respuesta se coteja contra las ya existentes por cuenta y por correo: si esa persona ya había respondido, la respuesta nueva se conserva como registro de auditoría pero no suma a ninguna estadística. Registros marcados como duplicados: ${datos.muestra.duplicadas}.`
    ),
    filaFicha(
      'Identificación',
      `Cada respuesta nace asociada a un usuario anónimo y a un dispositivo. Cuando la persona ingresa con su cuenta de Google, la respuesta se vincula a un correo verificado: hoy ${datos.identidad.conCorreoVerificado} de ${datos.muestra.valida} respuestas completas (${datos.identidad.porcentajeVerificado}%) tienen identidad verificada y ${datos.identidad.anonimas} son anónimas.`
    ),
    filaFicha(
      'Controles de calidad',
      `Campo trampa contra bots, tiempo mínimo de llenado de ${SEGUNDOS_MINIMOS_LLENADO} segundos, marca automática de respuestas sospechosas, límite de envíos por dirección IP y registro de intentos de modificación. Respuestas marcadas como sospechosas: ${datos.calidad.sospechosas}. Registros con intentos de cambio: ${datos.calidad.conIntentosDeCambio}.`
    ),
    filaFicha(
      'Contexto técnico',
      'Por cada respuesta se registran sistema operativo, navegador, si la aplicación está instalada, zona horaria, idioma, plataforma y momento de apertura. Se usan para auditar el origen del dato, no para perfilamiento comercial.'
    ),
    filaFicha(
      'Datos personales',
      'El correo y el nombre se guardan sólo para poder verificar la trazabilidad de la respuesta. El panel es privado, está protegido por clave y no está enlazado desde ninguna sección de la aplicación.'
    ),
    filaFicha(
      'Alcance y limitaciones',
      'Muestra no probabilística, autoseleccionada y de tamaño reducido: los resultados son direccionales y describen a quienes respondieron, no a la población general. No están ponderados y no deben extrapolarse. Las conclusiones de mercado (tamaño, participación y proyección) se elaboran por separado y no forman parte de este informe.'
    )
  ];

  return [
    tituloSeccion('1. Origen de los datos'),
    parrafo(
      'Todo lo que sigue sale de la base de respuestas descrita en este cuadro. Se detalla el método completo para que cualquier lector pueda auditar de dónde viene cada número.'
    ),
    { table: { widths: [112, '*'], body: filas }, layout: LAYOUT_FICHA }
  ];
};

const bloqueSintesis = (datos: PanelEstadisticas, bloques: BloquePregunta[]): Nodo[] => {
  const nodos: Nodo[] = [tituloSeccion('2. Síntesis de resultados')];

  if (!datos.muestra.valida) {
    nodos.push({
      text: 'Todavía no hay encuestas completas: el informe se va a completar a medida que ingresen respuestas. Los cuadros siguientes muestran la estructura del relevamiento.',
      fontSize: 9,
      italics: true,
      color: COLOR.suave
    });

    return nodos;
  }

  const buscar = (id: string): BloquePregunta | null => bloques.find((bloque) => bloque.id === id) ?? null;
  const primero = (id: string): { opcion: OpcionContada | null; total: number } => {
    const bloque = buscar(id);
    return { opcion: bloque?.opciones[0] ?? null, total: bloque?.total ?? 0 };
  };

  const intencion = primero(PREGUNTA_INTENCION);
  const nivel = primero('nivelEducativo');
  const tradicional = primero('experienciaTradicional');
  const habito = primero('comoAprende');

  const puntos: string[] = [];

  if (intencion.opcion) {
    puntos.push(
      `Intención de uso: ${porcentajeTexto(intencion.opcion.cantidad, intencion.total)} de la muestra (${intencion.opcion.cantidad} de ${intencion.total}) respondió "${intencion.opcion.valor}" Es el dato que alimenta la proyección de mercado.`
    );
  }

  if (nivel.opcion) {
    puntos.push(
      `Perfil educativo: el grupo mayoritario es "${nivel.opcion.valor}" con ${porcentajeTexto(nivel.opcion.cantidad, nivel.total)} de las respuestas.`
    );
  }

  if (tradicional.opcion) {
    puntos.push(
      `Situación frente a los métodos tradicionales: la respuesta más elegida es "${tradicional.opcion.valor}" (${porcentajeTexto(tradicional.opcion.cantidad, tradicional.total)}).`
    );
  }

  if (habito.opcion) {
    puntos.push(
      `Forma habitual de aprender o repasar: predomina "${habito.opcion.valor}" (${porcentajeTexto(habito.opcion.cantidad, habito.total)}).`
    );
  }

  puntos.push(
    `Verificabilidad: ${datos.identidad.porcentajeVerificado}% de las respuestas completas está vinculado a una cuenta de Google con correo verificado, de modo que su autoría es rastreable hasta una cuenta real. El resto son respuestas anónimas.`
  );

  puntos.push(
    `Base del informe: ${plural(datos.muestra.valida, 'encuesta completa', 'encuestas completas')} sobre ${datos.total} registros totales, con una tasa de finalización de ${datos.muestra.tasaFinalizacion}%.`
  );

  if (datos.calidad.sospechosas) {
    puntos.push(
      `Advertencia de calidad: ${plural(datos.calidad.sospechosas, 'respuesta fue marcada', 'respuestas fueron marcadas')} como sospechosa por los controles automáticos.`
    );
  }

  nodos.push({ ul: puntos, fontSize: 9, color: COLOR.tinta, lineHeight: 1.35 });

  return nodos;
};

const bloqueResultados = (bloques: BloquePregunta[]): Nodo[] => {
  const nodos: Nodo[] = [
    tituloSeccion('3. Resultados por pregunta'),
    parrafo(
      'Cada pregunta se responde con una sola opción, así que las respuestas de cada cuadro suman el 100% de su base. Las barras son proporcionales al porcentaje.'
    )
  ];

  bloques.forEach((bloque, indice) => {
    nodos.push({
      text: `P${indice + 1}. ${bloque.titulo}`,
      fontSize: 10,
      bold: true,
      color: COLOR.tinta,
      margin: [0, 10, 0, 0]
    });

    nodos.push({
      text: bloque.total
        ? `Base: ${plural(bloque.total, 'respuesta', 'respuestas')} (100%)`
        : 'Base: sin respuestas',
      fontSize: 7.5,
      color: COLOR.suave,
      margin: [0, 2, 0, 5]
    });

    if (!bloque.total) {
      nodos.push({ text: 'Sin respuestas todavía.', fontSize: 8.5, italics: true, color: COLOR.suave });
      return;
    }

    const filas: Nodo[][] = [[th('Opción'), th('Respuestas', 'right'), th('%', 'right'), th('Distribución')]];

    for (const opcion of bloque.opciones) {
      filas.push([
        td(opcion.valor),
        td(String(opcion.cantidad), 'right'),
        { ...(td(`${opcion.porcentaje}%`, 'right') as object) },
        barra(opcion.cantidad, bloque.total)
      ]);
    }

    nodos.push({
      table: { widths: ['*', 44, 34, ANCHO_BARRA + 8], body: filas },
      layout: LAYOUT_TABLA
    });
  });

  return nodos;
};

const bloqueCalidad = (datos: PanelEstadisticas): Nodo[] => {
  const completas = datos.muestra.valida;

  const tablaIdentidad: Nodo = {
    table: {
      widths: ['*', 44, 40],
      body: [
        [th('Identidad'), th('Resp.', 'right'), th('%', 'right')],
        filaConteo('Con correo verificado (Google)', datos.identidad.conCorreoVerificado, completas),
        filaConteo('Con correo sin verificar', datos.identidad.conCorreo - datos.identidad.conCorreoVerificado, completas),
        filaConteo('Anónimas (sin cuenta)', datos.identidad.anonimas, completas),
        [
          { text: 'Total de encuestas completas', fontSize: 8.5, bold: true, color: COLOR.tinta },
          { text: String(completas), fontSize: 8.5, bold: true, alignment: 'right' },
          { text: completas ? '100%' : '—', fontSize: 8.5, bold: true, alignment: 'right' }
        ]
      ]
    },
    layout: LAYOUT_TABLA
  };

  const tablaCalidad: Nodo = {
    table: {
      widths: ['*', 52],
      body: [
        [th('Control de calidad'), th('Registros', 'right')],
        [td('Respuestas sospechosas'), td(String(datos.calidad.sospechosas), 'right')],
        [td('Con intentos de modificación'), td(String(datos.calidad.conIntentosDeCambio), 'right')],
        [td('Descartadas por el filtro'), td(String(datos.muestra.descartadas), 'right')],
        [td('Aplazadas ("en otro momento")'), td(String(datos.muestra.abandonos), 'right')],
        [td('Registros totales'), td(String(datos.total), 'right')],
        [
          { text: 'Tasa de finalización', fontSize: 8.5, bold: true, color: COLOR.tinta },
          { text: `${datos.muestra.tasaFinalizacion}%`, fontSize: 8.5, bold: true, alignment: 'right' }
        ]
      ]
    },
    layout: LAYOUT_TABLA
  };

  const sistemas = Object.entries(datos.dispositivo.porSo).sort((a, b) => b[1] - a[1]);
  const navegadores = Object.entries(datos.dispositivo.porNavegador).sort((a, b) => b[1] - a[1]);
  const listar = (pares: [string, number][]): string =>
    pares.length
      ? pares.map(([nombre, cantidad]) => `${nombre} (${cantidad})`).join(' · ')
      : 'sin datos';

  const filasDispositivo: Nodo[][] = [
    [th('Dispositivo'), th('Respuestas', 'right'), th('%', 'right')],
    filaConteo('Móvil (Android / iOS)', datos.dispositivo.movil, completas),
    filaConteo('Escritorio', datos.dispositivo.escritorio, completas),
    filaConteo('Sin dato', datos.dispositivo.desconocido, completas),
    filaConteo('Con la aplicación instalada (PWA)', datos.dispositivo.pwaInstalada, completas)
  ];

  return [
    tituloSeccion('4. Identidad, calidad y dispositivo'),
    parrafo(
      'Sólo las encuestas completas cuentan para los porcentajes de identidad y dispositivo: son la muestra válida del informe.'
    ),
    {
      columns: [
        { width: '49%', stack: [{ text: 'Identidad del encuestado', fontSize: 9, bold: true, color: COLOR.tinta, margin: [0, 0, 0, 4] }, tablaIdentidad] },
        { width: '2%', text: '' },
        { width: '49%', stack: [{ text: 'Controles aplicados', fontSize: 9, bold: true, color: COLOR.tinta, margin: [0, 0, 0, 4] }, tablaCalidad] }
      ]
    },
    { text: 'Dispositivo desde el que se respondió', fontSize: 9, bold: true, color: COLOR.tinta, margin: [0, 14, 0, 4] },
    { table: { widths: ['*', 60, 36], body: filasDispositivo }, layout: LAYOUT_TABLA },
    parrafo(`Sistemas operativos: ${listar(sistemas)}.`),
    parrafo(`Navegadores: ${listar(navegadores)}.`)
  ];
};

const bloqueEvolucion = (datos: PanelEstadisticas): Nodo[] => {
  const nodos: Nodo[] = [
    tituloSeccion('5. Evolución de la captura'),
    parrafo('Respuestas recibidas por día desde el inicio del relevamiento hasta el corte.')
  ];

  if (!datos.porDia.length) {
    nodos.push({ text: 'Sin registros todavía.', fontSize: 8.5, italics: true, color: COLOR.suave });
    return nodos;
  }

  const maximo = Math.max(1, ...datos.porDia.map((dia) => dia.total));

  const filas: Nodo[][] = [[th('Día'), th('Respuestas', 'right'), th('Completas', 'right'), th('Captura')]];

  for (const dia of datos.porDia) {
    filas.push([
      td(formatearDia(dia.fecha)),
      td(String(dia.total), 'right'),
      td(String(dia.completadas), 'right'),
      barra(dia.total, maximo)
    ]);
  }

  nodos.push({
    table: { widths: ['*', 60, 60, ANCHO_BARRA + 8], body: filas },
    layout: LAYOUT_TABLA
  });

  return nodos;
};

const bloqueSabana = (datos: PanelEstadisticas): Nodo[] => {
  const nodos: Nodo[] = [
    tituloSeccion('6. Anexo A. Sábana de respuestas'),
    parrafo(
      `Los ${datos.listado.length} registros de la base, del más reciente al más antiguo. Cada fila es una respuesta congelada, identificada por su fecha y hora, y se incluye aunque esté descartada o aplazada: así se ve también lo que quedó afuera del análisis.`
    )
  ];

  // --- Leyenda de códigos
  const leyenda: Nodo[] = PREGUNTAS.map((pregunta, indice) => ({
    text: [
      { text: `P${indice + 1}. ${pregunta.titulo}  `, bold: true, color: COLOR.cian },
      {
        text: pregunta.opciones.map((opcion, posicion) => `${letra(posicion)}) ${opcion.valor}`).join('   ·   '),
        color: COLOR.tinta
      }
    ],
    fontSize: 7.5,
    margin: [0, 0, 0, 2]
  }));

  nodos.push({
    stack: [{ text: 'Leyenda de códigos', fontSize: 8.5, bold: true, color: COLOR.tinta, margin: [0, 2, 0, 3] }, ...leyenda],
    margin: [0, 0, 0, 8]
  });

  if (!datos.listado.length) {
    nodos.push({ text: 'Sin registros todavía.', fontSize: 8.5, italics: true, color: COLOR.suave });
    return nodos;
  }

  // Códigos: valor de cada opción -> letra que se muestra en la tabla.
  const codigos = PREGUNTAS.map((pregunta) => {
    const mapa = new Map<string, string>();
    pregunta.opciones.forEach((opcion, posicion) => mapa.set(opcion.valor, letra(posicion)));
    return mapa;
  });

  const encabezado: Nodo[] = [
    th('Fecha y hora'),
    th('Estado'),
    th('Origen'),
    ...PREGUNTAS.map((_, indice) => th(`P${indice + 1}`, 'center')),
    // El informe es de circulación interna y su sentido es la trazabilidad:
    // siempre lleva el correo y el nombre, para poder volver de cada número a
    // la respuesta concreta que lo originó.
    th('Correo'),
    th('Nombre')
  ];

  const filas: Nodo[][] = [encabezado];

  const estadoTexto = (estado: string): string => {
    if (estado === 'completada') return 'Completa';
    if (estado === 'excluida') return 'Descartada';
    if (estado === 'aplazada') return 'Aplazada';
    if (estado === 'duplicada') return 'Duplicada';
    return estado;
  };

  const origenTexto = (fila: FilaEncuesta): string => {
    if (fila.estado === 'duplicada') return 'No suma a la muestra';
    if (fila.estado === 'excluida') return 'Fuera del segmento';
    if (fila.estado === 'aplazada') return 'Sin completar';
    if (fila.emailVerificado) return 'Verificada';
    if (fila.email) return 'Con correo';
    return 'Anónima';
  };

  for (const fila of datos.listado) {
    const celdas: Nodo[] = [
      { text: formatearFechaHora(fila.fecha), fontSize: 7.5, color: COLOR.tinta },
      { text: estadoTexto(fila.estado), fontSize: 7.5, color: COLOR.suave },
      { text: origenTexto(fila), fontSize: 7.5, color: COLOR.suave }
    ];

    PREGUNTAS.forEach((pregunta, indice) => {
      const respuesta = fila.respuestas[pregunta.id];
      const codigo = respuesta ? codigos[indice].get(respuesta) ?? '?' : '–';
      const sinResponder = !respuesta;

      celdas.push({
        text: codigo,
        fontSize: 7.5,
        alignment: 'center',
        color: sinResponder ? COLOR.linea : COLOR.tinta,
        bold: !sinResponder,
        fillColor: sinResponder ? undefined : COLOR.fondo
      });
    });

    celdas.push(
      { text: oGuion(fila.email), fontSize: 7.5, color: fila.emailVerificado ? COLOR.tinta : COLOR.suave },
      { text: oGuion(fila.nombre), fontSize: 7.5, color: COLOR.suave }
    );

    filas.push(celdas);
  }

  // Los anchos están medidos para que la tabla entre en el ancho de la página
  // (A4 menos márgenes): si no, pdfmake comprime las columnas y recorta el
  // correo y el nombre.
  const anchos: (number | string)[] = [58, 46, 50, ...PREGUNTAS.map(() => 20), 150, 62];

  nodos.push({
    table: { widths: anchos, body: filas, dontBreakRows: true, headerRows: 1 },
    layout: LAYOUT_TABLA,
    fontSize: 7.5
  });

  nodos.push({
    text: 'Las respuestas no se pueden modificar una vez enviadas: si un registro muestra un intento de cambio (ver la columna Control del panel), el dato que se conserva es el primero.',
    fontSize: 7.5,
    italics: true,
    color: COLOR.suave,
    margin: [0, 6, 0, 0]
  });

  return nodos;
};

const bloqueComentarios = (datos: PanelEstadisticas): Nodo[] => {
  const conComentario = datos.listado.filter((fila) => fila.comentario.trim().length > 0);
  const nivelId = PREGUNTAS[0]?.id ?? 'nivelEducativo';

  const nodos: Nodo[] = [
    tituloSeccion(`7. Anexo B. Comentarios (${conComentario.length})`),
    parrafo(PREGUNTA_COMENTARIO.titulo)
  ];

  if (!conComentario.length) {
    nodos.push({ text: 'Todavía no hay comentarios escritos.', fontSize: 8.5, italics: true, color: COLOR.suave });
    return nodos;
  }

  for (const fila of conComentario) {
    const partes = [oGuion(fila.respuestas[nivelId]), formatearFechaHora(fila.fecha)];

    // El informe siempre lleva el contacto; si el correo no está verificado se
    // aclara, para no dar por buena la autoría del comentario.
    if (fila.email) {
      partes.push(fila.emailVerificado ? fila.email : `${fila.email} (sin verificar)`);
    }

    nodos.push({
      table: {
        widths: ['*'],
        body: [
          [
            {
              stack: [
                { text: `“${fila.comentario.trim()}”`, fontSize: 9, color: COLOR.tinta, lineHeight: 1.3 },
                { text: partes.join('  ·  '), fontSize: 7.5, color: COLOR.suave, margin: [0, 3, 0, 0] }
              ]
            }
          ]
        ]
      },
      layout: LAYOUT_CITA,
      margin: [0, 0, 0, 7]
    });
  }

  nodos.push({
    text: `Comentarios escritos: ${conComentario.length} de ${datos.muestra.valida} encuestas completas. Los comentarios se reproducen textualmente, sin corregir ni clasificar.`,
    fontSize: 7.5,
    italics: true,
    color: COLOR.suave,
    margin: [0, 4, 0, 0]
  });

  return nodos;
};

/* ═════════════════════════ Documento ═════════════════════════ */

/**
 * Arma el documento completo. Es una función pura: se puede probar sin navegador.
 *
 * El informe es siempre el mismo documento de corte, con los contactos
 * incluidos: es de circulación interna y su sentido es la trazabilidad.
 */
export const construirInforme = (datos: PanelEstadisticas): Nodo => {
  const bloques = contarBloques(datos);
  const corte = formatearFechaHora(datos.generadoEn);

  return {
    pageSize: 'A4',
    pageMargins: [40, 46, 40, 50],
    defaultStyle: { fontSize: 9, color: COLOR.tinta, lineHeight: 1.28 },
    // Metadatos del propio archivo: también son parte del origen del documento.
    info: {
      title: 'Informe de resultados — Encuesta TriviaWar',
      author: `TriviaWar · ${GRUPO}`,
      subject: `${INSTITUCION.materia} · Encuesta de validación · corte ${corte}`,
      keywords: 'TriviaWar, encuesta, validacion de mercado, resultados',
      creator: `${INSTITUCION.universidad} · ${GRUPO}`
    },
    header: (pagina: number): Nodo | undefined =>
      pagina === 1
        ? undefined
        : {
            text: `TriviaWar · Informe de resultados de la encuesta · ${GRUPO}`,
            fontSize: 7,
            color: COLOR.suave,
            margin: [40, 16, 40, 0]
          },
    footer: (pagina: number, total: number): Nodo => ({
      columns: [
        { text: `${GRUPO} · ${INSTITUCION.materia}`, fontSize: 7, color: COLOR.suave },
        {
          text: `Corte ${corte} · Cuestionario v${datos.versionCuestionario} · Página ${pagina} de ${total}`,
          fontSize: 7,
          color: COLOR.suave,
          alignment: 'right'
        }
      ],
      margin: [40, 14, 40, 0]
    }),
    content: [
      ...bloqueCabecera(datos),
      ...bloqueOrigen(datos),
      ...bloqueSintesis(datos, bloques),
      ...bloqueResultados(bloques),
      ...bloqueCalidad(datos),
      ...bloqueEvolucion(datos),
      ...bloqueSabana(datos),
      ...bloqueComentarios(datos)
    ]
  };
};

/** Nombre del archivo: incluye la fecha del corte. */
export const nombreArchivoInforme = (datos: PanelEstadisticas): string => {
  const fecha = (datos.generadoEn || new Date().toISOString()).slice(0, 10);
  return `triviawar-informe-encuesta-${fecha}.pdf`;
};

let motorCargado: PdfMakeLike | null = null;

/** Descarga pdfmake (motor + tipografías) sólo la primera vez que se pide el informe. */
const cargarMotor = async (): Promise<PdfMakeLike> => {
  if (motorCargado) return motorCargado;

  const modulo = await import('pdfmake/build/pdfmake');
  const fuentes = await import('pdfmake/build/vfs_fonts');

  const pdfMake = ((modulo as unknown as { default?: PdfMakeLike }).default ?? modulo) as unknown as PdfMakeLike;
  const archivos = (fuentes as unknown as { default?: unknown }).default ?? fuentes;

  // pdfmake 0.3 registra las tipografías con addVirtualFileSystem; las versiones
  // anteriores las esperaban en la propiedad vfs.
  if (typeof pdfMake.addVirtualFileSystem === 'function') {
    pdfMake.addVirtualFileSystem(archivos);
  } else {
    pdfMake.vfs = archivos as Record<string, string>;
  }

  motorCargado = pdfMake;
  return pdfMake;
};

/** Genera el informe y dispara la descarga del PDF. */
export const descargarInforme = async (datos: PanelEstadisticas): Promise<void> => {
  const pdfMake = await cargarMotor();
  pdfMake.createPdf(construirInforme(datos)).download(nombreArchivoInforme(datos));
};
