import { ChangeDetectionStrategy, Component, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FirebaseAuthService } from '../../servicios/auth/firebase-auth.service';
//import { BackgroundComponent } from '../background/background';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  private readonly authService = inject(FirebaseAuthService);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly name = signal('');
  protected readonly password = signal('');
  protected readonly confirmPassword = signal('');
  protected readonly isSignUpMode = signal(false);
  protected readonly isForgotPasswordMode = signal(false);
  protected readonly showConfirmation = signal(false);
  protected readonly showSuccess = signal(false);
  protected readonly showResetSuccess = signal(false);
  protected readonly pendingEmail = signal('');


  protected readonly isLoading = this.authService.isLoading$;
  protected readonly errorMessage = this.authService.error$;
  protected readonly isAuthenticated = this.authService.isAuthenticated$;
 
  protected readonly showPassword = signal(false);

  togglePassword() {
    this.showPassword.update(value => !value);
  }
  protected async onSubmit(): Promise<void> {
    if (!this.email()) return;

    if (this.isForgotPasswordMode()) {
      await this.handleForgotPassword();
      return;
    }

    if (!this.password()) return;

    if (this.isSignUpMode()) {
      await this.handleSignUp();
    } else {
      await this.handleLogin();
    }
  }


  private async handleLogin(): Promise<void> {
    const success = await this.authService.login({
      username: this.email(),
      password: this.password()
    });

    if (success) {
      this.router.navigate(['/dashboard']);
    }
  }

  private async handleSignUp(): Promise<void> {
    if (this.password() !== this.confirmPassword() || !this.name()) return;

    const success = await this.authService.signUp({
      username: this.email(),
      password: this.password(),
      email: this.email(),
      name: this.name()
    });

    if (success) {
      this.pendingEmail.set(this.email());
      this.showConfirmation.set(true);
      this.isSignUpMode.set(false);
    }
  }

  protected async handleForgotPassword(): Promise<void> {
    if (!this.email()) return;
    
    const success = await this.authService.forgotPassword(this.email());
    if (success) {
      this.showResetSuccess.set(true);
      // Ocultar mensaje después de unos segundos
      setTimeout(() => {
        this.showResetSuccess.set(false);
        this.isForgotPasswordMode.set(false);
      }, 5000);
    }
  }



  protected async resendCode(): Promise<void> {
    await this.authService.resendConfirmationCode(this.pendingEmail(), this.password());
  }


  protected onEmailChange(value: string): void {
    this.email.set(value);
    this.authService.clearError();
  }

  protected onNameChange(value: string): void {
    this.name.set(value);
    this.authService.clearError();
  }

  protected onPasswordChange(value: string): void {
    this.password.set(value);
    this.authService.clearError();
  }

  protected onConfirmPasswordChange(value: string): void {
    this.confirmPassword.set(value);
    this.authService.clearError();
  }


  protected passwordsMatch(): boolean {
    return this.password() === this.confirmPassword() || !this.confirmPassword();
  }

  protected toggleMode(): void {
    this.isSignUpMode.update(v => !v);
    this.isForgotPasswordMode.set(false);
    this.showConfirmation.set(false);
    this.name.set('');
    this.password.set('');
    this.confirmPassword.set('');
    this.authService.clearError();
  }

  protected toggleForgotPassword(): void {
    this.isForgotPasswordMode.update(v => !v);
    this.isSignUpMode.set(false);
    this.authService.clearError();
  }

}