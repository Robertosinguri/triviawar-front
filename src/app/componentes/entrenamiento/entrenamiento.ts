import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
//import { BackgroundComponent } from '../background/background';
import { NavbarComponent } from '../navbar/navbar';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface ConfiguracionEntrenamiento {
  tematica: string;
  dificultad: 'baby' | 'conocedor' | 'killer' | '';
}

@Component({
  selector: 'app-entrenamiento',
  standalone: true,
  imports: [FormsModule, CommonModule, NavbarComponent],
  templateUrl: './entrenamiento.html',
  styleUrls: ['./entrenamiento.scss']
})
export class EntrenamientoComponent {
  configuracion: ConfiguracionEntrenamiento = {
    tematica: '',
    dificultad: ''
  };

  cargando: boolean = false;

  sugerenciasTematicas: string[] = [
    'deportes', 'historia', 'ciencia', 'música',
    'cine', 'tecnología', 'cocina', 'arte'
  ];

  motoresIA = [
    { nombre: 'Gemini 2.5', icono: '🤖', estado: 'Principal', color: '#4285F4' },
    { nombre: 'Cohere', icono: '🧡', estado: 'Optimizado', color: '#FB8C00' },
    { nombre: 'Llama 3.1', icono: '🦙', estado: 'Respaldo', color: '#00BCD4' }
  ];

  constructor(
    private router: Router,
    private authService: FirebaseAuthService,
    private http: HttpClient
  ) { }

  seleccionarSugerencia(sugerencia: string) {
    this.configuracion.tematica = sugerencia;
  }

  tematicaInvalida: boolean = false;

  validarTematica(event: any) {
    const valor = event.target.value;
    const palabras = this.contarPalabras(valor);
    this.tematicaInvalida = palabras > 3;

    if (this.tematicaInvalida) {
      const palabrasArray = valor.trim().split(/\s+/);
      if (palabrasArray.length > 3) {
        this.configuracion.tematica = palabrasArray.slice(0, 3).join(' ');
        this.tematicaInvalida = false;
      }
    }
  }

  contarPalabras(texto: string): number {
    if (!texto || texto.trim() === '') return 0;
    return texto.trim().split(/\s+/).length;
  }

  esConfiguracionValida(): boolean {
    return this.configuracion.tematica.trim() !== '' &&
      this.configuracion.dificultad !== '' &&
      !this.tematicaInvalida &&
      this.contarPalabras(this.configuracion.tematica) <= 3;
  }

  async iniciarEntrenamiento() {
    if (!this.esConfiguracionValida()) return;

    this.cargando = true;

    try {
      // 1. Llamar a la API para generar preguntas
      console.log('🤖 Generando preguntas de entrenamiento...');
      const response = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/games/generate-questions`, {
          tematicas: [this.configuracion.tematica],
          dificultad: this.configuracion.dificultad
        })
      );

      if (response && response.success) {
        // 2. Navegar a /arena (mismo escenario que multijugador, modo entrenamiento = 1 jugador)
        this.router.navigate(['/arena'], {
          queryParams: {
            modo: 'entrenamiento',
            roomCode: 'SINGLE-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
            tematicas: this.configuracion.tematica,
            dificultad: this.configuracion.dificultad
          },
          state: {
            gameData: {
              preguntas: response.preguntas,
              tematica: this.configuracion.tematica,
              dificultad: this.configuracion.dificultad,
              aiInfo: {
                model: response.aiUsada,
                duration: response.duration
              }
            }
          }
        });
      } else {
        alert('No se pudieron generar preguntas. Intenta con otra temática.');
      }
    } catch (error) {
      console.error('Error al iniciar entrenamiento:', error);
      alert('Error de conexión con el servidor.');
    } finally {
      this.cargando = false;
    }
  }
}
