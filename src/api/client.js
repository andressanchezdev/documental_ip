import { API_HOST_BASE, API_PREFIX, GOOGLE_API_HOST_BASE } from '@/config/env';

/**
 * Construye la URL final integrando:
 * Host Base (sin /api) + Prefijo '/api' + Ruta del Endpoint
 *
 * Ejemplos:
 * - Local con VITE_URL_BASE vacía:
 *     buildApiUrl('/docs')        -> '/api/docs'
 *     buildApiUrl('/auth/login')  -> '/api/auth/login'
 * - Producción en Railway con VITE_URL_BASE="https://mi-backend.up.railway.app":
 *     buildApiUrl('/docs')        -> 'https://mi-backend.up.railway.app/api/docs'
 * - Prevención de duplicación accidental:
 *     buildApiUrl('/api/docs')    -> 'https://mi-backend.up.railway.app/api/docs'
 */
export function buildApiUrl(endpoint) {
  if (!endpoint) {
    return `${API_HOST_BASE}${API_PREFIX}`;
  }

  // Si ya es una URL absoluta externa (http:// o https://), se respeta intacta
  if (/^https?:\/\//i.test(endpoint)) {
    return endpoint;
  }

  // Asegura que empiece con barra
  let cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Si el endpoint ya trae '/api' al principio, lo removemos para evitar '/api/api'
  if (cleanEndpoint.toLowerCase().startsWith('/api/')) {
    cleanEndpoint = cleanEndpoint.slice(4);
  } else if (cleanEndpoint.toLowerCase() === '/api') {
    cleanEndpoint = '';
  }

  const baseHost = GOOGLE_API_HOST_BASE || API_HOST_BASE || '';
  return `${baseHost}${API_PREFIX}${cleanEndpoint}`;
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const headers = { ...options.headers };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Solo forzamos JSON si no es subida de archivos (FormData)
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(buildApiUrl(endpoint), {
    ...options,
    headers,
  });

  // Manejo de token vencido o no autorizado
  if (response.status === 401 && !endpoint.includes('/auth/login')) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.reload();
    throw new Error('Sesión expirada');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error HTTP ${response.status}`);
  }

  // Si la respuesta es un binario (PDF del stream de Google Drive), devolvemos el Blob
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/pdf')) {
    return response.blob();
  }

  return response.json();
}
