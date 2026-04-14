import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AudioService } from '../../servicios/audio/audio.service'; // 🔊 Importado

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
export class EntrenamientoComponent implements OnInit, OnDestroy {
  // Objeto de configuración con tipado
  public configuracion: ConfiguracionEntrenamiento;

  cargando: boolean = false;
  tematicaInvalida: boolean = false;

  sugerenciasTematicas: string[] = [
    'deportes', 'historia', 'ciencia', 'música',
    'cine', 'tecnología', 'cocina', 'arte'
  ];

  motoresIA = [
    { nombre: 'Groq (Llama 3)', icono: '⚡', estado: 'Plan A (Principal)', color: '#01BA9A' },
    { nombre: 'Cohere', icono: '🧡', estado: 'Plan B (Estable)', color: '#FB8C00' },
    { nombre: 'HF Llama', icono: '🦙', estado: 'Plan C (Respaldo)', color: '#00BCD4' },
    { nombre: 'OpenRouter', icono: '🧠', estado: 'Plan D (Emergencia)', color: '#FF508C' }
  ];

  constructor(
    private router: Router,
    private authService: FirebaseAuthService,
    private http: HttpClient,
    private audioService: AudioService // Inyectado
  ) { 
    // Inicialización con Proxy para capturar cambios en la UI y disparar sonidos
    const dataInicial: ConfiguracionEntrenamiento = {
      tematica: '',
      dificultad: ''
    };

    this.configuracion = new Proxy(dataInicial, {
      set: (target, prop, value) => {
        //  Sonar click si cambia la dificultad en el radio button/select
        if (prop === 'dificultad' && value !== target.dificultad && value !== '') {
          this.audioService.play('click');
        }
        (target as any)[prop] = value;
        return true;
      }
    });
  }

  ngOnInit() {
    // Iniciar música de ambiente al entrar a la configuración
    this.audioService.playFondo();
  }

  ngOnDestroy() {
    // Detener música al salir del componente
    this.audioService.stopFondo();
  }

  seleccionarSugerencia(sugerencia: string) {
    this.configuracion.tematica = sugerencia;
    this.audioService.play('click'); // Feedback al tocar 
  }

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
    this.audioService.play('click'); // Click al presionar el botón de inicio

    if (!this.esConfiguracionValida()) return;

    this.cargando = true;

    try {
      console.log('🤖 Generando preguntas de entrenamiento...');
      const response = await firstValueFrom(
        this.http.post<any>(`${environment.apiUrl}/games/generate-questions`, {
          tematicas: [this.configuracion.tematica],
          dificultad: this.configuracion.dificultad
        })
      );

      if (response && response.success) {
        // 🔊 Detener música de menú antes de entrar a la arena
        this.audioService.stopFondo();
        
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