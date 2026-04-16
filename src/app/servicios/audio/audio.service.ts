import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private sonidos: { [key: string]: HTMLAudioElement } = {};
  private audioActivo: boolean = true;
  private fondoSonando: string | null = null;
  private fadeInterval: any = null;
  private usuarioInteractuo: boolean = false;

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
    const getAudioPath = (filename: string): string => {
      // Probar diferentes estrategias de rutas
      const baseHref = document.querySelector('base')?.getAttribute('href') || '/';
      const basePath = baseHref.endsWith('/') ? baseHref.slice(0, -1) : baseHref;
      
      // Estrategias en orden de prioridad:
      const strategies = [
        `./audio/${filename}`,                  // Ruta relativa con punto (funciona mejor)
        `audio/${filename}`,                    // Ruta relativa (funciona en desarrollo)
        `${basePath}/audio/${filename}`,        // Ruta relativa a base href
        `/audio/${filename}`,                   // Ruta absoluta desde raíz
        `/frontend/audio/${filename}`,          // Ruta para producción AWS
      ];
      
      // Devolver la primera estrategia, pero registrar todas para depuración
      const selectedPath = strategies[0];
      console.log(`🎵 Ruta de audio para ${filename}: ${selectedPath} (opciones: ${strategies.join(', ')})`);
      return selectedPath;
    };
    
    this.sonidos = {
      // Efectos cortos - Archivos en public/audio
      correcto: this.crearAudio(getAudioPath('correcto.wav'), 1),
      incorrecto: this.crearAudio(getAudioPath('incorrecto.wav'), 1),
      click: this.crearAudio(getAudioPath('click.wav'), 0.8),

      // Música de fondo
      fondo: this.crearAudio(getAudioPath('fondo-entrenamiento.mp3'), 0.3, true),
      arena: this.crearAudio(getAudioPath('fondo-arena.mp3'), 0.25, true) 
    };
    
    console.log('🎵 AudioService cargado. Rutas de audio:');
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

  playFondo() {
    this.reproducirMusicaLarga('fondo', 0.3);
  }

  playArena() {
    this.reproducirMusicaLarga('arena', 0.25);
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

  toggleAudio() {
    this.audioActivo = !this.audioActivo;
    if (!this.audioActivo) {
      this.stopAll();
    }
  }

  isAudioActivo(): boolean {
    return this.audioActivo;
  }
}