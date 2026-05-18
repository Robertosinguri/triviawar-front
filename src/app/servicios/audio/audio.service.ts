import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AudioService {

  private sonidos: { [key: string]: HTMLAudioElement } = {};
  private audioActivo: boolean = true;
  private musicaActiva: boolean = true;
  private volumenEfectos: number = 0.6;
  private volumenMusica: number = 0.25;
  private fondoSonando: string | null = null;
  private fadeInterval: any = null;
  private usuarioInteractuo: boolean = false;
  private musicaDashboardActiva: boolean = false;
  private autoPlayDesbloqueado: boolean = false;
  
  // Nueva propiedad para guardar el estado antes de navegar
  private musicaDebiaSonarAntesDeNavegar: boolean = false;

  constructor() {
    this.cargarPreferencias();
    this.cargarSonidos();
    this.configurarInteraccionUsuario();
  }

  private configurarInteraccionUsuario() {
    document.addEventListener('click', () => {
      this.usuarioInteractuo = true;
    }, { once: true });
  }

  private cargarSonidos() {
    const getAudioPath = (filename: string): string => {
      const apiBaseUrl = environment.apiUrl.replace(/\/$/, '');
      const audioUrl = `${apiBaseUrl}/audio/${filename}`;
      console.log(`Ruta de audio API para ${filename}: ${audioUrl}`);
      return audioUrl;
    };
    
    this.sonidos = {
      correcto: this.crearAudio(getAudioPath('correcto.wav'), this.volumenEfectos),
      incorrecto: this.crearAudio(getAudioPath('incorrecto.wav'), this.volumenEfectos),
      click: this.crearAudio(getAudioPath('click.wav'), this.volumenEfectos),
      resultados: this.crearAudio(getAudioPath('resultados.mp3'), this.volumenEfectos),
      fondo: this.crearAudio(getAudioPath('fondo.mp3'), this.volumenMusica, true),
      arena: this.crearAudio(getAudioPath('fondo-arena.mp3'), this.volumenMusica, true),
      dashboard: this.crearAudio(getAudioPath('fondo-dashboard.mp3'), this.volumenMusica, true)
    };
    
    console.log('AudioService cargado');
  }

  private crearAudio(src: string, volumen: number = 1, loop: boolean = false): HTMLAudioElement {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = src;
    audio.volume = volumen;
    audio.loop = loop;
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

  // ==================== METODOS PUBLICOS ====================

  play(nombre: string) {
    if (!this.audioActivo) return;
    const sonido = this.sonidos[nombre];
    if (sonido) {
      sonido.volume = this.volumenEfectos;
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

  // ==================== MUSICA DE FONDO ====================

  iniciarMusicaDashboard() {
    console.log('iniciarMusicaDashboard llamado');
    console.log('musicaDashboardActiva antes:', this.musicaDashboardActiva);
    console.log('musicaActiva antes:', this.musicaActiva);
    
    if (!this.musicaActiva) {
      this.musicaActiva = true;
    }
    
    if (!this.musicaDashboardActiva && this.audioActivo && this.musicaActiva) {
      this.musicaDashboardActiva = true;
      this.reproducirMusicaLarga('dashboard', this.volumenMusica);
    }
  }

  detenerMusicaDashboard() {
    // Guardar que la música debería sonar antes de detenerla
    this.musicaDebiaSonarAntesDeNavegar = this.musicaDashboardActiva;
    this.musicaDashboardActiva = false;
    this.stop('dashboard');
    console.log('Musica dashboard detenida, estado guardado:', this.musicaDebiaSonarAntesDeNavegar);
  }

  // Guardar estado antes de navegar (para componentes que no tienen música propia)
  guardarEstadoMusicaAntesDeNavegar() {
    this.musicaDebiaSonarAntesDeNavegar = this.musicaActiva && this.musicaDashboardActiva;
    console.log('Estado de musica guardado antes de navegar:', this.musicaDebiaSonarAntesDeNavegar);
  }

  // Reanudar música si debía sonar (al volver al dashboard)
  reanudarMusicaDashboardSiDebia() {
    if (this.musicaDebiaSonarAntesDeNavegar && this.audioActivo && this.musicaActiva) {
      console.log('Reanudando musica dashboard porque debia sonar');
      this.musicaDashboardActiva = true;
      this.reproducirMusicaLarga('dashboard', this.volumenMusica);
      this.musicaDebiaSonarAntesDeNavegar = false;
      return true;
    }
    return false;
  }

  playFondo() {
    this.detenerMusicaDashboard();
    this.reproducirMusicaLarga('fondo', this.volumenMusica);
  }

  stopFondo() {
    this.stop('fondo');
  }

  playArena() {
    this.detenerMusicaDashboard();
    this.reproducirMusicaLarga('arena', this.volumenMusica);
  }

  stopArena() {
    this.stop('arena');
  }

  private reproducirMusicaLarga(nombre: string, volumenObjetivo: number) {
    console.log('reproducirMusicaLarga llamado para:', nombre);
    console.log('audioActivo:', this.audioActivo);
    console.log('musicaActiva:', this.musicaActiva);
    
    if (!this.audioActivo) return;
    
    if (!this.musicaActiva) {
      console.log('Forzando musicaActiva a true');
      this.musicaActiva = true;
    }
    
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
          console.log(`Sonando con Fade In: ${nombre}`);
        })
        .catch(err => {
          console.warn('Esperando interacción del usuario para iniciar música:', err);
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

  isHayMusicaSonando(): boolean {
    return this.fondoSonando !== null;
  }

  reanudarMusicaContexto() {
    if (!this.musicaActiva) return;
    if (!this.audioActivo) return;
    
    const rutaActual = window.location.pathname;
    console.log('Reanudando musica para ruta:', rutaActual);
    
    if (rutaActual === '/dashboard' || rutaActual === '/ranking' || rutaActual === '/about') {
      this.musicaDashboardActiva = true;
      this.reproducirMusicaLarga('dashboard', this.volumenMusica);
    } else if (rutaActual === '/entrenamiento') {
      this.reproducirMusicaLarga('fondo', this.volumenMusica);
    } else if (rutaActual === '/arena') {
      this.reproducirMusicaLarga('arena', this.volumenMusica);
    } else if (rutaActual === '/crear-sala' || rutaActual === '/unirse-sala') {
      this.reproducirMusicaLarga('fondo', this.volumenMusica);
    } else if (rutaActual === '/lobby') {
      this.reproducirMusicaLarga('fondo', this.volumenMusica);
    }
  }

  // ==================== CONTROL DE AUDIO ====================

  getVolumenEfectos(): number {
    return this.volumenEfectos;
  }

  getVolumenMusica(): number {
    return this.volumenMusica;
  }

  isAudioActivo(): boolean {
    return this.audioActivo;
  }

  isMusicaActiva(): boolean {
    return this.musicaActiva;
  }

  setVolumenEfectos(volumen: number) {
    this.volumenEfectos = Math.max(0, Math.min(1, volumen));
    this.guardarPreferencias();
    
    const efectos = ['correcto', 'incorrecto', 'click', 'resultados'];
    efectos.forEach(nombre => {
      const sonido = this.sonidos[nombre];
      if (sonido) {
        sonido.volume = this.volumenEfectos;
      }
    });
  }

  setVolumenMusica(volumen: number) {
    this.volumenMusica = Math.max(0, Math.min(1, volumen));
    this.guardarPreferencias();
    
    if (this.fondoSonando) {
      const pista = this.sonidos[this.fondoSonando];
      if (pista) {
        pista.volume = this.volumenMusica;
      }
    }
  }
   
    // audio.service.ts - Métodos toggle corregidos

toggleEfectos() {
  this.audioActivo = !this.audioActivo;
  console.log('Toggle efectos - nuevo estado:', this.audioActivo);
  this.guardarPreferencias();
}

toggleMusica() {
  console.log('=== TOGGLE MUSICA ===');
  console.log('musicaActiva ANTES:', this.musicaActiva);
  
  this.musicaActiva = !this.musicaActiva;
  
  if (!this.musicaActiva) {
    // Silenciar: pausar toda la música
    if (this.fondoSonando) {
      const pista = this.sonidos[this.fondoSonando];
      if (pista && !pista.paused) {
        pista.pause();
        console.log('Musica pausada');
      }
    }
  } else {
    // Reactivar: reanudar música
    if (this.fondoSonando) {
      const pista = this.sonidos[this.fondoSonando];
      if (pista && pista.paused) {
        pista.volume = this.volumenMusica;
        pista.play().then(() => {
          console.log('Musica reanudada:', this.fondoSonando);
        }).catch(err => {
          console.warn('Error al reanudar musica:', err);
          this.reanudarMusicaContexto();
        });
      }
    } else {
      this.reanudarMusicaContexto();
    }
  }
  
  console.log('musicaActiva DESPUES:', this.musicaActiva);
  this.guardarPreferencias();
}

 
  toggleAudio() {
    this.audioActivo = !this.audioActivo;
    if (!this.audioActivo) {
      this.stopAll();
    } else if (this.musicaDashboardActiva) {
      this.reanudarMusicaContexto();
    }
    this.guardarPreferencias();
  }

  // ==================== AUTOPLAY ====================

  iniciarAutoPlay() {
    if (this.autoPlayDesbloqueado) return;
    
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContext) {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0;
      gain.connect(context.destination);
      
      const buffer = context.createBuffer(1, 1, 22050);
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(gain);
      source.start(0);
      
      context.resume().then(() => {
        console.log('Audio desbloqueado exitosamente');
        this.autoPlayDesbloqueado = true;
        this.reanudarMusicaContexto();
      }).catch(err => {
        console.warn('No se pudo desbloquear audio:', err);
      });
    }
  }

  // ==================== PERSISTENCIA ====================
// audio.service.ts - Métodos corregidos

private cargarPreferencias() {
  const guardado = localStorage.getItem('audio_preferencias');
  if (guardado) {
    try {
      const preferencias = JSON.parse(guardado);
      
      // Validar y corregir valores antes de aplicarlos
      this.audioActivo = preferencias.audioActivo === undefined ? true : preferencias.audioActivo;
      this.musicaActiva = preferencias.musicaActiva === undefined ? true : preferencias.musicaActiva;
      this.volumenEfectos = this.validarVolumen(preferencias.volumenEfectos, 0.7);
      this.volumenMusica = this.validarVolumen(preferencias.volumenMusica, 0.35);
      this.musicaDashboardActiva = preferencias.musicaDashboardActiva === undefined ? false : preferencias.musicaDashboardActiva;
      this.musicaDebiaSonarAntesDeNavegar = preferencias.musicaDebiaSonarAntesDeNavegar === undefined ? false : preferencias.musicaDebiaSonarAntesDeNavegar;
      
      console.log('Preferencias cargadas y validadas:', {
        audioActivo: this.audioActivo,
        musicaActiva: this.musicaActiva,
        volumenEfectos: this.volumenEfectos,
        volumenMusica: this.volumenMusica
      });
      
      // Si algún valor estaba corrupto, guardar los valores corregidos
      this.guardarPreferencias();
      
    } catch (e) {
      console.error('Error cargando preferencias, usando valores por defecto:', e);
      this.resetearPreferencias();
    }
  } else {
    console.log('No hay preferencias guardadas, usando valores por defecto');
    this.resetearPreferencias();
  }
}

private validarVolumen(volumen: any, valorPorDefecto: number): number {
  if (volumen === undefined || volumen === null || isNaN(volumen)) {
    return valorPorDefecto;
  }
  // Asegurar que esté entre 0 y 1
  return Math.max(0, Math.min(1, volumen));
}

private resetearPreferencias() {
  this.audioActivo = true;
  this.musicaActiva = true;
  this.volumenEfectos = 0.7;
  this.volumenMusica = 0.35;
  this.musicaDashboardActiva = false;
  this.musicaDebiaSonarAntesDeNavegar = false;
  this.guardarPreferencias();
  console.log('Preferencias reseteadas a valores por defecto');
}

private guardarPreferencias() {
  // Solo guardar si los valores son válidos
  const preferencias = {
    audioActivo: this.audioActivo === true,
    musicaActiva: this.musicaActiva === true,
    volumenEfectos: this.validarVolumen(this.volumenEfectos, 0.7),
    volumenMusica: this.validarVolumen(this.volumenMusica, 0.35),
    musicaDashboardActiva: this.musicaDashboardActiva === true,
    musicaDebiaSonarAntesDeNavegar: this.musicaDebiaSonarAntesDeNavegar === true
  };
  localStorage.setItem('audio_preferencias', JSON.stringify(preferencias));
  console.log('Preferencias guardadas correctamente:', preferencias);
}
}