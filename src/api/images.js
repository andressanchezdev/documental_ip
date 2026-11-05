import { apiFetch } from './client';

/**
 * 🖼️ Utilidad General de Imágenes (/api/images)
 */

/**
 * Sube una imagen general al almacenamiento y devuelve el CDN público directo de Google
 * @param {File | Blob} imageFile
 * @returns {Promise<{ file_id: string, file_name: string, mime_type: string, url: string, viewer_url: string }>}
 */
export async function uploadGeneralImage(imageFile) {
  const form = new FormData();
  form.append('image', imageFile);

  return apiFetch('/images/upload', {
    method: 'POST',
    body: form,
  });
}

