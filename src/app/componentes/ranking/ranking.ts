import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router} from '@angular/router';
import { EstadisticasService, JugadorRanking } from '../../servicios/estadisticas/estadisticas.service';
import { NavbarComponent } from '../navbar/navbar';


@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './ranking.html',
  styleUrls: ['./ranking.scss']
})
export class RankingComponent implements OnInit {
  ranking: JugadorRanking[] | null = null;
  
  // Paginación móvil
  paginaActual: number = 1;
  elementosPorPagina: number = 10;
  rankingPaginado: JugadorRanking[] = [];
  totalPaginas: number = 0;

  constructor(
    private estadisticasService: EstadisticasService, 
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.estadisticasService.obtenerRankingGlobal(50).subscribe({
      next: (data) => {
        this.ranking = data && Array.isArray(data) ? data : [];
        this.actualizarPaginacion();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error cargando ranking:', error);
        this.ranking = [];
        this.actualizarPaginacion();
      }
    });
  }

  private actualizarPaginacion(): void {
    if (!this.ranking || this.ranking.length === 0) {
      this.rankingPaginado = [];
      this.totalPaginas = 0;
      return;
    }
    
    this.totalPaginas = Math.ceil(this.ranking.length / this.elementosPorPagina);
    
    // Asegurar que la página actual esté en rango válido
    if (this.paginaActual > this.totalPaginas) {
      this.paginaActual = 1;
    }
    
    const inicio = (this.paginaActual - 1) * this.elementosPorPagina;
    const fin = inicio + this.elementosPorPagina;
    this.rankingPaginado = this.ranking.slice(inicio, fin);
  }

  cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= this.totalPaginas) {
      this.paginaActual = nuevaPagina;
      this.actualizarPaginacion();
    }
  }

  volverAlDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  trackByPosition(index: number, jugador: JugadorRanking): number {
    return jugador.posicion;
  }
}
