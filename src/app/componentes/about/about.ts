import { Component } from '@angular/core';
import { NavbarComponent } from '../navbar/navbar';

/**
 * Página "Qué es TriviaWar".
 *
 * Reemplaza al About original (que quedó conservado en /about-clasico) con una
 * presentación del proyecto tomada de la Introducción de la Entrega 01-B:
 * el problema, la solución y el cliente al que apunta.
 *
 * Los datos del encabezado son los del trabajo académico: universidad, materia,
 * cuatrimestre, equipo y comisión. No incluye a los docentes a propósito.
 */
const INSTITUCION = {
  universidad: 'Universidad de la Ciudad de Buenos Aires',
  materia: 'Taller de Emprendedurismo',
  proyecto: 'Aplicación de aprendizaje social TriviaWar',
  cuatrimestre: '2do Cuatrimestre 2026',
  equipo: ['Nahuel C.', 'Sánchez B.', 'Carmona A.', 'López O.', 'Fortunesky I.', 'Singuri R.'],
  grupo: 'Grupo 18',
  comision: 'Comisión 2'
} as const;

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [NavbarComponent],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})
export class AboutComponent {
  protected readonly institucion = INSTITUCION;

  /** Resumen en una frase: es lo primero que se lee. */
  protected readonly resumen =
    'TriviaWar es una aplicación de aprendizaje social: un espacio donde se estudia ' +
    'compitiendo y conversando sobre temas educativos, con contenido infinito generado por IA.';

  protected readonly problema = {
    titulo: 'El problema',
    texto:
      'La información cambió de ritmo y de volumen: hoy hay más contenido, más rápido y al ' +
      'instante. Pero la manera de estudiar quedó igual: plana, solitaria y tediosa. ' +
      'El estudiante queda desconectado, se aburre y abandona.'
  };

  protected readonly solucion = {
    titulo: 'La solución',
    texto:
      'TriviaWar rompe ese paradigma con una forma diferente de estudiar: entornos sociales ' +
      'donde se aprende compitiendo y conversando sobre temas educativos, con contenido ' +
      'infinito generado por IA.'
  };

  protected readonly cliente = {
    titulo: 'El cliente',
    texto:
      'El estudiante de nivel secundario, terciario y universitario: nativo digital, que usa ' +
      'el celular todo el día y consume redes sociales y juegos online. Quiere aprender y ' +
      'aprobar, pero hoy vive el estudio como algo plano, solitario y sin feedback: se ' +
      'distrae, pierde la motivación y abandona el repaso.'
  };

  protected readonly motivacion =
    'Su motivación real es social: aprender con sus compañeros, competir y pertenecer. ' +
    'Por eso busca formas de estudiar más dinámicas, con desafíos y recompensas visibles ' +
    '(ranking, logros) y sin la sensación de "estar estudiando".';

  /** Los cuatro pilares que salen de la propuesta de valor. */
  protected readonly pilares = [
    {
      icono: '⚔️',
      titulo: 'Aprender compitiendo',
      texto: 'Desafíos y partidas donde medís lo que sabés contra otros, no contra un apunte.'
    },
    {
      icono: '💬',
      titulo: 'Aprender conversando',
      texto: 'Entornos sociales: se repasa y se debate con compañeros, en vez de estudiar en soledad.'
    },
    {
      icono: '♾️',
      titulo: 'Contenido infinito',
      texto: 'Preguntas generadas por IA sobre cualquier tema, para que nunca se termine el material.'
    },
    {
      icono: '🏆',
      titulo: 'Recompensas visibles',
      texto: 'Ranking y logros: el progreso se ve, y estudiar deja de sentirse como estudiar.'
    }
  ];
}
