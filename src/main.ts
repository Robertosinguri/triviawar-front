import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(
      (registration) => {
        console.log('📲 PWA: Service Worker registrado correctamente:', registration.scope);
      },
      (err) => {
        console.log('📲 PWA: Error al registrar Service Worker:', err);
      }
    );
  });
}
