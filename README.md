# 🎮 TRIVIA WAR - Frontend

## 1. Descripción de la Aplicación

Frontend de **Trivia War**, una aplicación web de trivia multijugador desarrollada con **Angular 20**. Proporciona una interfaz moderna y responsiva para que usuarios puedan crear salas, unirse a partidas, competir en tiempo real, chatear con otros jugadores, entrenar individualmente con preguntas generadas por IA, y ver estadísticas de rendimiento y ranking global.

---

## 2. Arquitectura y Tecnologías Usadas

### Arquitectura
- **Single Page Application (SPA)**: Navegación sin recarga de página con hash routing
- **Component-Based Architecture**: Componentes standalone reutilizables y mantenibles
- **Reactive State Management**: Signals API para estado reactivo
- **Lazy Loading**: Carga bajo demanda de módulos
- **Zoneless Change Detection**: Sin Zone.js para mejor rendimiento
- **Server-Side Rendering (SSR)**: Soporte para renderizado del lado del servidor

### Tecnologías Principales
| Tecnología | Versión | Propósito |
|---|---|---|
| **Angular** | 20.3.19 | Framework frontend con componentes standalone |
| **TypeScript** | ~5.9.3 | Tipado estático para mayor robustez |
| **SCSS** | — | Preprocesador CSS para estilos modularizados |
| **Firebase Authentication** | ^12.8.0 | Sistema de autenticación de usuarios |
| **AngularFire** | ^20.0.1 | Integración nativa de Firebase con Angular |
| **Socket.io Client** | ^4.8.1 | Comunicación en tiempo real con backend |
| **ngx-socket-io** | 4.9.0 | Wrapper de Socket.io para Angular |
| **Angular Router** | 20.3.19 | Sistema de navegación con guards y hash location |
| **RxJS** | ~7.8.0 | Programación reactiva y manejo de observables |
| **GitHub Actions** | — | CI/CD automatizado |

---

## 3. Estructura de Archivos

```
triviawar-front/
├── src/
│   ├── app/
│   │   ├── componentes/                # Componentes organizados por funcionalidad
│   │   │   ├── about/                  # Página "Acerca de"
│   │   │   ├── arena/                  # Arena de juego (multijugador y entrenamiento)
│   │   │   ├── background/             # Componente de fondo animado
│   │   │   ├── chat/                   # Componente de chat en tiempo real
│   │   │   ├── configurar-sala/        # Configuración de salas (crear/unirse)
│   │   │   ├── control/                # Panel de control de juego
│   │   │   ├── dashboard/              # Panel principal de usuario
│   │   │   ├── entrenamiento/          # Modo entrenamiento individual
│   │   │   ├── lobby/                  # Sala de espera para multijugador
│   │   │   ├── login/                  # Autenticación de usuarios
│   │   │   ├── navbar/                 # Barra de navegación (desktop y mobile)
│   │   │   ├── ranking/                # Tabla de clasificación global
│   │   │   ├── resultados/             # Resultados de partidas
│   │   │   └── splash/                 # Pantalla de inicio
│   │   ├── servicios/                  # Servicios de negocio
│   │   │   ├── auth/
│   │   │   │   └── firebase-auth.service.ts  # Autenticación (email, Google, perfil)
│   │   │   ├── estadisticas/
│   │   │   │   └── estadisticas.service.ts   # Estadísticas y ranking vía API REST
│   │   │   ├── websocket/
│   │   │   │   └── socket.service.ts         # Comunicación WebSocket con backend
│   │   │   ├── audio/
│   │   │   │   └── audio.service.ts          # Gestión de audio (efectos, música)
│   │   │   ├── chat.service.ts               # Servicio de chat en tiempo real
│   │   │   └── chat-state.service.ts         # Estado reactivo del chat (Signals)
│   │   ├── theme/
│   │   │   └── variables.scss          # Variables de tema y estilos globales
│   │   ├── app.config.server.ts        # Configuración SSR
│   │   ├── app.config.ts               # Configuración principal (Firebase, Socket.io, Router)
│   │   ├── app.html                    # Template principal
│   │   ├── app.routes.ts               # Definición de rutas con guards
│   │   ├── app.scss                    # Estilos globales
│   │   ├── app.ts                      # Componente raíz
│   │   └── auth.guard.ts               # Guard de autenticación
│   ├── assets/                         # Recursos estáticos (logo, diagramas, presentaciones)
│   │   ├── audio/                      # Archivos de audio locales
│   │   ├── avatares/                   # Avatares de usuario (01.png - 24.png + mvpp.png)
│   │   └── diagramas/                  # Diagramas técnicos
│   ├── environments/
│   │   ├── environment.ts              # Configuración de desarrollo
│   │   └── environment.prod.ts         # Configuración de producción
│   ├── index.html                      # HTML principal
│   ├── main.server.ts                  # Punto de entrada SSR
│   ├── main.ts                         # Punto de entrada principal
│   └── styles.scss                     # Estilos globales SCSS
├── public/                             # Assets públicos (favicon, logo, audio, avatares)
│   ├── audio/                          # Archivos de audio (efectos, música de fondo)
│   └── avatares/                       # Avatares de usuario
├── .github/workflows/
│   └── firebase-hosting.yml            # CI/CD para Firebase Hosting
├── angular.json                        # Configuración de Angular CLI
├── firebase.json                       # Configuración de Firebase Hosting
├── package.json                        # Dependencias y scripts
├── tsconfig.json                       # Configuración TypeScript base
├── tsconfig.app.json                   # Configuración TypeScript para build
└── README.md                           # Este archivo
```

