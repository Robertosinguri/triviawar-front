/**
 * Declaraciones mínimas para pdfmake.
 *
 * La librería no publica tipos propios, así que se declara acá lo poco que se
 * usa: el motor de generación y el sistema de archivos virtual que trae las
 * tipografías (Roboto, que cubre los acentos del castellano).
 *
 * El informe se arma escribiendo el documento como datos (contenido, tablas,
 * colores), así que no hace falta tipar más que eso.
 */

declare module 'pdfmake/build/pdfmake' {
  const pdfMake: {
    /** Registra las tipografías (así se llama en pdfmake 0.3). */
    addVirtualFileSystem?: (vfs: unknown) => void;
    /** Forma anterior de registrar las tipografías. */
    vfs?: Record<string, string>;
    createPdf: (definicion: object) => {
      download: (nombre?: string) => void;
    };
  };

  export default pdfMake;
}

declare module 'pdfmake/build/vfs_fonts' {
  const vfs: Record<string, string>;

  export default vfs;
}
