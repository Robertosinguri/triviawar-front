import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private sonidos: { [key: string]: HTMLAudioElement } = {};
  private audioActivo: boolean = true;

  // Control interno para evitar duplicados
  private fondoSonando: string | null = null;
  
  // Referencia al intervalo de fade para poder limpiarlo
  private fadeInterval: any = null;

  constructor() {
    this.cargarSonidos();
  }

  private cargarSonidos() {
    this.sonidos = {
      // Efectos cortos
      correcto: this.crearAudio('/audio/correcto.wav', 1),
      incorrecto: this.crearAudio('/audio/incorrecto.wav', 1),
      click: this.crearAudio('/audio/click.wav', 0.8),

      // Música de fondo Entrenamiento
      fondo: this.crearAudio('/audio/fondo-entrenamiento.mp3', 0.3, true),

      // Música de fondo Arena
      arena: this.crearAudio('/audio/fondo-arena.mp3', 0.25, true) 
    };
  }

  private crearAudio(src: string, volumen: number = 1, loop: boolean = false): HTMLAudioElement {
    const audio = new Audio(src);
    audio.volume = volumen;
    audio.loop = loop;
    audio.load();
    return audio;
  }

  /**
   * Lógica de FADE IN: Sube el volumen gradualmente
   * @param pista El elemento HTMLAudioElement
   * @param volumenFinal El volumen máximo que debe alcanzar
   * @param duracionMs Tiempo en milisegundos que tarda en subir
   */
  private aplicarFadeIn(pista: HTMLAudioElement, volumenFinal: number, duracionMs: number = 3000) {
    // Si ya hay un fade en proceso, lo limpiamos
    if (this.fadeInterval) {
      clearInterval(this.fadeInterval);
    }

    pista.volume = 0;
    const pasos = 30; // Cuántos incrementos haremos
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

  // Reproducir efectos (click, acierto, error)
  play(nombre: string) {
    if (!this.audioActivo) return;
    const sonido = this.sonidos[nombre];
    if (sonido) {
      sonido.pause(); 
      sonido.currentTime = 0; 
      sonido.play().catch(err => console.warn('Error en efecto:', err));
    }
  }

  // Detener un sonido específico
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

  // Detener todo
  stopAll() {
    Object.keys(this.sonidos).forEach(nombre => {
      this.stop(nombre);
    });
  }

  // --- Métodos de Música de Fondo ---
  
  playFondo() {
    this.reproducirMusicaLarga('fondo', 0.3);
  }

  playArena() {
    this.reproducirMusicaLarga('arena', 0.25);
  }

  private reproducirMusicaLarga(nombre: string, volumenObjetivo: number) {
    if (!this.audioActivo) return;
    
    // Si ya está sonando lo que pedimos, no hacer nada
    if (this.fondoSonando === nombre) return;

    // Si hay otra música sonando, la paramos primero
    if (this.fondoSonando) {
      this.stop(this.fondoSonando);
    }

    const pista = this.sonidos[nombre];
    if (pista) {
      // Ponemos el volumen en 0 antes de empezar para el fade
      pista.volume = 0;
      
      pista.play()
        .then(() => {
          this.fondoSonando = nombre;
          // Aplicamos el Fade In en 3 segundos (3000ms)
          this.aplicarFadeIn(pista, volumenObjetivo, 3000);
          console.log(`🎵 Sonando con Fade In: ${nombre}`);
        })
        .catch(err => console.warn('Esperando interacción para música:', err));
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