import { apiFetch } from './client';

/**
 * 🖼️ Utilidad General de Imágenes (/api/images)
 */

/**
 * Sube una imagen general al almacenamiento y devuelve el CDN público directo de Google
 * @param {File | Blob} imageFile
 * @returns {Promise<{ file_id: string, file_name: string, mime_type: string, url: string, viewer_url: string }>}
 */
export async function uploadGeneralImage(imageFile, { producto_id = '', codigo = '' } = {}) {
  const form = new FormData();
  form.append('image', imageFile);
  if (producto_id) form.append('producto_id', String(producto_id));
  if (codigo) form.append('codigo', String(codigo));

  return apiFetch('/images/upload', {
    method: 'POST',
    body: form,
  });
}

/**
 * Consulta productos de la tabla `productos` en la DB local MySQL incluyendo `imagenArray`
 * @param {string} [query='']
 */
export async function getProductos(query = '') {
  const qs = query ? `?q=${encodeURIComponent(query)}` : '';
  return apiFetch(`/productos${qs}`);
}

/**
 * Sube una imagen a GCP y actualiza `productos.imagenArray` para un producto específico
 * @param {string | number} productoIdOrCodigo
 * @param {File | Blob} imageFile
 */
export async function uploadProductImage(productoIdOrCodigo, imageFile) {
  const form = new FormData();
  form.append('image', imageFile);

  return apiFetch(`/productos/${encodeURIComponent(productoIdOrCodigo)}/image`, {
    method: 'POST',
    body: form,
  });
}

/**
 * Envía el JSON de ubicación de imagen directamente al campo `imagenArray` de la tabla `productos`
 * @param {{ id?: string, codigo?: string, url?: string, cloud_url?: string, imagenArray?: string[], replace?: boolean }} payload
 */
export async function syncProductImageArray(payload) {
  return apiFetch('/productos/imagen-array', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

