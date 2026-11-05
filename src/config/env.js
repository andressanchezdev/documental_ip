/**
 * Configuración centralizada de variables de entorno para Local y Railway
 * Variable principal requerida: VITE_URL_BASE
 */

// URL base configurada en el entorno (ej: "https://mi-api.up.railway.app/api" o "/api")
const rawBaseUrl = import.meta.env.VITE_URL_BASE || '/api';
export const API_URL_BASE = rawBaseUrl.replace(/\/+$/, '');

// Ruta del endpoint POST de Login (permite personalizar la ruta o usar URL absoluta)
export const AUTH_LOGIN_ENDPOINT =
  import.meta.env.VITE_AUTH_LOGIN_PATH || `${API_URL_BASE}/auth/login`;

// URL base para las operaciones de Google Drive / Docs / Sheets (usa VITE_GOOGLE_API_URL o VITE_URL_BASE)
const rawGoogleUrl = import.meta.env.VITE_GOOGLE_API_URL || API_URL_BASE;
export const GOOGLE_API_URL_BASE = rawGoogleUrl.replace(/\/+$/, '');

