import { environment } from '../../environments/environment';

const BASE = environment.mediaUrl || '';

const AVATAR_FALLBACK = `${BASE}/avatares/01.webp`;

/**
 * Resuelve la URL de un avatar siguiendo la prioridad:
 * 1. Foto de perfil de Google (URL http/https) → siempre predomina
 * 2. Avatar elegido por el usuario (archivo local, ej. "07.webp")
 * 3. Fallback: avatar por defecto (01.webp)
 */
export function resolveAvatarUrl(picture: string | undefined | null): string {
  if (!picture) return AVATAR_FALLBACK;

  // Google profile picture → predomina siempre
  if (picture.startsWith('http')) return picture;

  // Archivo local tipo "01.png" o "01.webp"
  if (picture.match(/^\d+\.(png|webp)$/)) {
    const webp = picture.replace(/\.png$/, '.webp');
    return `${BASE}/avatares/${webp}`;
  }

  // Ya tiene prefijo avatares/
  if (picture.startsWith('avatares/')) {
    return `${BASE}/${picture}`;
  }

  // Caso genérico: asumir nombre de archivo
  return `${BASE}/avatares/${picture}`;
}

/**
 * Solo para el selector de avatares: arma la ruta de preview
 * (los archivos del selector siempre son locales)
 */
export function previewAvatarUrl(filename: string): string {
  return `${BASE}/avatares/${filename}`;
}
