import { SplashComponent } from './componentes/splash/splash';
import { Login } from './componentes/login/login';
import { DashboardComponent } from './componentes/dashboard/dashboard';
import { ConfigurarSalaComponent } from './componentes/configurar-sala/configurar-sala';
import { LobbyComponent } from './componentes/lobby/lobby';
import { EntrenamientoComponent } from './componentes/entrenamiento/entrenamiento';
import { AboutComponent } from './componentes/about/about';
import { AboutClasicoComponent } from './componentes/about-clasico/about-clasico';
import { Routes } from '@angular/router';
import { RankingComponent } from './componentes/ranking/ranking';
import { ResultadosComponent } from './componentes/resultados/resultados';
import { ArenaComponent } from './componentes/arena/arena';
import { EstadisticasComponent } from './componentes/estadisticas/estadisticas';
import { authGuard } from './auth.guard'; 

export const routes: Routes = [
  // RUTA 1: La ruta raíz (la primera que se carga)
  {
    path: '', 
    component: SplashComponent
  },
  
  // RUTA 2: El destino de la navegación de tu timer
  {
    path: 'login',
    component: Login // El destino de la navegación
  },
  
  // RUTA 3: Dashboard principal después del login
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard]
  },
  
  // RUTA 4: Configurar sala (crear)
  {
    path: 'crear-sala',
    component: ConfigurarSalaComponent,
    canActivate: [authGuard]
  },
  
  // RUTA 5: Configurar sala (unirse)
  {
    path: 'unirse-sala',
    component: ConfigurarSalaComponent,
    canActivate: [authGuard]
  },
  
  // RUTA 6: Lobby (sala de espera)
  {
    path: 'lobby',
    component: LobbyComponent,
    canActivate: [authGuard]
  },
  
  // RUTA 7: Entrenamiento individual
  {
    path: 'entrenamiento',
    component: EntrenamientoComponent,
    canActivate: [authGuard]
  },
  
  // RUTA 8: /juego eliminado — enlaces antiguos redirigen a entrenamiento
  {
    path: 'juego',
    redirectTo: 'entrenamiento',
    pathMatch: 'full'
  },

  // RUTA 9: About — "Qué es TriviaWar"
  // El enlace del menú sigue siendo /about, pero ahora abre la presentación
  // del proyecto (problema, solución y cliente).
  {
    path: 'about',
    component: AboutComponent,
    canActivate: [authGuard]
  },

  // RUTA 9b: About original, conservado para no perder el contenido.
  // No está enlazado desde el menú: se entra sólo por URL.
  {
    path: 'about-clasico',
    component: AboutClasicoComponent,
    canActivate: [authGuard]
  },

  //ruta 10: ranking
  { 
    path: 'ranking', 
    component: RankingComponent,
    canActivate: [authGuard]
  },

  // RUTA 11: Arena — escenario único (1 jugador = entrenamiento, N = multijugador)
  {
    path: 'arena',
    component: ArenaComponent,
    canActivate: [authGuard]
  },

  // RUTA 12: Resultados multijugador
  {
    path: 'resultados',
    component: ResultadosComponent,
    canActivate: [authGuard]
  },

  // RUTA 13: Panel de resultados de la encuesta.
  // No lleva authGuard a propósito: no es una pantalla de juego y no está
  // enlazada desde ningún lado. El acceso lo protege la clave que valida el
  // backend, no la sesión del juego.
  {
    path: 'estadisticas',
    component: EstadisticasComponent
  },

  // RUTA OPCIONAL: Si el usuario teclea una URL incorrecta, redirige al splash
  {
    path: '**',
    redirectTo: '' 
  }  

];