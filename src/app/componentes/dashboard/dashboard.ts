import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { EstadisticasService, JugadorRanking } from '../../servicios/estadisticas/estadisticas.service';
import { ChatComponent } from '../chat/chat';
import { AudioService } from '../../servicios/audio/audio.service'; // 🔊 Importar AudioService

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, NavbarComponent, ChatComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.scss']
})
export class DashboardComponent implements OnInit, OnDestroy { // 👈 Agregar OnDestroy
  codigoSala: string = '';
  codigoSalaValido: boolean = true;
  rankingMinimalista: JugadorRanking[] | null = null;

  constructor(
    private router: Router,
    private estadisticasService: EstadisticasService,
    private cdr: ChangeDetectorRef,
    private audioService: AudioService // 🔊 Inyectar AudioService
  ) {}

  ngOnInit() {
    // 🔊 Iniciar música de fondo del dashboard (misma lógica que entrenamiento)
    this.audioService.playFondoDashboard(); //  Método que agregaremos en AudioService
    this.cargarRankingMinimalista();
  }

  ngOnDestroy() {
    // 🔊 Detener música al salir del dashboard (misma lógica que entrenamiento)
    this.audioService.stopFondoDashboard(); // Método que agregaremos en AudioService
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
    this.audioService.play('click'); //  Mismo efecto click que en entrenamiento
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
    
    this.audioService.play('click'); //  Mismo efecto click que en entrenamiento
    this.codigoSalaValido = true;
    this.router.navigate(['/unirse-sala'], { 
      queryParams: { codigo: codigo } 
    });
  }

  iniciarEntrenamiento() {
    this.audioService.play('click'); // Mismo efecto 
    this.router.navigate(['/entrenamiento']);
  }
}