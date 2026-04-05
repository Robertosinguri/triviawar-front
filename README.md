# TRIVIA WAR - Frontend

## 1. Descripción de la Aplicación

Frontend de Trivia War, una aplicación web de trivia multijugador desarrollada con Angular. Proporciona una interfaz moderna y responsiva para que usuarios puedan crear salas, unirse a partidas, competir en tiempo real y ver estadísticas de rendimiento.

## 2. Arquitecturas y Tecnologías Usadas

### Arquitectura
- **Single Page Application (SPA)**: Navegación sin recarga de página
- **Component-Based Architecture**: Componentes reutilizables y mantenibles
- **Reactive State Management**: Signals API para estado reactivo
- **Lazy Loading**: Carga bajo demanda de módulos

### Tecnologías Principales
- **Angular 20**: Framework frontend con componentes standalone
- **TypeScript**: Tipado estático para mayor robustez
- **SCSS**: Preprocesador CSS para estilos modularizados
- **Firebase Authentication**: Sistema de autenticación de usuarios
- **Socket.io Client**: Comunicación en tiempo real con backend
- **Angular Router**: Sistema de navegación con guards
- **RxJS**: Programación reactiva y manejo de observables

## 3. Estructura de Archivos

```
triviawar-front/
├── src/
│   ├── app/
│   │   ├── componentes/           # Componentes organizados por funcionalidad
│   │   │   ├── about/            # Página "Acerca de"
│   │   │   ├── arena/            # Arena de juego principal
│   │   │   ├── background/       # Componente de fondo animado
│   │   │   ├── configurar-sala/  # Configuración de salas
│   │   │   ├── dashboard/        # Panel principal de usuario
│   │   │   ├── entrenamiento/    # Modo entrenamiento individual
│   │   │   ├── lobby/            # Sala de espera para multijugador
│   │   │   ├── login/            # Autenticación de usuarios
│   │   │   ├── navbar/           # Barra de navegación
│   │   │   ├── ranking/          # Tabla de clasificación global
│   │   │   ├── resultados/       # Resultados de partidas
│   │   │   └── splash/           # Pantalla de inicio
│   │   ├── servicios/            # Servicios de negocio
│   │   │   ├── auth/             # Servicios de autenticación
│   │   │   │   └── firebase-auth.service.ts
│   │   │   ├── estadisticas/     # Servicios de estadísticas
│   │   │   └── websocket/        # Servicios de WebSocket
│   │   │       └── socket.service.ts
│   │   ├── theme/                # Temas y estilos globales
│   │   ├── app.config.server.ts  # Configuración SSR
│   │   ├── app.config.ts         # Configuración principal
│   │   ├── app.html              # Template principal
│   │   ├── app.routes.ts         # Definición de rutas
│   │   ├── app.scss              # Estilos globales
│   │   ├── app.ts                # Componente raíz
│   │   └── auth.guard.ts         # Guard de autenticación
│   ├── assets/                   # Recursos estáticos
│   ├── environments/             # Configuración por entorno
│   │   ├── environment.ts        # Desarrollo
│   │   └── environment.prod.ts   # Producción
│   ├── index.html                # HTML principal
│   ├── main.server.ts           # Punto de entrada SSR
│   ├── main.ts                  # Punto de entrada principal
│   └── styles.scss              # Estilos globales SCSS
├── public/                      # Assets públicos
├── .github/workflows/           # CI/CD con GitHub Actions
├── angular.json                 # Configuración de Angular CLI
├── firebase.json               # Configuración de Firebase Hosting
├── package.json                # Dependencias y scripts
├── tsconfig.json               # Configuración TypeScript
└── tsconfig.app.json           # Configuración TypeScript para build
```

## 4. Instrucciones de Instalación y Ejecución

### Opción Local (Desarrollo)

1. **Clonar repositorio**
   ```bash
   git clone https://github.com/tu-usuario/triviawar-front.git
   cd triviawar-front
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar entorno**
   - Configurar archivos en `src/environments/` según necesidades
   - Asegurar URLs de backend correctas

4. **Ejecutar servidor de desarrollo**
   ```bash
   npm start
   # O alternativamente:
   ng serve
   ```

5. **Acceder a la aplicación**
   - Abrir navegador en: `http://localhost:4200`
   - La aplicación se recargará automáticamente con cambios

### Sistemas de Despliegue Automático

El proyecto cuenta con dos pipelines de CI/CD independientes:

#### Opción 1: Firebase Hosting
- **Frontend**: Desplegado en Firebase Hosting Pages
- **Backend**: Desplegado en servidor Linux local (NAS/VM)
- **Trigger**: Push a branch `main`
- **Configuración**: Ver `.github/workflows/firebase-hosting.yml`

#### Opción 2: AWS Amplify
- **Frontend**: Desplegado en AWS Amplify
- **Backend**: Desplegado en AWS EC2 (VPS)
- **Configuración**: Configuración independiente para entornos cloud

Ambas opciones se ejecutan simultáneamente con cada push a `main`, proporcionando redundancia y múltiples puntos de acceso para usuarios.

## 5. Presentación del Equipo

### Equipo de Desarrollo
- **Desarrolladores Frontend**: Especializados en Angular, TypeScript y UX/UI
- **Diseñadores de Interfaz**: Expertos en experiencia de usuario y diseño responsivo
- **Integradores API**: Responsables de comunicación con backend y WebSockets
- **Testers**: Garantía de calidad en diferentes dispositivos y navegadores

### Metodología de Trabajo
- **Desarrollo por Componentes**: Cada funcionalidad como componente independiente
- **Code Standards**: Convenciones de código y revisión por pares
- **Testing Continuo**: Pruebas durante desarrollo
- **Documentación**: Comentarios en código y guías de uso

## 6. Representantes y Coordinadores

### Representantes Técnicos
*(Esta sección será completada manualmente con información específica del equipo)*

**Representante Frontend**:
- Responsable: Arquitectura frontend y decisiones técnicas
- Contacto: Disponible para consultas de implementación

**Representante UX/UI**:
- Responsable: Experiencia de usuario y diseño de interfaces
- Contacto: Feedback de usabilidad y mejoras visuales

### Coordinadores de Proyecto
*(Esta sección será completada manualmente con información específica del equipo)*

**Coordinador de Desarrollo**:
- Responsable: Planificación de sprints y entregables
- Contacto: Seguimiento de progreso y bloqueos

**Coordinador de Calidad**:
- Responsable: Estándares de código y pruebas
- Contacto: Aseguramiento de calidad y best practices

---

*Nota: Para información específica sobre configuración, credenciales o detalles técnicos de implementación, contactar directamente con los representantes técnicos del proyecto.*