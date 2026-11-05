import React, { useEffect, useState, useRef } from 'react';
import { apiFetch } from '@/api/client';
import {
  getDocumentStructure,
  createHeader,
  setHeaderContent,
  createFooter,
  setFooterContent,
  formatParagraph,
  setMargins,
  formatText,
  createBullets,
  removeBullets,
  insertDocImageByUrl,
  uploadDocImage,
} from '@/api/docs';
import {
  Save,
  Loader2,
  CheckCircle2,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Indent,
  Outdent,
  List,
  ListOrdered,
  Image as ImageIcon,
  Sliders,
  FileText,
  X,
  Upload,
  Link as LinkIcon,
  Check,
} from 'lucide-react';

export function DocumentEditor({ docId, onSaved }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // Font & size selectors
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(11);

  // Active Modals
  const [showMarginsModal, setShowMarginsModal] = useState(false);
  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [showFooterModal, setShowFooterModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);

  // Margins State (in pt; 72pt = 1 inch = 2.54cm)
  const [margins, setMarginsState] = useState({
    margin_top: 72,
    margin_bottom: 72,
    margin_left: 54,
    margin_right: 54,
  });

  // Header State
  const [headerText, setHeaderText] = useState('');
  const [headerAlignment, setHeaderAlignment] = useState('CENTER');
  const [headerLogoUrl, setHeaderLogoUrl] = useState('');
  const [headerId, setHeaderId] = useState(null);

  // Footer State
  const [footerText, setFooterText] = useState('');
  const [footerAlignment, setFooterAlignment] = useState('CENTER');
  const [footerId, setFooterId] = useState(null);

  // Image Modal State
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageWidth, setImageWidth] = useState(250);
  const [imageHeight, setImageHeight] = useState(150);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Textarea selection tracking
  const textareaRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setFeedback({ text: '', type: '' });

    // 1. Cargar contenido base
    const p1 = apiFetch(`/docs/${docId}/content`)
      .then((data) => setContent(data.content || ''))
      .catch((err) => console.warn('No se pudo cargar contenido directo:', err.message));

    // 2. Cargar estructura real del doc (document_style y mapas headers / footers)
    const p2 = getDocumentStructure(docId)
      .then((data) => {
        if (!data) return;

        // Soportar tanto mapa { id: { header_id, content } } como arreglo
        if (data.headers) {
          const headerValues = Array.isArray(data.headers)
            ? data.headers
            : Object.values(data.headers);
          if (headerValues.length > 0) {
            setHeaderId(headerValues[0].header_id);
            if (headerValues[0].content) {
              setHeaderText(headerValues[0].content.trim());
            }
          }
        }

        if (data.footers) {
          const footerValues = Array.isArray(data.footers)
            ? data.footers
            : Object.values(data.footers);
          if (footerValues.length > 0) {
            setFooterId(footerValues[0].footer_id);
            if (footerValues[0].content) {
              setFooterText(footerValues[0].content.trim());
            }
          }
        }

        const styleObj = data.document_style || data;
        if (styleObj && styleObj.margin_top !== undefined) {
          setMarginsState({
            margin_top: styleObj.margin_top || 72,
            margin_bottom: styleObj.margin_bottom || 72,
            margin_left: styleObj.margin_left || 54,
            margin_right: styleObj.margin_right || 54,
          });
        }
      })
      .catch((err) => console.warn('Estructura de documento no disponible:', err.message));

    Promise.allSettled([p1, p2]).finally(() => setLoading(false));
  }, [docId]);

  const showToast = (text, type = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback({ text: '', type: '' }), 4000);
  };

  // Helper para obtener rango seleccionado en el textarea
  const getSelectionIndices = () => {
    const el = textareaRef.current;
    if (!el) return { start: 1, end: Math.max(content.length, 1) };
    const start = el.selectionStart !== undefined ? el.selectionStart + 1 : 1;
    const end =
      el.selectionEnd !== undefined && el.selectionEnd > el.selectionStart
        ? el.selectionEnd + 1
        : Math.max(content.length, start + 1);
    return { start, end };
  };

  // Guardar contenido general
  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch(`/docs/${docId}/content`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      showToast('Documento guardado con éxito', 'success');
      if (onSaved) onSaved();
    } catch (err) {
      showToast(`Fallo al guardar: ${err.message}`, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Formato de Texto (Bold, Italic, Underline, Font, Size)
  const handleFormatText = async (styleObj) => {
    const { start, end } = getSelectionIndices();
    try {
      await formatText(docId, {
        start_index: start,
        end_index: Math.max(end, start + 1),
        ...styleObj,
      });
      showToast('Estilo de texto aplicado', 'success');
    } catch (err) {
      showToast(`Error de estilo: ${err.message}`, 'error');
    }
  };

  // Alineación de Párrafo
  const handleAlignment = async (alignment) => {
    const { start, end } = getSelectionIndices();
    try {
      await formatParagraph(docId, {
        start_index: start,
        end_index: end,
        alignment,
      });
      showToast(`Alineación ${alignment.toLowerCase()} aplicada`, 'success');
    } catch (err) {
      showToast(`Error al alinear: ${err.message}`, 'error');
    }
  };

  // Sangrías (Indent / Outdent)
  const handleIndent = async (deltaPt) => {
    const { start, end } = getSelectionIndices();
    try {
      await formatParagraph(docId, {
        start_index: start,
        end_index: end,
        indent_start: Math.max(deltaPt, 0),
        indent_first_line: Math.max(deltaPt, 0),
      });
      showToast('Sangría aplicada', 'success');
    } catch (err) {
      showToast(`Error en sangría: ${err.message}`, 'error');
    }
  };

  // Viñetas y Listas
  const handleToggleBullets = async (preset) => {
    const { start, end } = getSelectionIndices();
    try {
      await createBullets(docId, {
        start_index: start,
        end_index: end,
        bullet_preset: preset,
      });
      showToast('Lista aplicada', 'success');
    } catch (err) {
      showToast(`Error en lista: ${err.message}`, 'error');
    }
  };

  const handleRemoveBullets = async () => {
    const { start, end } = getSelectionIndices();
    try {
      await removeBullets(docId, {
        start_index: start,
        end_index: end,
      });
      showToast('Lista removida', 'success');
    } catch (err) {
      showToast(`Error: ${err.message}`, 'error');
    }
  };

  // Guardar Márgenes
  const handleApplyMargins = async () => {
    try {
      await setMargins(docId, margins);
      setShowMarginsModal(false);
      showToast('Márgenes actualizados', 'success');
    } catch (err) {
      alert(`Error configurando márgenes: ${err.message}`);
    }
  };

  // Configurar Encabezado (Membrete)
  const handleSaveHeader = async () => {
    try {
      let currentHId = headerId;
      if (!currentHId) {
        const res = await createHeader(docId, 'DEFAULT');
        currentHId = res.header_id;
        setHeaderId(currentHId);
      }
      await setHeaderContent(docId, currentHId, {
        text: headerText,
        image_url: headerLogoUrl || undefined,
        image_width: 120,
        image_height: 50,
        alignment: headerAlignment,
      });
      setShowHeaderModal(false);
      showToast('Encabezado (Membrete) guardado con éxito', 'success');
    } catch (err) {
      alert(`Error al guardar membrete: ${err.message}`);
    }
  };

  // Configurar Pie de Página (Footer)
  const handleSaveFooter = async () => {
    try {
      let currentFId = footerId;
      if (!currentFId) {
        const res = await createFooter(docId);
        currentFId = res.footer_id;
        setFooterId(currentFId);
      }
      await setFooterContent(docId, currentFId, {
        text: footerText,
        alignment: footerAlignment,
      });
      setShowFooterModal(false);
      showToast('Pie de página guardado con éxito', 'success');
    } catch (err) {
      alert(`Error al guardar pie de página: ${err.message}`);
    }
  };

  // Insertar Imagen en el documento
  const handleInsertImage = async () => {
    const { start } = getSelectionIndices();
    setUploadingImage(true);
    try {
      if (imageMode === 'upload') {
        if (!imageFile) {
          alert('Por favor selecciona una imagen para subir.');
          return;
        }
        await uploadDocImage(docId, {
          imageFile,
          width: imageWidth,
          height: imageHeight,
        });
      } else {
        if (!imageUrl) {
          alert('Por favor ingresa la URL de la imagen.');
          return;
        }
        await insertDocImageByUrl(docId, {
          image_url: imageUrl,
          index: start,
          width: imageWidth,
          height: imageHeight,
        });
      }
      setShowImageModal(false);
      setImageUrl('');
      setImageFile(null);
      showToast('Imagen insertada en el documento', 'success');
    } catch (err) {
      alert(`Error al insertar imagen: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: '0.5rem',
        }}
      >
        <Loader2 className="animate-spin" size={26} color="#2563eb" />
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Cargando editor y estructura del documento...
        </span>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* 1. BARRA SUPERIOR DE HERRAMIENTAS */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarGroup}>
          {/* Selector de Fuente */}
          <select
            value={fontFamily}
            onChange={(e) => {
              const fam = e.target.value;
              setFontFamily(fam);
              handleFormatText({ font_family: fam });
            }}
            style={styles.selectTool}
            title="Tipografía"
          >
            <option value="Arial">Arial</option>
            <option value="Roboto">Roboto</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Calibri">Calibri</option>
            <option value="Courier New">Courier New</option>
          </select>

          {/* Selector de Tamaño */}
          <select
            value={fontSize}
            onChange={(e) => {
              const sz = Number(e.target.value);
              setFontSize(sz);
              handleFormatText({ font_size: sz });
            }}
            style={styles.selectTool}
            title="Tamaño de fuente (pt)"
          >
            {[9, 10, 11, 12, 14, 16, 18, 24, 30].map((sz) => (
              <option key={sz} value={sz}>
                {sz} pt
              </option>
            ))}
          </select>

          <span style={styles.separator} />

          {/* Estilo de Texto */}
          <button
            onClick={() => handleFormatText({ bold: true })}
            style={styles.toolBtn}
            title="Negrita"
          >
            <Bold size={13} />
          </button>
          <button
            onClick={() => handleFormatText({ italic: true })}
            style={styles.toolBtn}
            title="Cursiva"
          >
            <Italic size={13} />
          </button>
          <button
            onClick={() => handleFormatText({ underline: true })}
            style={styles.toolBtn}
            title="Subrayado"
          >
            <Underline size={13} />
          </button>

          <span style={styles.separator} />

          {/* Alineación */}
          <button
            onClick={() => handleAlignment('START')}
            style={styles.toolBtn}
            title="Alinear a la izquierda"
          >
            <AlignLeft size={13} />
          </button>
          <button
            onClick={() => handleAlignment('CENTER')}
            style={styles.toolBtn}
            title="Centrar"
          >
            <AlignCenter size={13} />
          </button>
          <button
            onClick={() => handleAlignment('END')}
            style={styles.toolBtn}
            title="Alinear a la derecha"
          >
            <AlignRight size={13} />
          </button>
          <button
            onClick={() => handleAlignment('JUSTIFIED')}
            style={styles.toolBtn}
            title="Justificar"
          >
            <AlignJustify size={13} />
          </button>

          <span style={styles.separator} />

          {/* Sangrías */}
          <button
            onClick={() => handleIndent(36)}
            style={styles.toolBtn}
            title="Aumentar sangría (0.5 pulg)"
          >
            <Indent size={13} />
          </button>
          <button
            onClick={() => handleIndent(0)}
            style={styles.toolBtn}
            title="Quitar sangría"
          >
            <Outdent size={13} />
          </button>

          <span style={styles.separator} />

          {/* Viñetas y Listas */}
          <button
            onClick={() => handleToggleBullets('BULLET_DISC_CIRCLE_SQUARE')}
            style={styles.toolBtn}
            title="Lista con viñetas"
          >
            <List size={13} />
          </button>
          <button
            onClick={() => handleToggleBullets('NUMBERED_DECIMAL_ALPHA_ROMAN')}
            style={styles.toolBtn}
            title="Lista numerada"
          >
            <ListOrdered size={13} />
          </button>
          <button
            onClick={handleRemoveBullets}
            style={styles.toolBtn}
            title="Quitar viñetas"
          >
            <X size={12} /> Lista
          </button>

          <span style={styles.separator} />

          {/* Imagen */}
          <button
            onClick={() => setShowImageModal(true)}
            style={styles.toolBtn}
            title="Insertar imagen"
          >
            <ImageIcon size={13} /> Imagen
          </button>

          <span style={styles.separator} />

          {/* Modales de Página */}
          <button
            onClick={() => setShowHeaderModal(true)}
            style={styles.toolBtn}
            title="Configurar Membrete / Encabezado"
          >
            <FileText size={13} /> Membrete
          </button>
          <button
            onClick={() => setShowFooterModal(true)}
            style={styles.toolBtn}
            title="Configurar Pie de Página"
          >
            <FileText size={13} /> Pie de Página
          </button>
          <button
            onClick={() => setShowMarginsModal(true)}
            style={styles.toolBtn}
            title="Márgenes de página"
          >
            <Sliders size={13} /> Márgenes
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {feedback.text && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.8rem',
                color: feedback.type === 'success' ? '#059669' : '#dc2626',
              }}
            >
              {feedback.type === 'success' && <CheckCircle2 size={14} />}
              {feedback.text}
            </span>
          )}

          <button onClick={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Guardando...' : 'Guardar Texto'}
          </button>
        </div>
      </div>

      {/* 2. ÁREA DE EDICIÓN DEL DOCUMENTO */}
      <div style={styles.editorWrapper}>
        <div style={styles.pageSheet}>
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{
              ...styles.textarea,
              fontFamily: `${fontFamily}, sans-serif`,
            }}
            placeholder="Escribe el contenido del documento aquí..."
          />
        </div>
      </div>

      {/* 3. MODAL DE MÁRGENES */}
      {showMarginsModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                Márgenes de Página (en puntos pt)
              </h3>
              <button onClick={() => setShowMarginsModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0.5rem 0 1rem' }}>
              72 pt = 1 pulgada (2.54 cm) • 54 pt = 0.75 pulgada (1.9 cm)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={styles.label}>Superior (Top):</label>
                <input
                  type="number"
                  value={margins.margin_top}
                  onChange={(e) =>
                    setMarginsState({ ...margins, margin_top: Number(e.target.value) })
                  }
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={styles.label}>Inferior (Bottom):</label>
                <input
                  type="number"
                  value={margins.margin_bottom}
                  onChange={(e) =>
                    setMarginsState({ ...margins, margin_bottom: Number(e.target.value) })
                  }
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={styles.label}>Izquierdo (Left):</label>
                <input
                  type="number"
                  value={margins.margin_left}
                  onChange={(e) =>
                    setMarginsState({ ...margins, margin_left: Number(e.target.value) })
                  }
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={styles.label}>Derecho (Right):</label>
                <input
                  type="number"
                  value={margins.margin_right}
                  onChange={(e) =>
                    setMarginsState({ ...margins, margin_right: Number(e.target.value) })
                  }
                  style={styles.modalInput}
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowMarginsModal(false)} style={styles.cancelBtn}>
                Cancelar
              </button>
              <button onClick={handleApplyMargins} style={styles.confirmBtn}>
                Aplicar Márgenes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL DE MEMBRETE (HEADER) */}
      {showHeaderModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                Configurar Membrete / Encabezado
              </h3>
              <button onClick={() => setShowHeaderModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '0.75rem',
              }}
            >
              <div>
                <label style={styles.label}>Texto del Membrete:</label>
                <input
                  type="text"
                  placeholder="Ej: Mi Empresa S.A. - NIT 900.123.456"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={styles.label}>URL de Imagen / Logo (Opcional):</label>
                <input
                  type="url"
                  placeholder="https://ejemplo.com/logo.png"
                  value={headerLogoUrl}
                  onChange={(e) => setHeaderLogoUrl(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={styles.label}>Alineación:</label>
                <select
                  value={headerAlignment}
                  onChange={(e) => setHeaderAlignment(e.target.value)}
                  style={styles.modalInput}
                >
                  <option value="START">Izquierda</option>
                  <option value="CENTER">Centro</option>
                  <option value="END">Derecha</option>
                </select>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowHeaderModal(false)} style={styles.cancelBtn}>
                Cancelar
              </button>
              <button onClick={handleSaveHeader} style={styles.confirmBtn}>
                Guardar Membrete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL DE PIE DE PÁGINA (FOOTER) */}
      {showFooterModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>Configurar Pie de Página</h3>
              <button onClick={() => setShowFooterModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                marginTop: '0.75rem',
              }}
            >
              <div>
                <label style={styles.label}>Texto del Pie de Página:</label>
                <input
                  type="text"
                  placeholder="Ej: Documento Confidencial - Todos los derechos reservados"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  style={styles.modalInput}
                />
              </div>
              <div>
                <label style={styles.label}>Alineación:</label>
                <select
                  value={footerAlignment}
                  onChange={(e) => setFooterAlignment(e.target.value)}
                  style={styles.modalInput}
                >
                  <option value="START">Izquierda</option>
                  <option value="CENTER">Centro</option>
                  <option value="END">Derecha</option>
                </select>
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button onClick={() => setShowFooterModal(false)} style={styles.cancelBtn}>
                Cancelar
              </button>
              <button onClick={handleSaveFooter} style={styles.confirmBtn}>
                Guardar Pie de Página
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE INSERCIÓN DE IMAGEN */}
      {showImageModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem' }}>
                Insertar Imagen en el Documento
              </h3>
              <button onClick={() => setShowImageModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.modalTabs}>
              <button
                onClick={() => setImageMode('upload')}
                style={{
                  ...styles.modalTabBtn,
                  ...(imageMode === 'upload' ? styles.activeModalTabBtn : {}),
                }}
              >
                <Upload size={13} /> Subir Archivo
              </button>
              <button
                onClick={() => setImageMode('url')}
                style={{
                  ...styles.modalTabBtn,
                  ...(imageMode === 'url' ? styles.activeModalTabBtn : {}),
                }}
              >
                <LinkIcon size={13} /> Desde URL
              </button>
            </div>

            <div style={{ margin: '1rem 0' }}>
              {imageMode === 'upload' ? (
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                  style={{ fontSize: '0.8rem' }}
                />
              ) : (
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.jpg"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={styles.modalInput}
                />
              )}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.75rem',
                  marginTop: '0.75rem',
                }}
              >
                <div>
                  <label style={styles.label}>Ancho (pt):</label>
                  <input
                    type="number"
                    value={imageWidth}
                    onChange={(e) => setImageWidth(Number(e.target.value))}
                    style={styles.modalInput}
                  />
                </div>
                <div>
                  <label style={styles.label}>Alto (pt):</label>
                  <input
                    type="number"
                    value={imageHeight}
                    onChange={(e) => setImageHeight(Number(e.target.value))}
                    style={styles.modalInput}
                  />
                </div>
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button onClick={() => setShowImageModal(false)} style={styles.cancelBtn}>
                Cancelar
              </button>
              <button
                onClick={handleInsertImage}
                disabled={uploadingImage}
                style={styles.confirmBtn}
              >
                {uploadingImage ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Insertar Imagen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.4rem 0.6rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px 6px 0 0',
    flexWrap: 'wrap',
    gap: '0.4rem',
  },
  toolbarGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flexWrap: 'wrap',
  },
  selectTool: {
    padding: '0.25rem 0.4rem',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.75rem',
    background: '#fff',
    color: '#334155',
    outline: 'none',
    cursor: 'pointer',
  },
  separator: { width: '1px', height: '16px', background: '#cbd5e1', margin: '0 0.2rem' },
  toolBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.3rem 0.5rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.75rem',
    cursor: 'pointer',
    color: '#334155',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.35rem 0.75rem',
    backgroundColor: '#059669',
    color: '#fff',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 600,
    fontSize: '0.8rem',
  },
  editorWrapper: {
    flex: 1,
    overflow: 'auto',
    backgroundColor: '#e2e8f0',
    padding: '1.5rem',
    display: 'flex',
    justifyContent: 'center',
    borderLeft: '1px solid #cbd5e1',
    borderRight: '1px solid #cbd5e1',
    borderBottom: '1px solid #cbd5e1',
    borderRadius: '0 0 6px 6px',
  },
  pageSheet: {
    width: '100%',
    maxWidth: '820px',
    minHeight: '100%',
    background: '#fff',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
  },
  textarea: {
    flex: 1,
    width: '100%',
    minHeight: '500px',
    padding: '2rem',
    border: 'none',
    outline: 'none',
    fontSize: '0.95rem',
    lineHeight: 1.7,
    resize: 'none',
    boxSizing: 'border-box',
    color: '#0f172a',
    background: 'transparent',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  modalContent: {
    background: '#fff',
    borderRadius: '8px',
    width: '420px',
    maxWidth: '90%',
    padding: '1.25rem',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e2e8f0',
    paddingBottom: '0.5rem',
  },
  closeBtn: { background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748b' },
  label: {
    fontSize: '0.78rem',
    color: '#475569',
    display: 'block',
    marginBottom: '0.25rem',
    fontWeight: 500,
  },
  modalInput: {
    width: '100%',
    padding: '0.45rem',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.8rem',
    boxSizing: 'border-box',
  },
  modalTabs: { display: 'flex', gap: '0.5rem', marginTop: '0.75rem' },
  modalTabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    padding: '0.4rem',
    fontSize: '0.78rem',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  activeModalTabBtn: {
    background: '#eff6ff',
    borderColor: '#3b82f6',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  modalFooter: { display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' },
  cancelBtn: {
    padding: '0.4rem 0.8rem',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
  confirmBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.4rem 0.8rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  },
};
