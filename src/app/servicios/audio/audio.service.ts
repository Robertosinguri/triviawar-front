import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private sonidos: { [key: string]: HTMLAudioElement } = {};
  private audioActivo: boolean = true;
  private fondoSonando: string | null = null;
  private fadeInterval: any = null;
  private usuarioInteractuo: boolean = false;
  
  // Controla si la música del dashboard debe estar sonando globalmente
  private musicaDashboardActiva: boolean = false;

  constructor() {
    this.cargarSonidos();
    this.configurarInteraccionUsuario();
  }

  private configurarInteraccionUsuario() {
    // Marcar que el usuario ha interactuado cuando hace clic en cualquier parte
    document.addEventListener('click', () => {
      this.usuarioInteractuo = true;
    }, { once: true }); // Solo necesitamos el primer clic
  }

  private cargarSonidos() {
    // Estrategia robusta para rutas de audio que funcione en cualquier entorno
    // Ahora usa las rutas de API del backend
    const getAudioPath = (filename: string): string => {
      // Usar la URL base de la API desde environment
      const apiBaseUrl = environment.apiUrl.replace(/\/$/, ''); // Remover trailing slash si existe
      const audioUrl = `${apiBaseUrl}/audio/${filename}`;
      
      console.log(`🎵 Ruta de audio API para ${filename}: ${audioUrl}`);
      return audioUrl;
    };
    
    this.sonidos = {
      // Efectos cortos - Archivos servidos por API del backend
      correcto: this.crearAudio(getAudioPath('correcto.wav'), 1),
      incorrecto: this.crearAudio(getAudioPath('incorrecto.wav'), 1),
      click: this.crearAudio(getAudioPath('click.wav'), 0.8),
      resultados: this.crearAudio(getAudioPath('resultados.mp3'), 0.7),

      // Música de fondo
      fondo: this.crearAudio(getAudioPath('fondo.mp3'), 0.3, true),
      arena: this.crearAudio(getAudioPath('fondo-arena.mp3'), 0.25, true),
      dashboard: this.crearAudio(getAudioPath('fondo-dashboard.mp3'), 0.25, true)
    };
    
    console.log('🎵 AudioService cargado con rutas de API. Rutas de audio:');
    Object.keys(this.sonidos).forEach(key => {
      console.log(`  ${key}: ${this.sonidos[key].src}`);
    });
  }

  /**
   * Crea y configura el objeto de audio con ajustes para producción
   */
  private crearAudio(src: string, volumen: number = 1, loop: boolean = false): HTMLAudioElement {
    const audio = new Audio();
    
    // 2. Preload en 'auto' fuerza al navegador a intentar la descarga de inmediato
    audio.preload = 'auto';
    
    // 3. Asignamos los parámetros básicos
    audio.src = src;
    audio.volume = volumen;
    audio.loop = loop;

    // Ejecutamos load() para que aparezca en la pestaña Network de inmediato
    audio.load();
    
    return audio;
  }

  private aplicarFadeIn(pista: HTMLAudioElement, volumenFinal: number, duracionMs: number = 3000) {
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    pista.volume = 0;
    const pasos = 30;
    const incremento = volumenFinal / pasos;
    const intervaloTiempo = duracionMs / pasos;

    this.fadeInterval = setInterval(() => {
      if (pista.volume + incremento < volumenFinal) {
        pista.volume += incremento;
      } else {
        pista.volume = volumenFinal;
        clearInterval(this.fadeInterval);
        this.fadeInterval = null;
      }
    }, intervaloTiempo);
  }

  play(nombre: string) {
    if (!this.audioActivo) return;
    const sonido = this.sonidos[nombre];
    if (sonido) {
      sonido.pause(); 
      sonido.currentTime = 0; 
      sonido.play().catch(err => console.warn(`Error en efecto [${nombre}]:`, err));
    }
  }

  stop(nombre: string) {
    const sonido = this.sonidos[nombre];
    if (sonido) {
      sonido.pause();
      sonido.currentTime = 0;
      if (this.fondoSonando === nombre) {
        this.fondoSonando = null;
        if (this.fadeInterval) {
          clearInterval(this.fadeInterval);
          this.fadeInterval = null;
        }
      }
    }
  }

  stopAll() {
    Object.keys(this.sonidos).forEach(nombre => {
      this.stop(nombre);
    });
  }

  /**
   * Verifica si hay alguna música de fondo sonando actualmente
   */
  isHayMusicaSonando(): boolean {
    return this.fondoSonando !== null;
  }

  /**
   * Inicia la música de fondo del dashboard
   * Esta música continuará sonando entre componentes (dashboard, ranking, about)
   */
  iniciarMusicaDashboard() {
    if (!this.musicaDashboardActiva && this.audioActivo) {
      this.musicaDashboardActiva = true;
      this.reproducirMusicaLarga('dashboard', 0.25);
    }
  }

  /**
   * Detiene la música de fondo del dashboard
   * Útil cuando se navega a componentes como entrenamiento o crear sala
   */
  detenerMusicaDashboard() {
    this.musicaDashboardActiva = false;
    this.stop('dashboard');
  }

  /**
   * Reproduce música de fondo del entrenamiento
   * Automáticamente detiene la música del dashboard
   */
  playFondo() {
    this.detenerMusicaDashboard();
    this.reproducirMusicaLarga('fondo', 0.3);
  }

  /**
   * Reproduce música de fondo de la arena
   * Automáticamente detiene la música del dashboard
   */
  playArena() {
    this.detenerMusicaDashboard();
    this.reproducirMusicaLarga('arena', 0.25);
  }

  /**
   * Reproduce la música del dashboard (uso directo)
   * @deprecated Usar iniciarMusicaDashboard() en su lugar
   */
  playFondoDashboard() {
    this.reproducirMusicaLarga('dashboard', 0.25);
  }

  private reproducirMusicaLarga(nombre: string, volumenObjetivo: number) {
    if (!this.audioActivo) return;
    if (this.fondoSonando === nombre) return;

    if (this.fondoSonando) {
      this.stop(this.fondoSonando);
    }

    const pista = this.sonidos[nombre];
    if (pista) {
      pista.volume = 0;
      pista.play()
        .then(() => {
          this.fondoSonando = nombre;
          this.aplicarFadeIn(pista, volumenObjetivo, 3000);
          console.log(`🎵 Sonando con Fade In: ${nombre}`);
        })
        .catch(err => {
          console.warn('Esperando interacción del usuario para iniciar música:', err);
          // Intentar de nuevo después de que el usuario interactúe
          if (!this.usuarioInteractuo) {
            const intentarDeNuevo = () => {
              this.usuarioInteractuo = true;
              this.reproducirMusicaLarga(nombre, volumenObjetivo);
              document.removeEventListener('click', intentarDeNuevo);
            };
            document.addEventListener('click', intentarDeNuevo, { once: true });
          }
        });
    }
  }

  stopFondo() {
    this.stop('fondo');
  }

  stopArena() {
    this.stop('arena');
  }

  stopFondoDashboard() {
    this.musicaDashboardActiva = false;
    this.stop('dashboard');
  }

  toggleAudio() {
    this.audioActivo = !this.audioActivo;
    if (!this.audioActivo) {
      this.stopAll();
      this.musicaDashboardActiva = false;
    } else if (this.musicaDashboardActiva) {
      // Si se reactiva el audio y dashboard debería sonar, lo reiniciamos
      this.iniciarMusicaDashboard();
    }
  }

  isAudioActivo(): boolean {
    return this.audioActivo;
  }
}