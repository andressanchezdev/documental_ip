import { apiFetch } from './client';

/**
 * Google Drive & Google Docs API Client Module (/api/docs)
 */

// ==========================================
// 2.0 Explorador Organizado de Drive y Creación
// ==========================================

/**
 * Lista documentos de Google Drive (opcionalmente filtrados por folder_id)
 * @param {string} [folderId]
 */
export async function listDriveDocs(folderId = '') {
  const qs = folderId ? `?folder_id=${encodeURIComponent(folderId)}` : '';
  return apiFetch(`/docs${qs}`);
}

/**
 * Lista carpetas de Google Drive permitidas para el usuario
 */
export async function listDriveFolders() {
  return apiFetch('/docs/folders');
}

/**
 * Crea un nuevo documento de Google Docs u Hoja de Google Sheets en blanco
 * @param {{ title: string, type: 'doc' | 'sheet', folder_id?: string }} payload
 */
export async function createBlankDocument(payload) {
  return apiFetch('/docs/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 2.1 Membretes (Headers y Footers)
// ==========================================

/**
 * Obtiene la estructura del documento (encabezados, pies de página, márgenes y tamaño)
 * @param {string} docId
 */
export async function getDocumentStructure(docId) {
  return apiFetch(`/docs/${docId}/structure`);
}

/**
 * Crea un encabezado (Membrete)
 * @param {string} docId
 * @param {'DEFAULT' | 'FIRST_PAGE_HEADER'} [headerType='DEFAULT']
 */
export async function createHeader(docId, headerType = 'DEFAULT') {
  return apiFetch(`/docs/${docId}/headers`, {
    method: 'POST',
    body: JSON.stringify({ header_type: headerType }),
  });
}

/**
 * Configura el contenido del membrete (Texto + Logo + Alineación)
 * @param {string} docId
 * @param {string} headerId
 * @param {{ text: string, image_url?: string, image_width?: number, image_height?: number, alignment?: 'START' | 'CENTER' | 'END' }} payload
 */
export async function setHeaderContent(docId, headerId, payload) {
  return apiFetch(`/docs/${docId}/headers/${headerId}/content`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Crea un pie de página (Footer)
 * @param {string} docId
 */
export async function createFooter(docId) {
  return apiFetch(`/docs/${docId}/footers`, {
    method: 'POST',
  });
}

/**
 * Configura el contenido del pie de página
 * @param {string} docId
 * @param {string} footerId
 * @param {{ text: string, alignment?: 'START' | 'CENTER' | 'END' }} payload
 */
export async function setFooterContent(docId, footerId, payload) {
  return apiFetch(`/docs/${docId}/footers/${footerId}/content`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 2.2 Sangrías, Márgenes, Párrafos y Texto
// ==========================================

/**
 * Formato de párrafo, sangrías y espaciado
 * @param {string} docId
 * @param {import('./types').ParagraphFormatPayload} payload
 */
export async function formatParagraph(docId, payload) {
  return apiFetch(`/docs/${docId}/paragraphs/format`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Configuración de márgenes de página (en puntos pt; 72pt = 1 pulgada)
 * @param {string} docId
 * @param {import('./types').PageMarginsPayload} payload
 */
export async function setMargins(docId, payload) {
  return apiFetch(`/docs/${docId}/margins`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Aplica formato de texto (negrita, cursiva, subrayado, tamaño, color, fuente)
 * @param {string} docId
 * @param {import('./types').TextFormatPayload} payload
 */
export async function formatText(docId, payload) {
  return apiFetch(`/docs/${docId}/text/format`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Crea o aplica lista con viñetas o numerada
 * @param {string} docId
 * @param {{ start_index: number, end_index: number, bullet_preset?: 'BULLET_DISC_CIRCLE_SQUARE' | 'NUMBERED_DECIMAL_ALPHA_ROMAN' }} payload
 */
export async function createBullets(docId, payload) {
  return apiFetch(`/docs/${docId}/bullets`, {
    method: 'POST',
    body: JSON.stringify({
      bullet_preset: 'BULLET_DISC_CIRCLE_SQUARE',
      ...payload,
    }),
  });
}

/**
 * Remueve viñetas o numeración de un rango
 * @param {string} docId
 * @param {{ start_index: number, end_index: number }} payload
 */
export async function removeBullets(docId, payload) {
  return apiFetch(`/docs/${docId}/bullets`, {
    method: 'DELETE',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 2.3 Insertar Imágenes en Google Docs
// ==========================================

/**
 * Inserta imagen vía URL en el documento o membrete
 * @param {string} docId
 * @param {{ image_url: string, segment_id?: string, index?: number, width?: number, height?: number }} payload
 */
export async function insertDocImageByUrl(docId, payload) {
  return apiFetch(`/docs/${docId}/images/insert`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Sube archivo directo e inserta en el documento
 * @param {string} docId
 * @param {{ imageFile: File | Blob, segment_id?: string, width?: number, height?: number }} params
 */
export async function uploadDocImage(docId, { imageFile, segment_id = '', width, height }) {
  const form = new FormData();
  form.append('image', imageFile);
  if (segment_id) form.append('segment_id', segment_id);
  if (width !== undefined) form.append('width', String(width));
  if (height !== undefined) form.append('height', String(height));

  return apiFetch(`/docs/${docId}/images/upload`, {
    method: 'POST',
    body: form,
  });
}
