export const APP_URL = process.env.APP_URL || 'http://localhost:4200';
export const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
// El backend (src/app.js) monta las rutas tanto en /api como en /dev/api.
export const API_URL = `${BACKEND_URL}/dev/api`;
