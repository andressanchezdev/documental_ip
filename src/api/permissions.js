import { apiFetch } from './client';

/**
 * Permissions and Users API Client Module
 */

/**
 * Obtiene la lista de usuarios registrados en la DB con sus capacidades actuales
 * @returns {Promise<Array<{ id: number, email: string, username: string, role: string, can_read?: boolean, can_edit?: boolean, can_storage?: boolean }>>}
 */
export async function getUsers() {
  return apiFetch('/users');
}

/**
 * Obtiene las capacidades (Lectura, Edición, Almacenamiento) y el Checklist de carpetas de un usuario
 * @param {number|string} userId
 */
export async function getUserFolderPermissions(userId) {
  const data = await apiFetch(`/permissions/users/${userId}/folders`);
  if (Array.isArray(data)) {
    return {
      user_id: Number(userId),
      capabilities: {
        user_id: Number(userId),
        can_read: true,
        can_edit: true,
        can_storage: true,
        is_admin: false,
      },
      folders: data,
    };
  }
  return {
    user_id: data.user_id || Number(userId),
    capabilities: data.capabilities || {
      user_id: Number(userId),
      can_read: true,
      can_edit: false,
      can_storage: false,
      is_admin: false,
    },
    folders: Array.isArray(data.folders) ? data.folders : [],
  };
}

/**
 * Actualiza los permisos sobre Drive (Lectura, Edición, Almacenamiento) y el Checklist de carpetas de un usuario
 * @param {number|string} userId
 * @param {string[] | { folder_ids?: string[], can_read?: boolean, can_edit?: boolean, can_storage?: boolean, is_admin?: boolean }} payloadOrFolderIds
 */
export async function updateUserFolderPermissions(userId, payloadOrFolderIds) {
  const body = Array.isArray(payloadOrFolderIds)
    ? { folder_ids: payloadOrFolderIds }
    : payloadOrFolderIds;

  return apiFetch(`/permissions/users/${userId}/folders`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Asigna permisos directamente a una carpeta específica
 * @param {string} folderId
 * @param {{ allowed_user_ids?: number[], allowed_roles?: string[] }} payload
 */
export async function updateFolderPermissions(folderId, payload) {
  return apiFetch(`/permissions/folders/${folderId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Crea una nueva carpeta con permisos iniciales configurables
 * @param {{ name: string, parent_id?: string, allowed_user_ids?: number[], allowed_roles?: string[] }} payload
 */
export async function createFolderWithPermissions(payload) {
  return apiFetch('/folders', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
