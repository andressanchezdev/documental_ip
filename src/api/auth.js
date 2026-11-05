import { AUTH_LOGIN_ENDPOINT } from '@/config/env';
import { apiFetch, buildApiUrl } from './client';

/**
 * Realiza el Login mediante petición POST enviando email y password
 * hacia el endpoint de autenticación.
 *
 * @param {string} email
 * @param {string} password
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = email.trim();

  // Si AUTH_LOGIN_ENDPOINT fue personalizado por variable de entorno, se usa esa;
  // de lo contrario, se construye con buildApiUrl('/auth/login')
  const targetUrl = import.meta.env.VITE_AUTH_LOGIN_PATH
    ? AUTH_LOGIN_ENDPOINT
    : buildApiUrl('/auth/login');

  const response = await fetch(targetUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: cleanEmail,
      username: cleanEmail, // Compatibilidad si el backend lee username
      password,
    }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || errData.error || 'Credenciales inválidas');
  }

  return response.json();
}

/**
 * Consulta los permisos activos sobre Google Drive del usuario autenticado
 * (Lectura, Edición, Almacenamiento y Admin).
 */
export async function getMyDrivePermissions() {
  return apiFetch('/permissions/me');
}
