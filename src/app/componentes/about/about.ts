import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';
import { environment } from '../../../environments/environment';

const BASE = environment.mediaUrl || '';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})

export class AboutComponent {
  showImageModal: boolean = false;
  selectedImage: number | null = null;

  teamMembers = [
    { src: BASE + '/avatares/equipo-01.webp', alt: 'Miembro del equipo MVPP 1' },
    { src: BASE + '/avatares/equipo-02.webp', alt: 'Miembro del equipo MVPP 2' },
    { src: BASE + '/avatares/equipo-03.webp', alt: 'Miembro del equipo MVPP 3' },
    { src: BASE + '/avatares/equipo-04.webp', alt: 'Miembro del equipo MVPP 4' },
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


