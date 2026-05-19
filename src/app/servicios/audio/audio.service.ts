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
  
  private musicaDebiaSonarAntesDeNavegar: boolean = false;

  constructor() {
    this.cargarPreferencias();
    this.cargarSonidos();
    this.configurarInteraccionUsuario();
  }



  // audio.service.ts
private rutaActualCache: string = '';

actualizarRutaActual(ruta: string) {
  this.rutaActualCache = ruta;
  
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
    if (!this.musicaActiva) {
      console.log('Musica silenciada globalmente, no se inicia dashboard');
      return;
    }
    
    
    if (!this.musicaDashboardActiva && this.audioActivo && this.musicaActiva) {
      this.musicaDashboardActiva = true;
      this.reproducirMusicaLarga('dashboard', this.volumenMusica);
    }
  }

  detenerMusicaDashboard() {
    this.musicaDashboardActiva = false;
    this.stop('dashboard');
    
  }

  // audio.service.ts
// audio.service.ts
playFondo() {
  
  
  this.detenerMusicaDashboard();
  
  if (this.musicaActiva) {
    this.reproducirMusicaLarga('fondo', this.volumenMusica);
  } else {
    
  }
}

playArena() {
  console.log('=== PLAY ARENA ===');
  console.log('musicaActiva:', this.musicaActiva);
  
  this.detenerMusicaDashboard();
  
  if (this.musicaActiva) {
    this.reproducirMusicaLarga('arena', this.volumenMusica);
  } else {
    
  }
}

  stopFondo() {
    this.stop('fondo');
  }

  stopArena() {
    this.stop('arena');
  }

  // audio.service.ts - Agregar más logs en reproducirMusicaLarga
// audio.service.ts - Modificar reproducirMusicaLarga
private reproducirMusicaLarga(nombre: string, volumenObjetivo: number) {
  
  
  if (!this.audioActivo) {
    
    return;
  }
  
  if (!this.musicaActiva) {
   
    return;
  }
  
  // Eliminar la verificación que causa el problema
  // if (this.fondoSonando === nombre) {
  //   console.log(' Fallo: ya está sonando esta música');
  //   return;
  // }

  if (this.fondoSonando) {
   
    this.stop(this.fondoSonando);
    
  }

  const pista = this.sonidos[nombre];
  if (!pista) {
    
    return;
  }
  
 
  
  // Detener cualquier reproducción previa
  pista.pause();
  pista.currentTime = 0;
  
  pista.volume = 0;
  
  
  pista.play()
    .then(() => {
      this.fondoSonando = nombre;
      this.aplicarFadeIn(pista, volumenObjetivo, 3000);
     
    })
    .catch(err => {
      
    });
}

  isHayMusicaSonando(): boolean {
    return this.fondoSonando !== null;
  }

// audio.service.ts - toggleMusica actualizado
// audio.service.ts - Modificar toggleMusica
toggleMusica() {
  
  this.musicaActiva = !this.musicaActiva;
  
  if (!this.musicaActiva) {
    // Silenciar: pausar la música y LIMPIAR el estado
    if (this.fondoSonando) {
      const pista = this.sonidos[this.fondoSonando];
      if (pista && !pista.paused) {
        pista.pause();
        
      }
      //  Limpiar fondoSonando para que al reactivar no hay música
      this.fondoSonando = null;
    
    }
    // También limpiar musicaDashboardActiva
    this.musicaDashboardActiva = false;
  } else {
    // Reactivar: forzar reanudación con un pequeño delay
    setTimeout(() => {
      console.log('Reanudando música después de toggle...');
      this.fondoSonando = null; //  Asegurar que está limpio
      this.reanudarMusicaContexto();
    }, 100);
  }
  
 
  this.guardarPreferencias();
}

  // audio.service.ts - Método reanudarMusicaContexto
// audio.service.ts - Método reanudarMusicaContexto corregido para hash routing
// audio.service.ts - reanudarMusicaContexto modificado
// audio.service.ts - Modificar reanudarMusicaContexto
reanudarMusicaContexto() {
  if (!this.musicaActiva) {
    
    return;
  }
  
  if (!this.audioActivo) return;
  
  // Limpiar estado antes de reanudar
  if (this.fondoSonando) {
    
    this.fondoSonando = null;
  }
  
  // Usar ruta cacheada primero, luego fallback al hash
  let rutaActual = this.rutaActualCache;
  
  if (!rutaActual) {
    const hash = window.location.hash;
    rutaActual = hash.replace('#', '').split('?')[0];
  }
 
  
  const rutasSinMusica = ['/', '/login'];
  if (rutasSinMusica.includes(rutaActual)) {
    
    return;
  }
  
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
  } else if (rutaActual === '/resultados') {
    
  }
}
  // audio.service.ts
// audio.service.ts
guardarEstadoMusicaAntesDeNavegar() {
  // Obtener ruta desde el hash
  const hash = window.location.hash;
  const rutaActual = hash.replace('#', '').split('?')[0];
  const rutasSinMusica = ['/', '/login'];
  
  if (rutasSinMusica.includes(rutaActual)) {
    this.musicaDebiaSonarAntesDeNavegar = false;
    
  } else {
    this.musicaDebiaSonarAntesDeNavegar = this.fondoSonando !== null && this.musicaActiva;
    
  }
}

  reanudarMusicaDashboardSiDebia() {
    if (this.musicaDebiaSonarAntesDeNavegar && this.audioActivo && this.musicaActiva) {
     
      this.musicaDashboardActiva = true;
      this.reproducirMusicaLarga('dashboard', this.volumenMusica);
      this.musicaDebiaSonarAntesDeNavegar = false;
      return true;
    }
    return false;
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

  toggleEfectos() {
    this.audioActivo = !this.audioActivo;
    
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
       
        this.autoPlayDesbloqueado = true;
        this.reanudarMusicaContexto();
      }).catch(err => {
        console.warn('No se pudo desbloquear audio:', err);
      });
    }
  }

  // ==================== PERSISTENCIA ====================

  private cargarPreferencias() {
    const guardado = localStorage.getItem('audio_preferencias');
    if (guardado) {
      try {
        const preferencias = JSON.parse(guardado);
        
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
        
        this.guardarPreferencias();
        
      } catch (e) {
        
        this.resetearPreferencias();
      }
    } else {
      
      this.resetearPreferencias();
    }
  }

  private validarVolumen(volumen: any, valorPorDefecto: number): number {
    if (volumen === undefined || volumen === null || isNaN(volumen)) {
      return valorPorDefecto;
    }
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
    
  }

  private guardarPreferencias() {
    const preferencias = {
      audioActivo: this.audioActivo === true,
      musicaActiva: this.musicaActiva === true,
      volumenEfectos: this.validarVolumen(this.volumenEfectos, 0.7),
      volumenMusica: this.validarVolumen(this.volumenMusica, 0.35),
      musicaDashboardActiva: this.musicaDashboardActiva === true,
      musicaDebiaSonarAntesDeNavegar: this.musicaDebiaSonarAntesDeNavegar === true
    };
    localStorage.setItem('audio_preferencias', JSON.stringify(preferencias));
   
  }
}