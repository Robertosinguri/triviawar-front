import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
    private readonly authService: FirebaseAuthService,
    private readonly cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const TOTAL_DURATION = 3500;
    const STEPS = 100;
    const stepTime = TOTAL_DURATION / STEPS; // 35ms por paso

    this.progressInterval = setInterval(() => {
      if (this.progress < 100) {
        this.progress++;
        this.cdr.markForCheck(); // Forzar re-render en cada tick
      } else {
        clearInterval(this.progressInterval);
        this.cdr.markForCheck();
        // Pausa breve para mostrar la barra completa antes de navegar
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
