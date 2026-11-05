import { AUTH_LOGIN_ENDPOINT } from '@/config/env';
import { apiFetch } from './client';

/**
 * Realiza el Login mediante petición POST enviando email y password
 * hacia el endpoint configurado en VITE_URL_BASE.
 *
 * @param {string} email
 * @param {string} password
 */
export async function loginWithEmail(email, password) {
  const cleanEmail = email.trim();

  const response = await fetch(AUTH_LOGIN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: cleanEmail,
      username: cleanEmail, // Compatibilidad si el endpoint externo aún lee username
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

