import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { FirebaseAuthService } from './servicios/auth/firebase-auth.service';

export const authGuard = () => {
  const authService = inject(FirebaseAuthService);
  const router = inject(Router);

  if (authService.isAuthenticated$()) {
    return true;
  } else {
    router.navigate(['/login']);
    return false;
  }
};