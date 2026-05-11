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
  templateUrl: './control.html',
  styleUrls: ['./control.scss']
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
    this.actualizarEstado();
    
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      const hiddenRoutes = ['/', '/login'];
      this.showControl = !hiddenRoutes.includes(event.urlAfterRedirects);
      this.actualizarEstado();
    });
  }

  // control.component.ts - Modificar actualizarEstado
actualizarEstado() {
  // Usar setTimeout para evitar ExpressionChangedAfterItHasBeenCheckedError
  setTimeout(() => {
    this.volumenEfectos = this.audioService.getVolumenEfectos();
    this.volumenMusica = this.audioService.getVolumenMusica();
    this.efectosActivos = this.audioService.isAudioActivo();
    this.musicaActiva = this.audioService.isMusicaActiva();
  }, 0);
}

  ngOnDestroy() {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  togglePanel() {
    this.showPanel = !this.showPanel;
  }

  closePanel() {
    this.showPanel = false;
  }

  cambiarVolumenEfectos(event: any) {
    this.volumenEfectos = event.target.value;
    this.audioService.setVolumenEfectos(this.volumenEfectos);
  }

  cambiarVolumenMusica(event: any) {
    this.volumenMusica = event.target.value;
    this.audioService.setVolumenMusica(this.volumenMusica);
  }

  toggleEfectos() {
    this.audioService.toggleEfectos();
    setTimeout(() => {
      this.efectosActivos = this.audioService.isAudioActivo();
    }, 50);
  }

  toggleMusica() {
      console.log('=== TOGGLE MUSICA ===');
  console.log('Estado actual musicaActiva ANTES:', this.musicaActiva);
    this.audioService.toggleMusica();
    setTimeout(() => {
      this.musicaActiva = this.audioService.isMusicaActiva();
      this.volumenMusica = this.audioService.getVolumenMusica();
    }, 100);
  }
}