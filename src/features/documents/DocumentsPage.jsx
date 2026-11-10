import React, { useState, useEffect, useCallback } from 'react';
import { apiFetch, buildApiUrl } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { DocumentList, isSpreadsheetDoc } from './DocumentList';
import { DocumentPreview } from './DocumentPreview';
import { DocumentEditor } from './DocumentEditor';
import { SheetEditor } from './SheetEditor';
import { FolderPermissionsModal } from '@/features/permissions/FolderPermissionsModal';
import { Eye, Edit3, FileSearch, Download, Loader2 } from 'lucide-react';

export function DocumentsPage() {
  const { canRead, canEdit, canStorage, refreshPermissions } = useAuth();
  const [docs, setDocs] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [mode, setMode] = useState('preview');
  const [downloadingFormat, setDownloadingFormat] = useState(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [folderRefreshTrigger, setFolderRefreshTrigger] = useState(0);

  const isSpreadsheet = isSpreadsheetDoc(selectedDoc);

  const handleDocMoved = useCallback((fileId, targetFolderId) => {
    setDocs((prevDocs) =>
      prevDocs.map((doc) => {
        if (doc.id === fileId) {
          const newParents = targetFolderId ? [targetFolderId] : [];
          return { ...doc, parents: newParents };
        }
        return doc;
      })
    );
  }, []);

  const loadDocs = useCallback(async () => {
    try {
      const data = await apiFetch('/docs');
      setDocs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando documentos:', err);
    }
  }, []);

  useEffect(() => {
    loadDocs();
  }, [loadDocs]);

  // Si se le retira el permiso de edición en caliente, volver a Vista Previa
  useEffect(() => {
    if (!canEdit && mode === 'edit') {
      setMode('preview');
    }
  }, [canEdit, mode]);

  const handleDownload = async (format) => {
    if (!selectedDoc) return;
    setDownloadingFormat(format);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        buildApiUrl(`/docs/${selectedDoc.id}/download?format=${format}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Error al generar la descarga');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;

      const rawTitle = selectedDoc.title || selectedDoc.name || 'documento';
      const baseTitle = rawTitle.replace(/\.[^/.]+$/, '');
      link.download = `${baseTitle}.${format}`;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      alert(`Error descargando archivo: ${err.message}`);
    } finally {
      setDownloadingFormat(null);
    }
  };

  return (
    <div style={styles.layout}>
      <header style={styles.navbar}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: '#0f172a' }}>
          <FileSearch size={20} color="#2563eb" />
          <span>Gestor Documental</span>
        </div>
      </header>

      <div style={styles.workspace}>
        <DocumentList
          docs={docs}
          selectedDoc={selectedDoc}
          onSelectDoc={(doc) => {
            setSelectedDoc(doc);
            setMode('preview');
          }}
          onDocUploaded={(newDoc) => {
            setDocs((prev) => [newDoc, ...prev]);
            setSelectedDoc(newDoc);
            setMode('preview');
          }}
          onDocMoved={handleDocMoved}
          onRefreshDocs={loadDocs}
          onOpenPermissions={() => setShowPermissionsModal(true)}
          refreshTrigger={folderRefreshTrigger}
        />

        <main style={styles.main}>
          {selectedDoc ? (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={styles.docHeader}>
                <h2 style={{ fontSize: '1.05rem', margin: 0, color: '#0f172a', fontWeight: 600 }}>
                  {selectedDoc.title || selectedDoc.name}
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Botones de Descarga (Requiere canRead) */}
                  {canRead && (
                    <div style={styles.downloadGroup}>
                      <button
                        onClick={() => handleDownload('pdf')}
                        disabled={Boolean(downloadingFormat)}
                        style={styles.downloadBtn}
                        title="Descargar como PDF"
                      >
                        {downloadingFormat === 'pdf' ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Download size={14} />
                        )}
                        <span>PDF</span>
                      </button>

                      {isSpreadsheet ? (
                        <button
                          onClick={() => handleDownload('xlsx')}
                          disabled={Boolean(downloadingFormat)}
                          style={styles.downloadBtn}
                          title="Descargar como archivo de Excel (.xlsx)"
                        >
                          {downloadingFormat === 'xlsx' ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          <span>XLSX</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleDownload('docx')}
                          disabled={Boolean(downloadingFormat)}
                          style={styles.downloadBtn}
                          title="Descargar como archivo de Word (.docx)"
                        >
                          {downloadingFormat === 'docx' ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          <span>DOCX</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Pestañas de Modo */}
                  <div style={styles.modeTabs}>
                    <button
                      onClick={() => setMode('preview')}
                      style={{ ...styles.tab, ...(mode === 'preview' ? styles.activeTab : {}) }}
                    >
                      <Eye size={15} /> Vista Previa
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => setMode('edit')}
                        style={{ ...styles.tab, ...(mode === 'edit' ? styles.activeTab : {}) }}
                      >
                        <Edit3 size={15} /> Editar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div style={styles.viewport}>
                {mode === 'preview' ? (
                  <DocumentPreview
                    docId={selectedDoc.id}
                    title={selectedDoc.title || selectedDoc.name}
                  />
                ) : isSpreadsheet ? (
                  <SheetEditor docId={selectedDoc.id} onSaved={loadDocs} />
                ) : (
                  <DocumentEditor docId={selectedDoc.id} onSaved={loadDocs} />
                )}
              </div>
            </div>
          ) : (
            <div style={styles.emptyState}>
              <FileSearch size={40} color="#cbd5e1" style={{ marginBottom: '0.75rem' }} />
              <p style={{ margin: 0 }}>
                Navega por las carpetas de Google Drive en el panel izquierdo y selecciona un archivo para comenzar.
              </p>
            </div>
          )}
        </main>
      </div>

      <FolderPermissionsModal
        isOpen={showPermissionsModal}
        onClose={() => setShowPermissionsModal(false)}
        onSaved={() => {
          refreshPermissions();
          loadDocs();
          setFolderRefreshTrigger((prev) => prev + 1);
        }}
      />
    </div>
  );
}

const styles = {
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    background: '#f8fafc',
  },
  navbar: {
    height: '54px',
    borderBottom: '1px solid #e2e8f0',
    background: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.25rem',
  },
  permPills: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
  },
  pillRead: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.18rem 0.45rem',
    borderRadius: '999px',
    backgroundColor: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
  },
  pillEdit: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.18rem 0.45rem',
    borderRadius: '999px',
    backgroundColor: '#ecfdf5',
    color: '#047857',
    border: '1px solid #a7f3d0',
  },
  pillStorage: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.18rem 0.45rem',
    borderRadius: '999px',
    backgroundColor: '#fffbeb',
    color: '#b45309',
    border: '1px solid #fde68a',
  },
  permissionsBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#1d4ed8',
    fontWeight: 600,
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.35rem 0.75rem',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#475569',
    fontWeight: 500,
  },
  workspace: {
    flex: 1,
    display: 'flex',
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    padding: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  docHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.75rem',
  },
  downloadGroup: {
    display: 'flex',
    gap: '0.35rem',
  },
  downloadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.3rem',
    padding: '0.35rem 0.65rem',
    background: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: '#334155',
    transition: 'all 0.15s ease',
  },
  modeTabs: {
    display: 'flex',
    gap: '0.25rem',
    background: '#e2e8f0',
    padding: '0.2rem',
    borderRadius: '6px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    border: 'none',
    background: 'transparent',
    padding: '0.35rem 0.75rem',
    borderRadius: '4px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: '#475569',
  },
  activeTab: {
    background: '#fff',
    color: '#2563eb',
    fontWeight: 600,
    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
  },
  viewport: {
    flex: 1,
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '0.75rem',
    overflow: 'hidden',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#94a3b8',
    fontSize: '0.9rem',
  },
};
