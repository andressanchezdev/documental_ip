import React, { useState, useEffect, useCallback } from 'react';
import { getProductos, uploadProductImage, syncProductImageArray } from '@/api/images';
import {
  Image as ImageIcon,
  Search,
  Upload,
  Link as LinkIcon,
  X,
  Check,
  Loader2,
  AlertCircle,
  Database,
  Cloud,
  RefreshCw,
} from 'lucide-react';

export function ProductImageArrayModal({ isOpen, onClose }) {
  const [productos, setProductos] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProd, setSelectedProd] = useState(null);
  const [loading, setLoading] = useState(false);

  const [mode, setMode] = useState('upload'); // 'upload' | 'json'
  const [imageFile, setImageFile] = useState(null);
  const [jsonUrlInput, setJsonUrlInput] = useState('');
  const [replaceArray, setReplaceArray] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });
  const [lastResult, setLastResult] = useState(null);

  const fetchProductos = useCallback(async (q = '') => {
    setLoading(true);
    setFeedback({ text: '', type: '' });
    try {
      const list = await getProductos(q);
      const arr = Array.isArray(list) ? list : [];
      setProductos(arr);
      if (arr.length > 0) {
        setSelectedProd((prev) => {
          if (prev) {
            const updated = arr.find((p) => p.id === prev.id);
            if (updated) return updated;
          }
          return arr[0];
        });
      } else {
        setSelectedProd(null);
      }
    } catch (err) {
      setFeedback({ text: `Error consultando tabla productos: ${err.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchProductos(searchQuery);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProductos(searchQuery);
  };

  const handleUploadAndSave = async () => {
    if (!selectedProd) return;
    setSubmitting(true);
    setFeedback({ text: '', type: '' });
    setLastResult(null);

    try {
      if (mode === 'upload') {
        if (!imageFile) {
          setFeedback({ text: 'Selecciona un archivo de imagen primero.', type: 'error' });
          setSubmitting(false);
          return;
        }
        const res = await uploadProductImage(selectedProd.id, imageFile);
        setLastResult(res);
        setFeedback({
          text: `Imagen subida a GCP y guardada en productos.imagenArray (ID: ${selectedProd.id})`,
          type: 'success',
        });
        setImageFile(null);
      } else {
        if (!jsonUrlInput.trim()) {
          setFeedback({ text: 'Ingresa la ruta o URL de la imagen para enviar al JSON.', type: 'error' });
          setSubmitting(false);
          return;
        }
        let payload = {
          id: String(selectedProd.id),
          codigo: selectedProd.codigo,
          replace: replaceArray,
        };

        const trimmed = jsonUrlInput.trim();
        if (trimmed.startsWith('[')) {
          const parsed = JSON.parse(trimmed);
          payload.imagenArray = parsed;
          payload.replace = true;
        } else {
          payload.cloud_url = trimmed;
          if (replaceArray) {
            payload.imagenArray = [trimmed];
          }
        }

        const res = await syncProductImageArray(payload);
        setLastResult(res);
        setFeedback({
          text: `JSON enviado y guardado en productos.imagenArray (ID: ${selectedProd.id})`,
          type: 'success',
        });
        setJsonUrlInput('');
      }
      await fetchProductos(searchQuery);
    } catch (err) {
      setFeedback({ text: `Error en la prueba: ${err.message}`, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={styles.iconBadge}>
              <Database size={18} color="#059669" />
            </div>
            <div>
              <h3 style={styles.title}>
                Pruebas GCP + MySQL Local (Tabla <code>productos</code> → <code>imagenArray</code>)
              </h3>
              <p style={styles.subtitle}>
                Sube una imagen a GCP o envía el JSON de ubicación y verifica cómo queda guardado en <code>imagenArray</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Buscador de Productos */}
        <form onSubmit={handleSearch} style={styles.searchBar}>
          <div style={styles.searchBox}>
            <Search size={14} color="#64748b" />
            <input
              type="text"
              placeholder="Buscar producto por código (ej: 8801470510011), descripción o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
          <button type="submit" style={styles.searchBtn} disabled={loading}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            <span>Buscar en DB</span>
          </button>
        </form>

        {/* Cuerpo en 2 columnas: Selector + Detalle de imagenArray */}
        <div style={styles.body}>
          {/* Columna izquierda: Lista de productos */}
          <div style={styles.leftCol}>
            <div style={styles.sectionLabel}>Productos en DB (`mysql.productos`)</div>
            <div style={styles.prodList}>
              {loading ? (
                <div style={styles.emptyBox}>
                  <Loader2 size={20} className="animate-spin" color="#2563eb" />
                  <span>Consultando MySQL...</span>
                </div>
              ) : productos.length === 0 ? (
                <div style={styles.emptyBox}>No se encontraron productos</div>
              ) : (
                productos.map((p) => {
                  const active = selectedProd?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProd(p)}
                      style={{
                        ...styles.prodItem,
                        backgroundColor: active ? '#eff6ff' : '#fff',
                        borderColor: active ? '#93c5fd' : '#f1f5f9',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a' }}>
                        #{p.id} — Cód: {p.codigo || 'S/C'}
                      </div>
                      <div style={{ fontSize: '0.73rem', color: '#64748b' }}>
                        {p.descripcion || '(Sin descripción)'} •{' '}
                        <strong>{p.imagenArray?.length || 0} img(s)</strong>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Columna derecha: Estado actual de imagenArray y formulario de envío */}
          <div style={styles.rightCol}>
            {selectedProd ? (
              <>
                <div style={styles.prodCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                      Producto #{selectedProd.id} (Código: {selectedProd.codigo})
                    </span>
                    <span style={styles.badgeCount}>
                      {selectedProd.imagenArray?.length || 0} rutas en imagenArray
                    </span>
                  </div>

                  <div style={{ marginTop: '0.5rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#475569', marginBottom: '0.25rem' }}>
                      Valor JSON actual en DB (`productos.imagenArray`):
                    </div>
                    <pre style={styles.jsonPre}>
                      {JSON.stringify(selectedProd.imagenArray || [], null, 2)}
                    </pre>
                  </div>
                </div>

                {/* Pestañas de modo de prueba */}
                <div style={styles.modeTabs}>
                  <button
                    type="button"
                    onClick={() => setMode('upload')}
                    style={{
                      ...styles.modeTabBtn,
                      ...(mode === 'upload' ? styles.activeModeTab : {}),
                    }}
                  >
                    <Cloud size={14} /> 1. Subir Archivo a GCP + Guardar en DB
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('json')}
                    style={{
                      ...styles.modeTabBtn,
                      ...(mode === 'json' ? styles.activeModeTab : {}),
                    }}
                  >
                    <LinkIcon size={14} /> 2. Enviar JSON de Ubicación a DB
                  </button>
                </div>

                {mode === 'upload' ? (
                  <div style={styles.actionBox}>
                    <label style={styles.fieldLabel}>
                      Selecciona una imagen para subir a Google Cloud (Drive/GCP) e insertar su URL pública en{' '}
                      <code>imagenArray</code>:
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                      style={{ fontSize: '0.8rem' }}
                    />
                  </div>
                ) : (
                  <div style={styles.actionBox}>
                    <label style={styles.fieldLabel}>
                      Ruta o JSON de ubicación de la imagen (ej:{' '}
                      <code>https://storage.googleapis.com/importadorapremiumonline/dependencias/img/productos/{selectedProd.codigo}/1.webp</code>
                      ):
                    </label>
                    <input
                      type="text"
                      value={jsonUrlInput}
                      onChange={(e) => setJsonUrlInput(e.target.value)}
                      placeholder={`dependencias/img/productos/${selectedProd.codigo}/1.webp o URL completa GCP`}
                      style={styles.textInput}
                    />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', color: '#475569', marginTop: '0.35rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={replaceArray}
                        onChange={(e) => setReplaceArray(e.target.checked)}
                      />
                      Reemplazar todo el arreglo <code>imagenArray</code> (si se desmarca, agrega la ruta al arreglo actual)
                    </label>
                  </div>
                )}

                {lastResult && (
                  <div style={styles.resultBox}>
                    <div style={{ fontSize: '0.73rem', fontWeight: 700, color: '#047857', marginBottom: '0.2rem' }}>
                      Respuesta del POST (`POST /api/productos/...`):
                    </div>
                    <pre style={styles.resultPre}>{JSON.stringify(lastResult, null, 2)}</pre>
                  </div>
                )}
              </>
            ) : (
              <div style={styles.emptyBox}>Selecciona un producto de la lista izquierda</div>
            )}
          </div>
        </div>

        {/* Feedback */}
        {feedback.text && (
          <div
            style={{
              ...styles.feedbackBar,
              backgroundColor: feedback.type === 'error' ? '#fef2f2' : '#ecfdf5',
              color: feedback.type === 'error' ? '#dc2626' : '#059669',
              borderColor: feedback.type === 'error' ? '#fecaca' : '#a7f3d0',
            }}
          >
            {feedback.type === 'error' ? <AlertCircle size={15} /> : <Check size={15} />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
            Conectado a MySQL local: <strong>mysql.productos</strong>
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={styles.cancelBtn}>
              Cerrar
            </button>
            <button
              onClick={handleUploadAndSave}
              disabled={submitting || !selectedProd}
              style={styles.saveBtn}
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              <span>
                {submitting
                  ? 'Procesando...'
                  : mode === 'upload'
                  ? 'Subir a GCP y Guardar en imagenArray'
                  : 'Enviar JSON a imagenArray'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 210,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '860px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  header: {
    padding: '0.9rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#ecfdf5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '0.15rem 0 0',
    fontSize: '0.75rem',
    color: '#64748b',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.25rem',
  },
  searchBar: {
    padding: '0.65rem 1.25rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    gap: '0.5rem',
  },
  searchBox: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.35rem 0.65rem',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '0.82rem',
  },
  searchBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.4rem 0.85rem',
    background: '#0f172a',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
  body: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    flex: 1,
    overflow: 'hidden',
    minHeight: '360px',
  },
  leftCol: {
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sectionLabel: {
    padding: '0.5rem 0.85rem',
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#475569',
    borderBottom: '1px solid #f1f5f9',
  },
  prodList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.4rem',
  },
  prodItem: {
    padding: '0.5rem 0.65rem',
    borderRadius: '6px',
    border: '1px solid #f1f5f9',
    marginBottom: '0.3rem',
    cursor: 'pointer',
  },
  rightCol: {
    padding: '0.85rem 1.1rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  prodCard: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.7rem 0.85rem',
  },
  badgeCount: {
    fontSize: '0.7rem',
    fontWeight: 600,
    padding: '0.15rem 0.5rem',
    borderRadius: '999px',
    background: '#dbeafe',
    color: '#1d4ed8',
  },
  jsonPre: {
    margin: 0,
    padding: '0.5rem',
    background: '#0f172a',
    color: '#38bdf8',
    borderRadius: '6px',
    fontSize: '0.74rem',
    overflowX: 'auto',
    maxHeight: '110px',
  },
  modeTabs: {
    display: 'flex',
    gap: '0.4rem',
  },
  modeTabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.35rem',
    padding: '0.45rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    background: '#fff',
    fontSize: '0.76rem',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
  },
  activeModeTab: {
    background: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
  },
  actionBox: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  fieldLabel: {
    fontSize: '0.76rem',
    color: '#334155',
    fontWeight: 500,
  },
  textInput: {
    padding: '0.45rem 0.6rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.8rem',
    width: '100%',
  },
  resultBox: {
    background: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
  },
  resultPre: {
    margin: 0,
    fontSize: '0.72rem',
    color: '#065f46',
    overflowX: 'auto',
    maxHeight: '95px',
  },
  emptyBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    height: '140px',
    color: '#94a3b8',
    fontSize: '0.82rem',
  },
  feedbackBar: {
    margin: '0 1.25rem 0.5rem',
    padding: '0.5rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.78rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
  },
  footer: {
    padding: '0.75rem 1.25rem',
    borderTop: '1px solid #e2e8f0',
    background: '#f8fafc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    padding: '0.4rem 0.8rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.42rem 0.9rem',
    background: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
  },
};

