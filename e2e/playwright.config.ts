import { defineConfig } from '@playwright/test';
import * as path from 'path';

// La suite vive en triviawar-front/e2e, y el backend es un repo hermano.
//   __dirname              -> triviawar/triviawar-front/e2e
//   resolve(__dirname,'..') -> triviawar/triviawar-front
const BACKEND_DIR = path.resolve(__dirname, '..', '..', 'triviawar-back');
const FRONTEND_DIR = path.resolve(__dirname, '..');

/**
 * Seguridad: el backend borra TODAS las salas al arrancar (server.js -> clearRooms()).
 * Para no tocar Firestore real, forzamos el modo memoria apuntando
 * FIREBASE_SERVICE_ACCOUNT_PATH a un archivo inexistente. Ademas vaciamos las
 * claves de IA para que ningun test dispare llamadas externas.
 */
const BACKEND_ENV = {
  ...process.env,
  PORT: '3000',
  NODE_ENV: 'test',
  FIREBASE_SERVICE_ACCOUNT_PATH: './__no_credentials_playwright__.json',
  FIREBASE_SERVICE_ACCOUNT_JSON: '',
  GEMINI_API_KEY: '',
  GROQ_API_KEY: '',
  HF_API_KEY: '',
  COHERE_API_KEY: '',
  OPENROUTER_API_KEY: '',
};

export default defineConfig({
  testDir: __dirname,
  testMatch: ['api/**/*.spec.ts', 'ui/**/*.spec.ts'],
  fullyParallel: false,
  workers: 1,
  // El dev server de Angular tarda en servir la primera carga de cada contexto;
  // un reintento evita fallos puntuales por lentitud, no por bugs reales.
  retries: 1,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'report') }],
  ],
  outputDir: path.join(__dirname, 'test-results'),
  use: {
    // Usa el Chrome ya instalado en el sistema (no descarga Chromium).
    channel: 'chrome',
    headless: true,
    baseURL: 'http://localhost:4200',
    // La app registra un Service Worker PWA (sw.js); si se activa, el cierre de
    // contextos en Playwright puede colgarse. Lo bloqueamos en las pruebas.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Sin video para no requerir el binario ffmpeg de Playwright.
    video: 'off',
  },
  webServer: [
    {
      command: 'node server.js',
      cwd: BACKEND_DIR,
      url: 'http://localhost:3000/dev/api/rooms',
      reuseExistingServer: false,
      timeout: 60_000,
      env: BACKEND_ENV,
    },
    {
      command: 'npx ng serve --port 4200 --host localhost',
      cwd: FRONTEND_DIR,
      url: 'http://localhost:4200',
      reuseExistingServer: false,
      timeout: 240_000,
    },
  ],
});
