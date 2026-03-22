import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
//import { BackgroundComponent } from '../background/background';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';

/**
* Componente de pantalla de bienvenida (splash screen)
* Muestra la animación de carga y redirige automáticamente al login
*/

@Component({
  selector: 'app-splash',
  templateUrl: './splash.html',
  styleUrls: ['./splash.scss'],
  standalone: true,
  imports: [CommonModule]
})

export class SplashComponent implements OnInit {
  constructor(
    private readonly router: Router,
    private readonly authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    // Esperar un momento para que el servicio de auth termine de verificar
    setTimeout(() => {
      const isAuthenticated = this.authService.isAuthenticated$();
      if (isAuthenticated) {
        this.router.navigate(['/dashboard'], { replaceUrl: true });
      } else {
        this.router.navigate(['/login'], { replaceUrl: true });
      }
    }, 4000); // Tiempo unificado de 4 segundos con la barra de carga
  }
}
