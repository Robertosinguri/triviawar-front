import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavbarComponent } from '../navbar/navbar';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, NavbarComponent],
  templateUrl: './about.html',
  styleUrl: './about.scss'
})

export class AboutComponent {
  showImageModal: boolean = false;

  openImageModal(): void {
    this.showImageModal = true;
  }

  closeImageModal(): void {
    this.showImageModal = false;
  }

  abrirPresentacion(): void {
    // Usamos la URL absoluta para evitar que Angular Router intercepte la navegación
    const url = `${window.location.origin}/presentacion/index.html`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }


}


