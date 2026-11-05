import { apiFetch } from './client';

/**
 * Google Sheets API Client Module (/api/sheets/:id)
 */

// ==========================================
// 1.1 Gestión de Pestañas (Tabs)
// ==========================================

export async function listTabs(docId) {
  return apiFetch(`/sheets/${docId}/tabs`);
}

export async function createTab(docId, payload) {
  return apiFetch(`/sheets/${docId}/tabs`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function renameTab(docId, tabId, title) {
  return apiFetch(`/sheets/${docId}/tabs/${tabId}`, {
    method: 'PUT',
    body: JSON.stringify({ title }),
  });
}

export async function duplicateTab(docId, tabId, newTitle) {
  return apiFetch(`/sheets/${docId}/tabs/${tabId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ new_title: newTitle }),
  });
}

export async function deleteTab(docId, tabId) {
  return apiFetch(`/sheets/${docId}/tabs/${tabId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 1.2 Fórmulas, Valores y Guardado de Hoja
// ==========================================

export async function getSheetValues(docId, params = {}) {
  const query = new URLSearchParams();
  if (params.sheet_name) query.append('sheet_name', params.sheet_name);
  if (params.range) query.append('range', params.range);
  if (params.render_option) query.append('render_option', params.render_option);

  const qs = query.toString();
  return apiFetch(`/sheets/${docId}/values${qs ? `?${qs}` : ''}`);
}

/**
 * Asigna una fórmula o valor a una celda específica
 * @param {string} docId
 * @param {{ sheet_name?: string, cell: string, formula?: string, value?: string }} payload
 */
export async function setCellFormula(docId, payload) {
  return apiFetch(`/sheets/${docId}/formula`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Guarda cualquier valor (texto, número o fórmula) en una celda específica
 * @param {string} docId
 * @param {{ sheet_name?: string, cell: string, value: string }} payload
 */
export async function setCellValue(docId, payload) {
  return apiFetch(`/sheets/${docId}/cell`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

/**
 * Guarda la matriz completa de celdas de la pestaña activa en Google Sheets
 * @param {string} docId
 * @param {{ sheet_name?: string, rows: string[][] }} payload
 */
export async function saveSheetData(docId, payload) {
  return apiFetch(`/docs/${docId}/sheet-data`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 1.3 Selección de Columnas y Filas Completas
// ==========================================

export async function getColumn(docId, col, params = {}) {
  const query = new URLSearchParams();
  if (params.sheet_name) query.append('sheet_name', params.sheet_name);
  if (params.render_option) query.append('render_option', params.render_option);
  const qs = query.toString();
  return apiFetch(`/sheets/${docId}/columns/${col}${qs ? `?${qs}` : ''}`);
}

export async function updateColumn(docId, col, payload) {
  return apiFetch(`/sheets/${docId}/columns/${col}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function getRow(docId, row, params = {}) {
  const query = new URLSearchParams();
  if (params.sheet_name) query.append('sheet_name', params.sheet_name);
  if (params.render_option) query.append('render_option', params.render_option);
  const qs = query.toString();
  return apiFetch(`/sheets/${docId}/rows/${row}${qs ? `?${qs}` : ''}`);
}

export async function updateRow(docId, row, payload) {
  return apiFetch(`/sheets/${docId}/rows/${row}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function alterDimensions(docId, payload) {
  return apiFetch(`/sheets/${docId}/dimensions`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function resizeDimensions(docId, payload) {
  return apiFetch(`/sheets/${docId}/dimensions/resize`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

// ==========================================
// 1.4 Filtros
// ==========================================

export async function getFilters(docId) {
  return apiFetch(`/sheets/${docId}/filters`);
}

export async function setBasicFilter(docId, payload) {
  return apiFetch(`/sheets/${docId}/filters/basic`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function removeBasicFilter(docId, tabId) {
  return apiFetch(`/sheets/${docId}/filters/basic/${tabId}`, {
    method: 'DELETE',
  });
}

// ==========================================
// 1.5 Insertar Imágenes en Sheets
// ==========================================

export async function insertImageByUrl(docId, payload) {
  return apiFetch(`/sheets/${docId}/images/insert`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function uploadImageToCell(docId, { imageFile, cell, sheet_name, mode = 1 }) {
  const form = new FormData();
  form.append('image', imageFile);
  form.append('cell', cell);
  if (sheet_name) form.append('sheet_name', sheet_name);
  if (mode) form.append('mode', String(mode));

  return apiFetch(`/sheets/${docId}/images/upload`, {
    method: 'POST',
    body: form,
  });
}
