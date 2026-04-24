import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';

@Component({
  selector: 'app-splash',
  templateUrl: './splash.html',
  styleUrls: ['./splash.scss'],
  standalone: true,
  imports: [CommonModule]
})
export class SplashComponent implements OnInit, OnDestroy {
  progress = 0;
  private progressInterval: any;

  constructor(
    private readonly router: Router,
    private readonly authService: FirebaseAuthService
  ) { }

  ngOnInit(): void {
    // La barra tarda 3500ms en llegar al 100%
    // Luego espera 300ms mostrando el 100% antes de navegar
    const TOTAL_DURATION = 3500;
    const STEPS = 100;
    const stepTime = TOTAL_DURATION / STEPS;

    this.progressInterval = setInterval(() => {
      if (this.progress < 100) {
        this.progress++;
      } else {
        clearInterval(this.progressInterval);
        // Breve pausa para mostrar la barra completa antes de navegar
        setTimeout(() => {
          const isAuthenticated = this.authService.isAuthenticated$();
          if (isAuthenticated) {
            this.router.navigate(['/dashboard'], { replaceUrl: true });
          } else {
            this.router.navigate(['/login'], { replaceUrl: true });
          }
        }, 400);
      }
    }, stepTime);
  }

  ngOnDestroy(): void {
    clearInterval(this.progressInterval);
  }
}
