import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private sonidos: { [key: string]: HTMLAudioElement } = {};
  private audioActivo: boolean = true;
  private fondoSonando: string | null = null;
  private fadeInterval: any = null;

  constructor() {
    this.cargarSonidos();
  }

  private cargarSonidos() {
    this.sonidos = {
      // Efectos cortos - Usando ruta absoluta para evitar problemas con rutas de Angular
      correcto: this.crearAudio('/audio/correcto.wav', 1),
      incorrecto: this.crearAudio('/audio/incorrecto.wav', 1),
      click: this.crearAudio('/audio/click.wav', 0.8),

      // Música de fondo
      fondo: this.crearAudio('/audio/fondo-entrenamiento.mp3', 0.3, true),
      arena: this.crearAudio('/audio/fondo-arena.mp3', 0.25, true) 
    };
  }

  /**
   * Crea y configura el objeto de audio con ajustes para producción
   */
  private crearAudio(src: string, volumen: number = 1, loop: boolean = false): HTMLAudioElement {
    const audio = new Audio();
    
    // 1. Configurar CORS (Crucial para archivos en hosting externo o AWS)
    audio.crossOrigin = 'anonymous';
    
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
        .catch(err => console.warn('Esperando interacción del usuario para iniciar música:', err));
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