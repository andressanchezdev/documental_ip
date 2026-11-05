/**
 * Configuración centralizada de variables de entorno para Local y Railway
 *
 * Arquitectura de URLs:
 * - VITE_URL_BASE almacena ÚNICAMENTE la dirección base del Host / Servidor (SIN el prefijo '/api').
 *   En Local:   "" (vacío o no definido para usar el proxy relativo de Vite)
 *   En Railway: "https://tu-backend.up.railway.app" (sin '/api')
 */

// Host base limpio: remueve barras finales y cualquier '/api' accidental al final
const rawHost = (import.meta.env.VITE_URL_BASE || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export const API_HOST_BASE = rawHost;

// Prefijo estándar de la API de backend
export const API_PREFIX = '/api';

// URL base completa del path de la API (Host + /api)
export const API_URL_BASE = `${API_HOST_BASE}${API_PREFIX}`;

// Ruta del endpoint POST de Login (permite sobreescritura externa o fallback a la ruta estándar)
export const AUTH_LOGIN_ENDPOINT =
  import.meta.env.VITE_AUTH_LOGIN_PATH || `${API_URL_BASE}/auth/login`;

// Compatibilidad en caso de definir un host específico para Google
const rawGoogleHost = (import.meta.env.VITE_GOOGLE_API_URL || '')
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api$/i, '');

export const GOOGLE_API_HOST_BASE = rawGoogleHost || API_HOST_BASE;
export const GOOGLE_API_URL_BASE = `${GOOGLE_API_HOST_BASE}${API_PREFIX}`;
