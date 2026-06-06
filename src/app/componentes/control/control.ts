import { Component, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
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
  @Input() inline: boolean = false;
  showPanel: boolean = false;
  showControl: boolean = false;
  private routerSubscription: Subscription = new Subscription();
  
  volumenEfectos: number = 0.6;
  volumenMusica: number = 0.25;
  efectosActivos: boolean = true;
  musicaActiva: boolean = true;

  constructor(
    private audioService: AudioService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    const hiddenRoutes = ['/', '/login'];
    this.showControl = !hiddenRoutes.includes(this.router.url);
    this.actualizarEstado();
    
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.showControl = !hiddenRoutes.includes(event.urlAfterRedirects);
      this.actualizarEstado();
    });
  }

  actualizarEstado() {
    this.volumenEfectos = this.audioService.getVolumenEfectos();
    this.volumenMusica = this.audioService.getVolumenMusica();
    this.efectosActivos = this.audioService.isAudioActivo();
    this.musicaActiva = this.audioService.isMusicaActiva();
    this.cdr.detectChanges();
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
    this.efectosActivos = this.audioService.isAudioActivo();
    if (this.efectosActivos) {
      this.audioService.play('click'); // Feedback sonoro instantáneo
    }
  }

  toggleMusica() {
    this.audioService.toggleMusica();
    this.musicaActiva = this.audioService.isMusicaActiva();
    this.volumenMusica = this.audioService.getVolumenMusica();
    if (this.efectosActivos) {
      this.audioService.play('click'); // Feedback sonoro instantáneo
    }
  }
}