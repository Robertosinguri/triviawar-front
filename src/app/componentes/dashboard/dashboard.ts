import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { EstadisticasService, JugadorRanking } from '../../servicios/estadisticas/estadisticas.service';
import { ChatComponent } from '../chat/chat';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, NavbarComponent, ChatComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit {
  codigoSala: string = '';
  codigoSalaValido: boolean = true;
  rankingMinimalista: JugadorRanking[] | null = null;
  salasPublicas: any[] = [];
  intervaloSalas: any;

  constructor(
    private router: Router,
    private estadisticasService: EstadisticasService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.cargarRankingMinimalista();
    this.cargarSalasPublicas();
    
    // Polling de salas cada 10 segundos
    this.intervaloSalas = setInterval(() => {
      this.cargarSalasPublicas();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.intervaloSalas) {
      clearInterval(this.intervaloSalas);
    }
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

  private cargarSalasPublicas(): void {
    this.http.get<any[]>(`${environment.apiUrl}/rooms`).subscribe({
      next: (salas) => {
        this.salasPublicas = salas;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando salas públicas:', err);
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

  unirseASala(codigo?: string) {
    const salaAUnirse = codigo || this.codigoSala.trim().toUpperCase();
    if (salaAUnirse) {
      // Si viene de la lista de salas públicas (trae código), vamos DIRECTO al lobby
      // Si viene del input manual (no trae código en el parámetro), también vamos directo ahora.
      this.router.navigate(['/lobby'], { 
        queryParams: { codigo: salaAUnirse, host: 'false' } 
      });
    }
  }

  iniciarEntrenamiento() {
    this.router.navigate(['/entrenamiento']);
  }
}