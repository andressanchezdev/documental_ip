import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  listTabs,
  createTab,
  renameTab,
  duplicateTab,
  deleteTab,
  getSheetValues,
  setCellFormula,
  saveSheetData,
  alterDimensions,
  resizeDimensions,
  setBasicFilter,
  removeBasicFilter,
  uploadImageToCell,
  insertImageByUrl,
} from '@/api/sheets';
import {
  Save,
  Plus,
  Minus,
  Loader2,
  Trash2,
  Copy,
  Edit2,
  Image as ImageIcon,
  Filter,
  Maximize2,
  FunctionSquare,
  Check,
  X,
  Upload,
  Link as LinkIcon,
} from 'lucide-react';

function getColumnLabel(index) {
  let label = '';
  let temp = index;
  while (temp >= 0) {
    label = String.fromCharCode((temp % 26) + 65) + label;
    temp = Math.floor(temp / 26) - 1;
  }
  return label;
}

function getCellAddress(rowIndex, colIndex) {
  return `${getColumnLabel(colIndex)}${rowIndex + 1}`;
}

export function SheetEditor({ docId, onSaved }) {
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [loadingTabs, setLoadingTabs] = useState(true);
  const [loadingValues, setLoadingValues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');

  // Grid Data
  const [rows, setRows] = useState([]);
  const [renderOption, setRenderOption] = useState('FORMATTED_VALUE'); // 'FORMATTED_VALUE' | 'FORMULA'

  // Selected Cell & Formula bar
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [formulaInput, setFormulaInput] = useState('');

  // Modals & Popovers
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTabMode, setImageTabMode] = useState('upload'); // 'upload' | 'url'
  const [imageUrl, setImageUrl] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imageFitMode, setImageFitMode] = useState(1);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [filterActive, setFilterActive] = useState(false);
  const fileInputRef = useRef(null);

  const notify = (msg) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3500);
  };

  // 1. Cargar lista de pestañas
  const loadTabs = useCallback(async () => {
    setLoadingTabs(true);
    try {
      const tabList = await listTabs(docId);
      if (Array.isArray(tabList) && tabList.length > 0) {
        setTabs(tabList);
        setActiveTab((prev) => {
          if (prev && tabList.some((t) => t.sheet_id === prev.sheet_id)) {
            return prev;
          }
          return tabList[0];
        });
      } else {
        const defaultTab = { sheet_id: 0, title: 'Hoja 1' };
        setTabs([defaultTab]);
        setActiveTab(defaultTab);
      }
    } catch (err) {
      console.warn('No se pudieron listar pestañas con /sheets/:id/tabs, usando fallback:', err);
      const defaultTab = { sheet_id: 0, title: 'Hoja 1' };
      setTabs([defaultTab]);
      setActiveTab(defaultTab);
    } finally {
      setLoadingTabs(false);
    }
  }, [docId]);

  useEffect(() => {
    loadTabs();
  }, [loadTabs]);

  // 2. Cargar datos de la pestaña activa
  const loadSheetData = useCallback(async () => {
    if (!activeTab) return;
    setLoadingValues(true);
    try {
      const res = await getSheetValues(docId, {
        sheet_name: activeTab.title,
        render_option: renderOption,
      });

      const rawRows = res.rows || [];
      const existingColCount = rawRows.reduce(
        (max, r) => Math.max(max, r ? r.length : 0),
        0
      );
      const targetCols = Math.max(existingColCount + 5, 12);
      const targetRowsCount = Math.max(rawRows.length + 20, 30);

      const normalizedRows = [];
      for (let r = 0; r < targetRowsCount; r++) {
        const originalRow = rawRows[r] || [];
        const newRow = Array(targetCols).fill('');
        for (let c = 0; c < targetCols; c++) {
          newRow[c] =
            originalRow[c] !== undefined && originalRow[c] !== null
              ? String(originalRow[c])
              : '';
        }
        normalizedRows.push(newRow);
      }

      setRows(normalizedRows);
      const currentVal = normalizedRows[selectedCell.row]?.[selectedCell.col] || '';
      setFormulaInput(currentVal);
    } catch (err) {
      console.error('Error cargando valores:', err);
    } finally {
      setLoadingValues(false);
    }
  }, [docId, activeTab, renderOption]);

  useEffect(() => {
    loadSheetData();
  }, [loadSheetData]);

  // Manejar click en celda
  const handleSelectCell = (rIdx, cIdx) => {
    setSelectedCell({ row: rIdx, col: cIdx });
    setFormulaInput(rows[rIdx]?.[cIdx] || '');
  };

  // Manejar cambio en celda
  const handleCellChange = (rIdx, cIdx, value) => {
    setRows((prev) => {
      const next = prev.map((row, r) => (r === rIdx ? [...row] : row));
      next[rIdx][cIdx] = value;
      return next;
    });
    if (selectedCell.row === rIdx && selectedCell.col === cIdx) {
      setFormulaInput(value);
    }
  };

  // Aplicar valor o fórmula desde la barra de fórmulas a la celda en Google Sheets
  const handleApplyFormula = async () => {
    const cellAddr = getCellAddress(selectedCell.row, selectedCell.col);
    handleCellChange(selectedCell.row, selectedCell.col, formulaInput);

    try {
      await setCellFormula(docId, {
        sheet_name: activeTab?.title,
        cell: cellAddr,
        formula: formulaInput,
        value: formulaInput,
      });
      notify(`Celda ${cellAddr} guardada`);
      if (formulaInput.startsWith('=')) {
        loadSheetData();
      }
    } catch (err) {
      alert(`Error al guardar en ${cellAddr}: ${err.message}`);
    }
  };

  // Guardar toda la matriz de la pestaña activa en Google Sheets
  const handleSaveSheet = async () => {
    if (!activeTab) return;
    setSaving(true);
    try {
      await saveSheetData(docId, {
        sheet_name: activeTab.title,
        rows,
      });
      notify('Hoja de cálculo guardada exitosamente');
      if (onSaved) onSaved();
    } catch (err) {
      alert(`Error guardando hoja: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Crear nueva pestaña
  const handleCreateTab = async () => {
    const title = prompt('Nombre de la nueva pestaña:', `Hoja ${tabs.length + 1}`);
    if (!title || !title.trim()) return;

    try {
      await createTab(docId, { title: title.trim(), row_count: 100, column_count: 26 });
      await loadTabs();
    } catch (err) {
      alert(`Error creando pestaña: ${err.message}`);
    }
  };

  // Renombrar pestaña
  const handleRenameTab = async (tab) => {
    const newTitle = prompt('Nuevo nombre para la pestaña:', tab.title);
    if (!newTitle || !newTitle.trim() || newTitle === tab.title) return;

    try {
      await renameTab(docId, tab.sheet_id, newTitle.trim());
      await loadTabs();
    } catch (err) {
      alert(`Error renombrando pestaña: ${err.message}`);
    }
  };

  // Duplicar pestaña
  const handleDuplicateTab = async (tab) => {
    try {
      await duplicateTab(docId, tab.sheet_id, `Copia de ${tab.title}`);
      await loadTabs();
    } catch (err) {
      alert(`Error duplicando pestaña: ${err.message}`);
    }
  };

  // Eliminar pestaña
  const handleDeleteTab = async (tab) => {
    if (tabs.length <= 1) {
      alert('No puedes eliminar la única pestaña del documento.');
      return;
    }
    if (!confirm(`¿Eliminar definitivamente la pestaña "${tab.title}"?`)) return;

    try {
      await deleteTab(docId, tab.sheet_id);
      await loadTabs();
    } catch (err) {
      alert(`Error eliminando pestaña: ${err.message}`);
    }
  };

  // Insertar o eliminar filas / columnas
  const handleDimensionOp = async (dimension, operation = 'INSERT') => {
    if (!activeTab) return;
    const startIndex = dimension === 'ROWS' ? selectedCell.row : selectedCell.col;
    try {
      await alterDimensions(docId, {
        sheet_id: activeTab.sheet_id,
        dimension,
        operation,
        start_index: startIndex,
        end_index: startIndex + 1,
        inherit_from_before: true,
      });
      loadSheetData();
    } catch (err) {
      alert(`Error en operación de ${dimension === 'ROWS' ? 'fila' : 'columna'}: ${err.message}`);
    }
  };

  // Auto-ajuste de columnas
  const handleResizeColumns = async () => {
    if (!activeTab) return;
    try {
      await resizeDimensions(docId, {
        sheet_id: activeTab.sheet_id,
        dimension: 'COLUMNS',
        start_index: 0,
        end_index: rows[0]?.length || 10,
      });
      notify('Columnas auto-ajustadas');
    } catch (err) {
      alert(`Error redimensionando: ${err.message}`);
    }
  };

  // Filtros
  const handleToggleFilter = async () => {
    if (!activeTab) return;
    try {
      if (filterActive) {
        await removeBasicFilter(docId, activeTab.sheet_id);
        setFilterActive(false);
        notify('Filtro desactivado');
      } else {
        await setBasicFilter(docId, {
          sheet_id: activeTab.sheet_id,
          start_row_index: 0,
          end_row_index: rows.length,
          start_col_index: 0,
          end_col_index: rows[0]?.length || 10,
        });
        setFilterActive(true);
        notify('Filtro básico activado');
      }
    } catch (err) {
      alert(`Error con el filtro: ${err.message}`);
    }
  };

  // Insertar imagen a la celda seleccionada
  const handleInsertImage = async () => {
    const cellAddr = getCellAddress(selectedCell.row, selectedCell.col);
    setUploadingImage(true);
    try {
      if (imageTabMode === 'upload') {
        if (!imageFile) {
          alert('Por favor selecciona un archivo de imagen.');
          return;
        }
        await uploadImageToCell(docId, {
          imageFile,
          cell: cellAddr,
          sheet_name: activeTab?.title,
          mode: imageFitMode,
        });
      } else {
        if (!imageUrl) {
          alert('Por favor ingresa la URL de la imagen.');
          return;
        }
        await insertImageByUrl(docId, {
          sheet_name: activeTab?.title,
          cell: cellAddr,
          image_url: imageUrl,
          mode: imageFitMode,
        });
      }
      setShowImageModal(false);
      setImageUrl('');
      setImageFile(null);
      notify(`Imagen insertada en celda ${cellAddr}`);
      loadSheetData();
    } catch (err) {
      alert(`Error al insertar imagen: ${err.message}`);
    } finally {
      setUploadingImage(false);
    }
  };

  if (loadingTabs) {
    return (
      <div style={styles.centerContainer}>
        <Loader2 size={24} className="animate-spin" color="#2563eb" />
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Cargando estructura de la hoja...
        </span>
      </div>
    );
  }

  const colCount = rows[0]?.length || 10;
  const currentCellAddr = getCellAddress(selectedCell.row, selectedCell.col);

  return (
    <div style={styles.container}>
      {/* 1. BARRA SUPERIOR DE ACCIONES */}
      <div style={styles.toolbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          {/* Alternar Fórmulas vs Valores */}
          <button
            onClick={() =>
              setRenderOption((prev) => (prev === 'FORMULA' ? 'FORMATTED_VALUE' : 'FORMULA'))
            }
            style={{
              ...styles.toolBtn,
              background: renderOption === 'FORMULA' ? '#eff6ff' : '#fff',
              borderColor: renderOption === 'FORMULA' ? '#3b82f6' : '#cbd5e1',
              color: renderOption === 'FORMULA' ? '#1d4ed8' : '#334155',
            }}
            title="Alternar entre ver fórmulas y valores calculados"
          >
            <FunctionSquare size={14} />
            <span>{renderOption === 'FORMULA' ? 'Viendo Fórmulas' : 'Viendo Valores'}</span>
          </button>

          <span style={styles.separator} />

          {/* Insertar / Eliminar Fila y Columna */}
          <button
            onClick={() => handleDimensionOp('ROWS', 'INSERT')}
            style={styles.toolBtn}
            title="Insertar fila en la posición actual"
          >
            <Plus size={13} /> Fila
          </button>
          <button
            onClick={() => handleDimensionOp('ROWS', 'DELETE')}
            style={styles.toolBtn}
            title="Eliminar fila seleccionada"
          >
            <Minus size={13} /> Fila
          </button>
          <button
            onClick={() => handleDimensionOp('COLUMNS', 'INSERT')}
            style={styles.toolBtn}
            title="Insertar columna en la posición actual"
          >
            <Plus size={13} /> Columna
          </button>
          <button
            onClick={() => handleDimensionOp('COLUMNS', 'DELETE')}
            style={styles.toolBtn}
            title="Eliminar columna seleccionada"
          >
            <Minus size={13} /> Columna
          </button>
          <button
            onClick={handleResizeColumns}
            style={styles.toolBtn}
            title="Auto-ajustar ancho de columnas"
          >
            <Maximize2 size={13} /> Auto-ajustar
          </button>

          <span style={styles.separator} />

          {/* Filtro básico */}
          <button
            onClick={handleToggleFilter}
            style={{
              ...styles.toolBtn,
              background: filterActive ? '#fef3c7' : '#fff',
              borderColor: filterActive ? '#f59e0b' : '#cbd5e1',
              color: filterActive ? '#b45309' : '#334155',
            }}
            title="Activar / Desactivar filtro de datos"
          >
            <Filter size={13} /> Filtro
          </button>

          {/* Insertar Imagen en Celda */}
          <button
            onClick={() => setShowImageModal(true)}
            style={styles.toolBtn}
            title="Insertar imagen en celda activa"
          >
            <ImageIcon size={13} /> Imagen en Celda
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          {feedback && (
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
              {feedback}
            </span>
          )}
          {loadingValues && <Loader2 size={15} className="animate-spin" color="#64748b" />}
          <button
            onClick={handleSaveSheet}
            disabled={saving}
            style={styles.saveSheetBtn}
            title="Guardar todos los cambios de la pestaña actual en Google Sheets"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saving ? 'Guardando...' : 'Guardar Hoja'}</span>
          </button>
        </div>
      </div>

      {/* 2. BARRA DE FÓRMULAS ESTILO EXCEL */}
      <div style={styles.formulaBar}>
        <div style={styles.cellBadge}>{currentCellAddr}</div>
        <div style={styles.fxSymbol}>fx</div>
        <input
          type="text"
          value={formulaInput}
          onChange={(e) => setFormulaInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleApplyFormula();
          }}
          placeholder="Escribe un valor o fórmula (ej: =SUM(A1:A10)) y presiona Enter"
          style={styles.formulaInput}
        />
        <button onClick={handleApplyFormula} style={styles.applyBtn} title="Aplicar a la celda">
          <Check size={14} />
        </button>
      </div>

      {/* 3. TABLA CUADRÍCULA */}
      <div style={styles.tableWrapper}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.cornerHeader}>#</th>
              {Array.from({ length: colCount }).map((_, idx) => (
                <th key={idx} style={styles.colHeader}>
                  {getColumnLabel(idx)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rIdx) => (
              <tr key={rIdx}>
                <td style={styles.rowHeader}>{rIdx + 1}</td>
                {row.map((cellValue, cIdx) => {
                  const isSelected = selectedCell.row === rIdx && selectedCell.col === cIdx;
                  return (
                    <td
                      key={cIdx}
                      onClick={() => handleSelectCell(rIdx, cIdx)}
                      style={{
                        ...styles.cellWrapper,
                        outline: isSelected ? '2px solid #2563eb' : 'none',
                        zIndex: isSelected ? 1 : 'auto',
                      }}
                    >
                      <input
                        type="text"
                        value={cellValue}
                        onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                        style={styles.cellInput}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. BARRA INFERIOR DE PESTAÑAS (TABS) */}
      <div style={styles.tabsBar}>
        <div style={styles.tabsScrollList}>
          {tabs.map((tab) => {
            const isActive = activeTab?.sheet_id === tab.sheet_id;
            return (
              <div
                key={tab.sheet_id}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...styles.tabItem,
                  ...(isActive ? styles.activeTabItem : {}),
                }}
              >
                <span>{tab.title}</span>
                {isActive && (
                  <div style={styles.tabActions} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleRenameTab(tab)}
                      style={styles.tabActionBtn}
                      title="Renombrar pestaña"
                    >
                      <Edit2 size={11} />
                    </button>
                    <button
                      onClick={() => handleDuplicateTab(tab)}
                      style={styles.tabActionBtn}
                      title="Duplicar pestaña"
                    >
                      <Copy size={11} />
                    </button>
                    {tabs.length > 1 && (
                      <button
                        onClick={() => handleDeleteTab(tab)}
                        style={{ ...styles.tabActionBtn, color: '#ef4444' }}
                        title="Eliminar pestaña"
                      >
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button onClick={handleCreateTab} style={styles.addTabBtn} title="Crear nueva pestaña">
          <Plus size={14} /> Nueva Pestaña
        </button>
      </div>

      {/* 5. MODAL INSERTAR IMAGEN */}
      {showImageModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>
                Insertar Imagen en Celda ({currentCellAddr})
              </h3>
              <button onClick={() => setShowImageModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>

            <div style={styles.modalTabs}>
              <button
                onClick={() => setImageTabMode('upload')}
                style={{
                  ...styles.modalTabBtn,
                  ...(imageTabMode === 'upload' ? styles.activeModalTabBtn : {}),
                }}
              >
                <Upload size={13} /> Subir Archivo
              </button>
              <button
                onClick={() => setImageTabMode('url')}
                style={{
                  ...styles.modalTabBtn,
                  ...(imageTabMode === 'url' ? styles.activeModalTabBtn : {}),
                }}
              >
                <LinkIcon size={13} /> Desde URL
              </button>
            </div>

            <div style={{ margin: '1rem 0' }}>
              {imageTabMode === 'upload' ? (
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                    style={{ fontSize: '0.85rem' }}
                  />
                  {imageFile && (
                    <p style={{ fontSize: '0.75rem', color: '#16a34a', marginTop: '0.5rem' }}>
                      Archivo seleccionado: {imageFile.name}
                    </p>
                  )}
                </div>
              ) : (
                <input
                  type="url"
                  placeholder="https://ejemplo.com/imagen.png"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  style={styles.modalInput}
                />
              )}

              <div style={{ marginTop: '1rem' }}>
                <label
                  style={{
                    fontSize: '0.8rem',
                    color: '#475569',
                    display: 'block',
                    marginBottom: '0.3rem',
                  }}
                >
                  Modo de ajuste:
                </label>
                <select
                  value={imageFitMode}
                  onChange={(e) => setImageFitMode(Number(e.target.value))}
                  style={styles.modalSelect}
                >
                  <option value={1}>1: Ajustar a celda manteniendo proporción (Recomendado)</option>
                  <option value={2}>2: Estirar a los bordes de la celda</option>
                  <option value={3}>3: Tamaño original</option>
                </select>
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
                <span>{uploadingImage ? 'Insertando...' : 'Insertar Imagen'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#fff',
  },
  centerContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    gap: '0.5rem',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.45rem 0.65rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px 6px 0 0',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  toolBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.3rem 0.55rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#334155',
    cursor: 'pointer',
  },
  saveSheetBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    background: '#2563eb',
    border: 'none',
    borderRadius: '5px',
    fontSize: '0.76rem',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  },
  separator: {
    width: '1px',
    height: '18px',
    background: '#cbd5e1',
    margin: '0 0.1rem',
  },
  formulaBar: {
    display: 'flex',
    alignItems: 'center',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
    padding: '0.25rem 0.5rem',
    gap: '0.4rem',
  },
  cellBadge: {
    minWidth: '48px',
    textAlign: 'center',
    padding: '0.2rem 0.4rem',
    background: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#1e293b',
  },
  fxSymbol: {
    fontStyle: 'italic',
    fontWeight: 700,
    color: '#64748b',
    fontSize: '0.8rem',
    padding: '0 0.2rem',
  },
  formulaInput: {
    flex: 1,
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    padding: '0.28rem 0.5rem',
    fontSize: '0.8rem',
    outline: 'none',
    color: '#0f172a',
  },
  applyBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.28rem 0.5rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  tableWrapper: {
    flex: 1,
    overflow: 'auto',
    borderLeft: '1px solid #e2e8f0',
    borderRight: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0',
    maxHeight: 'calc(100vh - 270px)',
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  cornerHeader: {
    width: '45px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    textAlign: 'center',
    fontSize: '0.75rem',
    color: '#64748b',
    position: 'sticky',
    top: 0,
    left: 0,
    zIndex: 3,
  },
  colHeader: {
    minWidth: '100px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    padding: '0.3rem',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#475569',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  },
  rowHeader: {
    width: '45px',
    background: '#f8fafc',
    border: '1px solid #cbd5e1',
    textAlign: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#64748b',
    position: 'sticky',
    left: 0,
    zIndex: 1,
  },
  cellWrapper: {
    border: '1px solid #e2e8f0',
    padding: 0,
    backgroundColor: '#fff',
    position: 'relative',
  },
  cellInput: {
    width: '100%',
    border: 'none',
    padding: '0.35rem 0.5rem',
    fontSize: '0.8rem',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'transparent',
  },
  tabsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.25rem 0.5rem',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderTop: 'none',
    borderRadius: '0 0 6px 6px',
    overflowX: 'auto',
  },
  tabsScrollList: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  tabItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.3rem 0.75rem',
    background: '#e2e8f0',
    color: '#475569',
    borderRadius: '4px 4px 0 0',
    fontSize: '0.78rem',
    fontWeight: 500,
    cursor: 'pointer',
    userSelect: 'none',
  },
  activeTabItem: {
    background: '#fff',
    color: '#1d4ed8',
    fontWeight: 600,
    boxShadow: '0 -1px 3px rgba(0,0,0,0.05)',
  },
  tabActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.2rem',
    marginLeft: '0.3rem',
  },
  tabActionBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0.1rem',
    color: '#64748b',
    display: 'flex',
  },
  addTabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.3rem 0.6rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#2563eb',
    cursor: 'pointer',
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
    paddingBottom: '0.65rem',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
  },
  modalTabs: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.75rem',
  },
  modalTabBtn: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    padding: '0.4rem',
    fontSize: '0.8rem',
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
  modalInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.85rem',
    boxSizing: 'border-box',
  },
  modalSelect: {
    width: '100%',
    padding: '0.45rem',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    fontSize: '0.8rem',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.5rem',
    marginTop: '1.25rem',
  },
  cancelBtn: {
    padding: '0.4rem 0.8rem',
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#475569',
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
