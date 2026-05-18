import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AudioService } from '../../servicios/audio/audio.service';

@Component({
  selector: 'app-control',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './control.html',  // Tu archivo se llama control.html
  styleUrls: ['./control.scss']    // Tu archivo se llama control.scss
})
export class ControlComponent implements OnInit, OnDestroy {
  showPanel: boolean = false;
  showControl: boolean = true;
  private routerSubscription: Subscription = new Subscription();
  
  volumenEfectos: number = 0.6;
  volumenMusica: number = 0.25;
  efectosActivos: boolean = true;
  musicaActiva: boolean = true;

  constructor(
    private audioService: AudioService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('ControlComponent iniciado');
    this.actualizarEstado();
    
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const hiddenRoutes = ['/', '/login'];
      this.showControl = !hiddenRoutes.includes(event.urlAfterRedirects);
      this.actualizarEstado();
    });
  }

  actualizarEstado() {
    setTimeout(() => {
      this.volumenEfectos = this.audioService.getVolumenEfectos();
      this.volumenMusica = this.audioService.getVolumenMusica();
      this.efectosActivos = this.audioService.isAudioActivo();
      this.musicaActiva = this.audioService.isMusicaActiva();
      
      console.log('Estado actualizado:', {
        efectosActivos: this.efectosActivos,
        musicaActiva: this.musicaActiva,
        volumenEfectos: this.volumenEfectos,
        volumenMusica: this.volumenMusica
      });
    }, 100);
  }

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  togglePanel() {
    this.showPanel = !this.showPanel;
    console.log('Panel toggled:', this.showPanel);
  }

  closePanel() {
    this.showPanel = false;
    console.log('Panel cerrado');
  }

  cambiarVolumenEfectos(event: any) {
    this.volumenEfectos = event.target.value;
    this.audioService.setVolumenEfectos(this.volumenEfectos);
    console.log('Volumen efectos cambiado:', this.volumenEfectos);
  }

  cambiarVolumenMusica(event: any) {
    this.volumenMusica = event.target.value;
    this.audioService.setVolumenMusica(this.volumenMusica);
    console.log('Volumen musica cambiado:', this.volumenMusica);
  }

  toggleEfectos() {
    console.log('Toggle efectos - estado actual:', this.efectosActivos);
    this.audioService.toggleEfectos();
    setTimeout(() => {
      this.efectosActivos = this.audioService.isAudioActivo();
      console.log('Toggle efectos - nuevo estado:', this.efectosActivos);
    }, 100);
  }

  toggleMusica() {
    console.log('Toggle musica - estado actual:', this.musicaActiva);
    this.audioService.toggleMusica();
    setTimeout(() => {
      this.musicaActiva = this.audioService.isMusicaActiva();
      this.volumenMusica = this.audioService.getVolumenMusica();
      console.log('Toggle musica - nuevo estado:', this.musicaActiva);
    }, 100);
  }
}