---

## 4. Instrucciones de Instalación y Ejecución

### Opción Local (Desarrollo)

1. **Clonar repositorio**
   ```bash
   git clone https://github.com/Robertosinguri/triviawar-front.git
   cd triviawar-front
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar entorno**
   - Los archivos de entorno están en `src/environments/`
   - `environment.ts` (desarrollo): API en `http://localhost:3000/dev/api`
   - `environment.prod.ts` (producción): API en URL de AWS/NAS
   - Asegurar que las URLs del backend sean correctas

4. **Ejecutar servidor de desarrollo**
   ```bash
   npm start

   ```

5. **Acceder a la aplicación**
   - Abrir navegador en: `http://localhost:4200`
   - La aplicación se recargará automáticamente con cambios

### Build de Producción
```bash
npm run build
# Genera los archivos en dist/frontend/browser
```

---

## 5. Rutas de la Aplicación

| Ruta | Componente | Auth Guard | Descripción |
|---|---|---|---|
| `/` | SplashComponent | ❌ | Pantalla de inicio |
| `/login` | Login | ❌ | Inicio de sesión / registro |
| `/dashboard` | DashboardComponent | ✅ | Panel principal del usuario |
| `/crear-sala` | ConfigurarSalaComponent | ✅ | Crear nueva sala de juego |
| `/unirse-sala` | ConfigurarSalaComponent | ✅ | Unirse a sala existente |
| `/lobby` | LobbyComponent | ✅ | Sala de espera multijugador |
| `/entrenamiento` | EntrenamientoComponent | ✅ | Modo entrenamiento individual |
| `/arena` | ArenaComponent | ✅ | Escenario de juego (único para todos) |
| `/resultados` | ResultadosComponent | ✅ | Resultados de partida |
| `/ranking` | RankingComponent | ✅ | Tabla de clasificación global |
| `/about` | AboutComponent | ✅ | Información del proyecto |
| `**` | — | ❌ | Redirección al splash |

---

## 6. Servicios Principales

### FirebaseAuthService (`auth/firebase-auth.service.ts`)
- Autenticación con email/password y Google
- Registro de nuevos usuarios
- Actualización de perfil (nombre, avatar)
- Recuperación de contraseña
- Estado reactivo mediante Signals (`isAuthenticated$`, `currentUser$`)

### SocketService (`websocket/socket.service.ts`)
- Comunicación en tiempo real con el backend
- Eventos de sala: `create_room`, `join_room`, `leave_room`, `update_config`, `start_game`
- Eventos de juego: `save_game_result`
- Eventos de estadísticas: `get_my_stats`, `get_global_ranking`
- Todos los eventos retornan Observables

### EstadisticasService (`estadisticas/estadisticas.service.ts`)
- Obtención de estadísticas personales vía API REST
- Ranking global
- Guardado de resultados de partida

### AudioService (`audio/audio.service.ts`)
- Gestión de efectos de sonido (correcto, incorrecto, click)
- Música de fondo contextual (dashboard, arena, entrenamiento)
- Fade in/out para transiciones suaves
- Persistencia de preferencias en localStorage
- Control de volumen independiente para efectos y música
- Desbloqueo de autoplay para navegadores restrictivos

### ChatService (`chat.service.ts`)
- Conexión al chat global y por sala
- Envío y recepción de mensajes en tiempo real
- Historial de mensajes
- Lista de usuarios conectados

### ChatStateService (`chat-state.service.ts`)
- Estado reactivo del chat mediante Signals
- Gestión de mensajes, usuarios conectados, pestañas
- Limpieza de estado en logout/cambio de usuario

---

## 7. Sistemas de Despliegue Automático

El proyecto cuenta con **dos pipelines de CI/CD independientes** que se ejecutan simultáneamente con cada push a `main`:

#### Opción 1: Firebase Hosting
- **Frontend**: Desplegado en Firebase Hosting Pages
- **Backend**: Desplegado en servidor Linux local (NAS/VM)
- **Trigger**: Push a branch `main`
- **Configuración**: `.github/workflows/firebase-hosting.yml`

#### Opción 2: AWS Amplify
- **Frontend**: Desplegado en AWS Amplify
- **Backend**: Desplegado en AWS EC2 (VPS)
- **Configuración**: Configuración independiente para entornos cloud

Ambas opciones se ejecutan simultáneamente con cada push a `main`, proporcionando redundancia y múltiples puntos de acceso para usuarios.


---

## MVPP

Equipo de trabajo: Antonella Z. - Gerarlis R. - Ariadna P. - Jesica G. - Roberto S. --
