import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection, importProvidersFrom } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

// Firebase
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';

// Socket.io
import { SocketIoModule, SocketIoConfig } from 'ngx-socket-io';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

const socketConfig: SocketIoConfig = {
  url: environment.socketUrl,
  options: {
    autoConnect: false // Conectamos manualmente al entrar
  }
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes, withHashLocation()),
    provideHttpClient(withFetch()),

    // Inicialización de Servicios
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    importProvidersFrom(
      SocketIoModule.forRoot(socketConfig)
    )
  ]
};


