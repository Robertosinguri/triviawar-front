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
  showImageModal: boolean = false; // Inicializa en false

  openImageModal(): void {
    this.showImageModal = true;
    console.log('Modal abierto:', this.showImageModal); // 🔍 Debug
  }

  closeImageModal(): void {
    this.showImageModal = false;
    console.log('Modal cerrado:', this.showImageModal); // 🔍 Debug
  }
}
