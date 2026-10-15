import { ChangeDetectionStrategy, Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { EstadisticasService } from '../../servicios/encuesta/estadisticas.service';
import { PREGUNTAS } from '../../servicios/encuesta/encuesta-preguntas';
import { BloquePregunta, FilaEncuesta, OpcionContada } from '../../servicios/encuesta/estadisticas.model';
import { descargarInforme, nombreArchivoInforme } from '../../servicios/encuesta/informe-pdf';

/** Tamaños de página disponibles para la sábana. */
const TAMANOS = [10, 25, 50];

/** Zona de referencia por defecto si el panel no la informa. */
const ZONA_HORARIA_POR_DEFECTO = 'America/Argentina/Buenos_Aires';

/** Pregunta de la que sale el número de intención de uso. */
const PREGUNTA_INTENCION = 'sumariaLaApp';

/**
 * Una parte de la población total (un estado), lista para el gráfico global.
 *
 * El panel muestra DOS poblaciones bien separadas: primero la población total
 * (todo lo recolectado) y después la muestra válida (solo las completas). Este
 * tipo describe la primera.
 */
interface SegmentoPoblacion {
  /** Estado del backend (`completada`, `aplazada`, ...). Se usa para el color. */
  clave: string;
  etiqueta: string;
  nota: string;
  cantidad: number;
  porcentaje: number;
  /** ¿Es la porción que después se analiza? Se resalta en el gráfico. */
  valida: boolean;
}

/**
 * Panel de resultados de la encuesta.
 *
 * Es una página "oculta": no tiene ningún enlace en la aplicación y sólo entra
 * quien tenga la URL y la clave del grupo. Los datos nunca salen del backend
 * sin la clave: sin ella, esta pantalla sólo muestra el formulario de acceso.
 */
@Component({
  selector: 'app-estadisticas',
  imports: [],
  templateUrl: './estadisticas.html',
  styleUrl: './estadisticas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EstadisticasComponent {
  protected readonly panel = inject(EstadisticasService);
  private readonly platformId = inject(PLATFORM_ID);

  protected readonly tamanos = TAMANOS;

  /** El catálogo de preguntas: define el orden de las columnas de la sábana. */
  protected readonly preguntas = PREGUNTAS;

  /** Pregunta 1: se usa para armar el filtro por nivel educativo. */
  protected readonly preguntaNivel = PREGUNTAS.find((pregunta) => pregunta.id === 'nivelEducativo') ?? null;

  // --- Candado --------------------------------------------------------------

  protected readonly claveIngresada = signal('');

  // --- Filtros y paginado de la sábana --------------------------------------

  protected readonly filtroEstado = signal('todas');
  protected readonly filtroNivel = signal('todos');
  protected readonly busqueda = signal('');
  protected readonly pagina = signal(1);
  protected readonly tamano = signal(TAMANOS[0]);
  protected readonly filaAbierta = signal<string | null>(null);

  // --- Descargas ------------------------------------------------------------

  /** ¿Se está armando el PDF? El armado tarda un instante: se avisa en el botón. */
  protected readonly generandoInforme = signal(false);

  // --- Datos derivados ------------------------------------------------------

  /**
   * Los bloques de preguntas con sus porcentajes ya calculados.
   *
   * Se calculan SOLO sobre la muestra válida (las encuestas completas): es el
   * mismo denominador que usa el backend en `distribuciones`. Por eso cada
   * bloque suma 100% sobre esa base, que se aclara en el encabezado del bloque.
   *
   * La opción de exclusión (la marcada con `excluye`) NO se lista acá: quien la
   * elige queda fuera de la muestra, así que por definición nunca puede sumar
   * dentro de este segmento. Su conteo se ve arriba, en "Población total".
   */
  protected readonly bloques = computed<BloquePregunta[]>(() => {
    const datos = this.panel.datos();
    if (!datos) return [];

    return PREGUNTAS.map((pregunta) => {
      const conteo = datos.distribuciones[pregunta.id] || {};
      const total = Object.values(conteo).reduce((suma, cantidad) => suma + cantidad, 0);

      // Solo las opciones que pueden pertenecer a la muestra válida.
      const opcionesValidas = pregunta.opciones.filter((opcion) => !opcion.excluye);
      const conocidas = new Set(opcionesValidas.map((opcion) => opcion.valor));

      const calcular = (cantidad: number): number =>
        total ? Math.round((cantidad / total) * 1000) / 10 : 0;

      const opciones: OpcionContada[] = opcionesValidas.map((opcion) => {
        const cantidad = conteo[opcion.valor] || 0;
        return { valor: opcion.valor, cantidad, porcentaje: calcular(cantidad) };
      });

      // Si algún día se cambia el texto de una opción, lo ya guardado no se pierde:
      // se muestra igual, al final del bloque. (Un valor de la opción de exclusión
      // no debería estar acá, pero si pasara se muestra en vez de ocultarlo.)
      for (const [valor, cantidad] of Object.entries(conteo)) {
        if (!conocidas.has(valor)) {
          opciones.push({ valor, cantidad, porcentaje: calcular(cantidad) });
        }
      }

      return { id: pregunta.id, titulo: pregunta.titulo, total, opciones };
    });
  });

  // --- Población total ------------------------------------------------------

  /** Cuántas respuestas se recolectaron en total, sin filtrar por estado. */
  protected readonly totalPoblacion = computed(() => this.panel.datos()?.total ?? 0);

  /** Qué porción de la población total es la muestra válida, en porcentaje. */
  protected readonly porcentajeValido = computed(() => {
    const total = this.totalPoblacion();
    const validas = this.panel.datos()?.muestra.valida ?? 0;
    return total ? Math.round((validas / total) * 1000) / 10 : 0;
  });

  /**
   * Las partes de la población total, para el gráfico global de arriba.
   *
   * Son los mismos números que la ficha técnica, pero dibujados como una barra
   * única: el objetivo es que se vea de un vistazo que la muestra válida es solo
   * una porción del total, y que todo lo que viene después se calcula ahí.
   */
  protected readonly poblacionTotal = computed<SegmentoPoblacion[]>(() => {
    const datos = this.panel.datos();
    if (!datos) return [];

    const partes: SegmentoPoblacion[] = [
      {
        clave: 'completada',
        etiqueta: 'Completadas',
        nota: 'Es la muestra válida: sobre estas se calcula todo lo que sigue.',
        cantidad: datos.estados.completada,
        valida: true,
        porcentaje: 0
      },
      {
        clave: 'aplazada',
        etiqueta: 'En otro momento',
        nota: 'Pueden volver a responder.',
        cantidad: datos.estados.aplazada,
        valida: false,
        porcentaje: 0
      },
      {
        clave: 'duplicada',
        etiqueta: 'Duplicadas',
        nota: 'La misma cuenta ya había respondido.',
        cantidad: datos.estados.duplicada,
        valida: false,
        porcentaje: 0
      },
      {
        clave: 'excluida',
        etiqueta: 'Descartadas',
        nota: 'Eligieron la opción de exclusión.',
        cantidad: datos.estados.excluida,
        valida: false,
        porcentaje: 0
      }
    ];

    // El backend puede reportar un cajón "otros": si tiene datos, se muestra.
    if (datos.estados.otros) {
      partes.push({
        clave: 'otros',
        etiqueta: 'Otros',
        nota: 'Estado no reconocido.',
        cantidad: datos.estados.otros,
        valida: false,
        porcentaje: 0
      });
    }

    const total = this.totalPoblacion() || 1;
    return partes.map((parte) => ({
      ...parte,
      porcentaje: Math.round((parte.cantidad / total) * 1000) / 10
    }));
  });

  /** Intención de uso: el dato que después alimenta el SOM. */
  protected readonly intencion = computed(() => {
    const bloque = this.bloques().find((item) => item.id === PREGUNTA_INTENCION);
    if (!bloque || !bloque.total) return null;

    const primera = bloque.opciones[0];
    if (!primera) return null;

    return { porcentaje: primera.porcentaje, cantidad: primera.cantidad, total: bloque.total };
  });

  /** Comentarios escritos, para la lectura cualitativa. */
  protected readonly comentarios = computed(() =>
    (this.panel.datos()?.listado ?? []).filter((fila) => fila.comentario.trim().length > 0)
  );

  /** Máximo de respuestas en un día, para escalar las barras de la evolución. */
  protected readonly maximoPorDia = computed(() =>
    Math.max(1, ...(this.panel.datos()?.porDia ?? []).map((dia) => dia.total))
  );

  /** Sábana filtrada. */
  protected readonly filasFiltradas = computed<FilaEncuesta[]>(() => {
    const filas = this.panel.datos()?.listado ?? [];
    const estado = this.filtroEstado();
    const nivel = this.filtroNivel();
    const texto = this.busqueda().trim().toLowerCase();

    return filas.filter((fila) => {
      if (estado !== 'todas' && fila.estado !== estado) return false;
      if (nivel !== 'todos' && fila.respuestas[this.preguntaNivel?.id ?? 'nivelEducativo'] !== nivel) return false;

      if (texto) {
        const contenido = [
          fila.email,
          fila.nombre,
          fila.comentario,
          ...Object.values(fila.respuestas)
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!contenido.includes(texto)) return false;
      }

      return true;
    });
  });

  protected readonly totalPaginas = computed(() =>
    Math.max(1, Math.ceil(this.filasFiltradas().length / this.tamano()))
  );

  protected readonly filasDeLaPagina = computed(() => {
    const desde = (this.pagina() - 1) * this.tamano();
    return this.filasFiltradas().slice(desde, desde + this.tamano());
  });

  /** Números de página visibles (ventana de 7 alrededor de la actual). */
  protected readonly paginasVisibles = computed(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const ancho = 7;
    const inicio = Math.max(1, Math.min(actual - Math.floor(ancho / 2), total - ancho + 1));

    return Array.from({ length: Math.min(ancho, total) }, (_, indice) => inicio + indice);
  });

  // --- Candado --------------------------------------------------------------

  protected onClave(evento: Event): void {
    this.claveIngresada.set((evento.target as HTMLInputElement).value);
  }

  protected ingresar(evento: Event): void {
    evento.preventDefault();
    void this.panel.cargar(this.claveIngresada());
  }

  protected descartarClave(): void {
    this.claveIngresada.set('');
    this.panel.error.set('');
  }

  // --- Acciones del panel ---------------------------------------------------

  protected actualizar(): void {
    void this.panel.cargar();
  }

  protected salir(): void {
    this.panel.salir();
    this.claveIngresada.set('');
    this.pagina.set(1);
  }

  // --- Filtros y paginado ---------------------------------------------------

  protected cambiarEstado(evento: Event): void {
    this.filtroEstado.set((evento.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  protected cambiarNivel(evento: Event): void {
    this.filtroNivel.set((evento.target as HTMLSelectElement).value);
    this.pagina.set(1);
  }

  protected onBusqueda(evento: Event): void {
    this.busqueda.set((evento.target as HTMLInputElement).value);
    this.pagina.set(1);
  }

  protected limpiarFiltros(): void {
    this.filtroEstado.set('todas');
    this.filtroNivel.set('todos');
    this.busqueda.set('');
    this.pagina.set(1);
  }

  protected cambiarTamano(evento: Event): void {
    this.tamano.set(Number((evento.target as HTMLSelectElement).value) || TAMANOS[0]);
    this.pagina.set(1);
  }

  protected irAPagina(numero: number): void {
    this.pagina.set(Math.min(Math.max(1, numero), this.totalPaginas()));
  }

  protected alternarComentario(id: string): void {
    this.filaAbierta.set(this.filaAbierta() === id ? null : id);
  }

  // --- Presentación ---------------------------------------------------------

  /** Nombre legible del estado de una respuesta (para la sábana y el informe). */
  protected etiquetaEstado(estado: string): string {
    switch (estado) {
      case 'completada':
        return 'Completada';
      case 'excluida':
        return 'Descartada';
      case 'aplazada':
        return 'En otro momento';
      case 'duplicada':
        return 'Duplicada';
      default:
        return estado;
    }
  }

  /**
   * Formatea una fecha/hora con la zona de referencia del estudio, no con la del
   * navegador: si no, el día que se ve acá no coincidiría con la barra del gráfico
   * (que el backend agrupa en esa misma zona).
   */
  protected formatearFecha(iso: string | null): string {
    if (!iso) return 'Sin fecha';

    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return 'Sin fecha';

    return fecha.toLocaleString('es-AR', {
      timeZone: this.panel.datos()?.zonaHoraria || ZONA_HORARIA_POR_DEFECTO,
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /** Fecha AAAA-MM-DD de hoy en la zona de referencia (para el nombre del CSV). */
  private fechaDeHoy(): string {
    const zona = this.panel.datos()?.zonaHoraria || ZONA_HORARIA_POR_DEFECTO;
    const partes: Record<string, string> = {};

    for (const { type, value } of new Intl.DateTimeFormat('en-CA', {
      timeZone: zona,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(new Date())) {
      partes[type] = value;
    }

    return `${partes['year']}-${partes['month']}-${partes['day']}`;
  }

  /** "1 a 10 de 24" para la barra de paginado. */
  protected rangoMostrado(): string {
    const total = this.filasFiltradas().length;
    if (!total) return 'Sin resultados';
    const desde = (this.pagina() - 1) * this.tamano() + 1;
    const hasta = Math.min(desde + this.tamano() - 1, total);
    return `Mostrando ${desde} a ${hasta} de ${total}`;
  }

  /** Descarga la sábana (ya filtrada) en CSV, para el informe. */
  protected descargarCsv(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const filas = this.filasFiltradas();

    const columnas = [
      'fecha',
      'estado',
      ...PREGUNTAS.map((pregunta) => pregunta.id),
      'comentario',
      'email',
      'emailVerificado',
      'nombre',
      'sistemaOperativo',
      'navegador',
      'pwaInstalada',
      'intentosDeCambio',
      'sospechosa',
      'senalesDeRiesgo'
    ];

    const escapar = (valor: unknown): string => `"${String(valor ?? '').replace(/"/g, '""')}"`;
    const siNo = (valor: boolean): string => (valor ? 'si' : 'no');

    const lineas = [
      columnas.join(','),
      ...filas.map((fila) =>
        [
          this.formatearFecha(fila.fecha),
          fila.estado,
          ...PREGUNTAS.map((pregunta) => fila.respuestas[pregunta.id] ?? ''),
          fila.comentario,
          fila.email ?? '',
          siNo(fila.emailVerificado),
          fila.nombre ?? '',
          fila.dispositivo.so ?? '',
          fila.dispositivo.navegador ?? '',
          siNo(fila.dispositivo.pwaInstalada),
          fila.intentosDeCambio,
          siNo(fila.sospechosa),
          fila.senalesDeRiesgo.join(' ')
        ]
          .map(escapar)
          .join(',')
      )
    ];

    // El BOM hace que Excel respete los acentos.
    const blob = new Blob(['\uFEFF' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');

    enlace.href = url;
    enlace.download = `triviawar-encuesta-${this.fechaDeHoy()}.csv`;
    enlace.click();

    URL.revokeObjectURL(url);
  }

  /**
   * Descarga el informe en PDF.
   *
   * El informe no lleva los filtros de la pantalla: es el documento de corte
   * completo (ficha técnica, resultados, identidad, evolución, sábana con los
   * contactos y comentarios). El CSV queda para quien quiera trabajar los datos
   * crudos.
   */
  protected async descargarPdf(): Promise<void> {
    const datos = this.panel.datos();
    if (!datos || !isPlatformBrowser(this.platformId) || this.generandoInforme()) return;

    this.generandoInforme.set(true);

    try {
      const nombre = nombreArchivoInforme(datos);
      await descargarInforme(datos);
      console.log(`📄 Informe generado: ${nombre}`);
    } catch (error) {
      console.error('📄 No se pudo generar el informe en PDF:', error);
    } finally {
      this.generandoInforme.set(false);
    }
  }
}
