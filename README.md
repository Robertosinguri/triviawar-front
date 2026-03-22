# TRIVIA WAR - Frontend 🎮

Este es el repositorio del frontend de **Trivia War**, una aplicación web de trivia multijugador desarrollada con **Angular 20**.

## 🚀 Despliegue en Firebase Hosting

Este proyecto está configurado para ser desplegado en **Google Firebase**.

### Requisitos previos
- Node.js y npm instalados.
- Firebase CLI instalado (`npm install -g firebase-tools`).

### Pasos para desplegar:
1. **Instalar dependencias:**
   ```bash
   npm install
   ```
2. **Configurar el entorno:**
   - Revisa `src/environments/environment.prod.ts` y asegúrate de que `apiUrl` y `socketUrl` apunten a la dirección IP o dominio de tu NAS donde correrá el backend.
3. **Construir el proyecto:**
   ```bash
   npm run build
   ```
4. **Desplegar:**
   ```bash
   firebase login
   firebase init  # Selecciona Hosting y el proyecto mvpp-65c73
   firebase deploy
   ```

## 🛠️ Desarrollo Local
1. Ejecutar `npm install`.
2. Ejecutar `ng serve` para un servidor de desarrollo.
3. Navegar a `http://localhost:4200/`.

## 📁 Estructura
- `src/app/componentes/`: Todos los componentes visuales (Arena, Lobby, Dashboard, etc.).
- `src/app/servicios/`: Servicios para Auth (Firebase), WebSockets y Estadísticas.
- `src/environments/`: Configuración de URLs para diferentes entornos.
