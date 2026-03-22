import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { EstadisticasService, JugadorRanking } from '../../servicios/estadisticas/estadisticas.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, NavbarComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  codigoSala: string = '';
  codigoSalaValido: boolean = true;
  rankingMinimalista: JugadorRanking[] | null = null;

  constructor(
    private router: Router,
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarRankingMinimalista();
  }

  private cargarRankingMinimalista(): void {
    this.estadisticasService.obtenerRankingGlobal(3).subscribe({
      next: (ranking) => {
        this.rankingMinimalista = ranking;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.rankingMinimalista = [];
      }
    });
  }

  crearSala() {
    this.router.navigate(['/crear-sala']);
  }

  validarCodigoSala() {
    const codigo = this.codigoSala.trim().toUpperCase();

    const formatoValido = /^[A-Z0-9]{6}$/.test(codigo);
    this.codigoSalaValido = formatoValido || codigo === '';
  }

  unirseASala() {
    const codigo = this.codigoSala.trim().toUpperCase();
    
    if (!codigo) {
      return;
    }
    

    if (!/^[A-Z0-9]{6}$/.test(codigo)) {
      this.codigoSalaValido = false;
      return;
    }
    
    this.codigoSalaValido = true;
    this.router.navigate(['/unirse-sala'], { 
      queryParams: { codigo: codigo } 
    });
  }

  iniciarEntrenamiento() {
    this.router.navigate(['/entrenamiento']);
  }


}