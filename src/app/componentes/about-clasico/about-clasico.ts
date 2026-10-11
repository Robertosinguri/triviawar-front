import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { environment } from '../../../environments/environment';

const BASE = environment.mediaUrl || '';

/**
 * About original, conservado tal cual estaba.
 *
 * Ya no es la página que abre el enlace del menú: quedó guardado acá para no
 * perder el contenido. Se puede ver entrando a /about-clasico.
 */
@Component({
  selector: 'app-about-clasico',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './about-clasico.html',
  styleUrl: './about-clasico.scss'
})

export class AboutClasicoComponent {
  showImageModal: boolean = false;
  selectedImage: number | null = null;

  teamMembers = [
    { src: BASE + '/avatares/anto.webp', alt: 'Miembro del equipo MVPP 1' },
    { src: BASE + '/avatares/gera.webp', alt: 'Miembro del equipo MVPP 2' },
    { src: BASE + '/avatares/robert.webp', alt: 'Miembro del equipo MVPP 3' },
    { src: BASE + '/avatares/jesi.webp', alt: 'Miembro del equipo MVPP 4' },    
    { src: BASE + '/avatares/ari.webp', alt: 'Miembro del equipo MVPP 5' },
    { src: BASE + '/avatares/equipo.webp', alt: 'Equipo MVPP' },
  ];

  openImageModal(index: number): void {
    this.selectedImage = index;
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
    this.selectedImage = null;
  }


}


