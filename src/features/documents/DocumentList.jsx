import React, { useEffect, useRef, useState, useMemo } from 'react';
import { apiFetch } from '@/api/client';
import { createBlankDocument } from '@/api/docs';
import { useAuth } from '@/context/AuthContext';
import { StorageWidget } from './StorageWidget';
import {
  FileText,
  FileSpreadsheet,
  Plus,
  FolderPlus,
  Folder,
  FolderOpen,
  Home,
  Loader2,
  Shield,
  ChevronRight,
  ArrowLeft,
  Search,
  LogOut,
  User,
} from 'lucide-react';

export function isSpreadsheetDoc(doc) {
  if (!doc) return false;
  const mime = (doc.mime_type || '').toLowerCase();
  if (
    mime.includes('spreadsheet') ||
    mime.includes('excel') ||
    mime.includes('csv')
  ) {
    return true;
  }
  const title = (doc.title || doc.name || '').toLowerCase();
  return title.endsWith('.xlsx') || title.endsWith('.xls') || title.endsWith('.csv');
}

export function DocumentList({
  docs = [],
  selectedDoc,
  onSelectDoc,
  onDocUploaded,
  onRefreshDocs,
  onOpenPermissions,
  refreshTrigger,
}) {
  const { user, logout, canStorage, isAdmin } = useAuth();
  const fileInputRef = useRef(null);
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null); // null = Mi Unidad (Raíz)
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [creatingBlank, setCreatingBlank] = useState(false);
  const [dragOverTarget, setDragOverTarget] = useState(null);

  const loadFolders = () => {
    apiFetch('/docs/folders')
      .then((data) => setFolders(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Error cargando carpetas:', err);
        setFolders([]);
      });
  };

  useEffect(() => {
    loadFolders();
  }, [refreshTrigger]);

  // Mapa rápido de carpetas conocidas por ID
  const folderMap = useMemo(() => {
    const map = new Map();
    for (const f of folders) {
      map.set(f.id, f);
    }
    return map;
  }, [folders]);

  // Construir ruta de navegación (Breadcrumbs)
  const breadcrumbs = useMemo(() => {
    const trail = [];
    let pointer = currentFolderId ? folderMap.get(currentFolderId) : null;
    const visited = new Set();
    while (pointer && !visited.has(pointer.id)) {
      visited.add(pointer.id);
      trail.unshift(pointer);
      const parentId = (pointer.parents || []).find((pid) => folderMap.has(pid));
      pointer = parentId ? folderMap.get(parentId) : null;
    }
    return trail;
  }, [currentFolderId, folderMap]);

  // Determinar si un elemento (carpeta o documento) pertenece al nivel actual
  const belongsToCurrentFolder = (item) => {
    const parents = Array.isArray(item.parents) ? item.parents : [];
    if (!currentFolderId) {
      // Está en la raíz si ninguno de sus parents es una subcarpeta conocida
      return !parents.some((pid) => folderMap.has(pid));
    }
    return parents.includes(currentFolderId);
  };

  const visibleSubfolders = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return folders.filter((f) => (f.name || '').toLowerCase().includes(q));
    }
    return folders.filter((f) => belongsToCurrentFolder(f));
  }, [folders, currentFolderId, folderMap, searchQuery]);

  const visibleDocs = useMemo(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return docs.filter((d) => (d.title || d.name || '').toLowerCase().includes(q));
    }
    return docs.filter((d) => belongsToCurrentFolder(d));
  }, [docs, currentFolderId, folderMap, searchQuery]);

  const handleCreateFolder = async () => {
    const name = window.prompt('Nombre de la nueva carpeta en esta ubicación:');
    if (!name || !name.trim()) return;

    setCreatingFolder(true);
    try {
      await apiFetch('/folders', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          parent_id: currentFolderId || '',
          allowed_roles: ['editor'],
        }),
      });
      loadFolders();
    } catch (err) {
      alert(`Error creando carpeta: ${err.message}`);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleCreateBlank = async (type) => {
    const label = type === 'sheet' ? 'Hoja de Cálculo' : 'Documento de Texto';
    const title = window.prompt(`Nombre para nuevo ${label}:`, `Nuevo ${label}`);
    if (!title || !title.trim()) return;

    setCreatingBlank(true);
    try {
      const created = await createBlankDocument({
        title: title.trim(),
        type,
        folder_id: currentFolderId || '',
      });
      if (onDocUploaded) onDocUploaded(created);
    } catch (err) {
      alert(`Error creando ${label}: ${err.message}`);
    } finally {
      setCreatingBlank(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);
    if (currentFolderId) {
      formData.append('folder_id', currentFolderId);
    }

    setUploading(true);
    try {
      const newDoc = await apiFetch('/docs/upload', {
        method: 'POST',
        body: formData,
      });
      if (onDocUploaded) onDocUploaded(newDoc);
    } catch (err) {
      alert(`Error al subir archivo: ${err.message}`);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Drag & Drop handlers
  const onDragStart = (e, docId) => {
    e.dataTransfer.setData('text/plain', docId);
  };

  const onDragOver = (e, targetId) => {
    if (!canStorage) return;
    e.preventDefault();
    setDragOverTarget(targetId);
  };

  const onDragLeave = () => {
    setDragOverTarget(null);
  };

  const onDrop = async (e, targetFolderId) => {
    if (!canStorage) return;
    e.preventDefault();
    setDragOverTarget(null);
    const fileId = e.dataTransfer.getData('text/plain');
    if (!fileId) return;

    try {
      await apiFetch(`/docs/${fileId}/move`, {
        method: 'PUT',
        body: JSON.stringify({ target_folder_id: targetFolderId }),
      });
      if (onRefreshDocs) onRefreshDocs();
    } catch (err) {
      alert(`Error al mover archivo: ${err.message}`);
    }
  };

  return (
    <aside style={styles.sidebar}>
      {/* Cabecera de Acciones */}
      <div style={styles.header}>
        <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>
          Explorador Drive
        </h3>
        <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
          {isAdmin && onOpenPermissions && (
            <button
              onClick={onOpenPermissions}
              title="Gestionar Permisos de Usuarios sobre Drive"
              style={styles.folderBtn}
            >
              <Shield size={14} color="#2563eb" />
            </button>
          )}

          {canStorage && (
            <>
              <button
                onClick={handleCreateFolder}
                disabled={creatingFolder}
                title="Nueva carpeta aquí"
                style={styles.folderBtn}
              >
                {creatingFolder ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <FolderPlus size={14} />
                )}
              </button>

              <button
                onClick={() => handleCreateBlank('doc')}
                disabled={creatingBlank}
                title="Crear nuevo Google Doc en blanco"
                style={styles.folderBtn}
              >
                <FileText size={14} color="#2563eb" />
              </button>

              <button
                onClick={() => handleCreateBlank('sheet')}
                disabled={creatingBlank}
                title="Crear nueva Hoja de Cálculo en blanco"
                style={styles.folderBtn}
              >
                <FileSpreadsheet size={14} color="#16a34a" />
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".doc,.docx,.xls,.xlsx,.csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />

              <button
                onClick={() => fileInputRef.current.click()}
                disabled={uploading}
                style={styles.uploadBtn}
                title="Subir archivo a la carpeta actual"
              >
                {uploading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {uploading ? 'Subiendo' : 'Subir'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Buscador rápido */}
      <div style={styles.searchBar}>
        <Search size={14} color="#94a3b8" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar carpeta o documento..."
          style={styles.searchInput}
        />
      </div>

      {/* Barra de Ruta Organizada (Breadcrumbs) */}
      <div style={styles.breadcrumbBar}>
        {currentFolderId && (
          <button
            onClick={() => {
              const parentId =
                breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].id : null;
              setCurrentFolderId(parentId);
            }}
            style={styles.backBtn}
            title="Subir un nivel"
          >
            <ArrowLeft size={13} />
          </button>
        )}

        <div
          onClick={() => setCurrentFolderId(null)}
          onDragOver={(e) => onDragOver(e, 'root')}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, '')}
          style={{
            ...styles.breadcrumbItem,
            fontWeight: !currentFolderId ? 700 : 500,
            color: !currentFolderId ? '#2563eb' : '#475569',
            backgroundColor: dragOverTarget === 'root' ? '#dbeafe' : 'transparent',
          }}
          title="Ir a Mi Unidad ( o suelta un archivo aquí para moverlo a la raíz )"
        >
          <Home size={13} />
          <span>Mi Unidad</span>
        </div>

        {breadcrumbs.map((crumb) => {
          const isCurrent = crumb.id === currentFolderId;
          return (
            <React.Fragment key={crumb.id}>
              <ChevronRight size={12} color="#94a3b8" />
              <div
                onClick={() => setCurrentFolderId(crumb.id)}
                onDragOver={(e) => onDragOver(e, crumb.id)}
                onDragLeave={onDragLeave}
                onDrop={(e) => onDrop(e, crumb.id)}
                style={{
                  ...styles.breadcrumbItem,
                  fontWeight: isCurrent ? 700 : 500,
                  color: isCurrent ? '#2563eb' : '#475569',
                  backgroundColor: dragOverTarget === crumb.id ? '#dbeafe' : 'transparent',
                }}
              >
                <span style={styles.crumbText}>{crumb.name}</span>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Contenido Organizado de la Ubicación Actual */}
      <div style={styles.list}>
        {/* 1. Carpetas en esta ubicación */}
        <div style={styles.sectionHeader}>
          Carpetas ({visibleSubfolders.length})
        </div>

        {visibleSubfolders.length === 0 ? (
          <div style={styles.emptyFolderHint}>
            No hay subcarpetas en esta ubicación
          </div>
        ) : (
          visibleSubfolders.map((f) => (
            <div
              key={f.id}
              onClick={() => {
                setSearchQuery('');
                setCurrentFolderId(f.id);
              }}
              onDragOver={(e) => onDragOver(e, f.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, f.id)}
              style={{
                ...styles.folderRow,
                backgroundColor: dragOverTarget === f.id ? '#dbeafe' : '#f8fafc',
                borderColor: dragOverTarget === f.id ? '#2563eb' : '#e2e8f0',
              }}
              title="Haz clic para abrir carpeta o arrastra un documento aquí"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                <Folder size={16} color="#f59e0b" />
                <span style={styles.folderName}>{f.name}</span>
              </div>
              <ChevronRight size={14} color="#94a3b8" />
            </div>
          ))
        )}

        {/* 2. Documentos y Hojas dentro de la carpeta actual */}
        <div style={{ ...styles.sectionHeader, marginTop: '0.85rem' }}>
          {currentFolderId ? 'Archivos en esta carpeta' : 'Archivos en Mi Unidad'} ({visibleDocs.length})
        </div>

        {visibleDocs.length === 0 ? (
          <div style={styles.emptyBox}>
            <FolderOpen size={24} color="#cbd5e1" />
            <span>No hay documentos en esta carpeta.</span>
          </div>
        ) : (
          visibleDocs.map((doc) => {
            const isSelected = selectedDoc?.id === doc.id;
            const isSheet = isSpreadsheetDoc(doc);
            return (
              <div
                key={doc.id}
                draggable={canStorage}
                onDragStart={(e) => onDragStart(e, doc.id)}
                onClick={() => onSelectDoc(doc)}
                style={{
                  ...styles.item,
                  backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                  borderLeft: isSelected ? '3px solid #2563eb' : '3px solid transparent',
                  cursor: canStorage ? 'grab' : 'pointer',
                }}
              >
                {isSheet ? (
                  <FileSpreadsheet size={18} color={isSelected ? '#16a34a' : '#22c55e'} />
                ) : (
                  <FileText size={18} color={isSelected ? '#2563eb' : '#64748b'} />
                )}
                <div style={styles.itemMeta}>
                  <span style={styles.itemTitle}>{doc.title || doc.name}</span>
                  <span style={styles.itemDate}>
                    {isSheet ? 'Hoja de Cálculo' : 'Documento'} •{' '}
                    {doc.updated_at ? new Date(doc.updated_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <StorageWidget />

      {/* Footer del Side Menu con Permisos Drive, Usuario y Cerrar Sesión */}
      <div style={styles.footerContainer}>
        {isAdmin && (
          <button
            onClick={onOpenPermissions}
            style={styles.adminPermBtn}
            title="Gestionar permisos de Lectura, Edición, Almacenamiento y Carpetas por usuario"
          >
            <Shield size={14} color="#2563eb" />
            <span>Permisos Drive</span>
          </button>
        )}

        <div style={styles.userProfileRow}>
          <div style={styles.userAvatar}>
            <User size={15} color="#475569" />
          </div>

          <div style={styles.userInfo}>
            <span style={styles.userEmail} title={user?.email || user?.username}>
              {user?.email || user?.username}
            </span>
            <span style={styles.userRoleBadge}>
              {user?.role || 'usuario'}
            </span>
          </div>

          <button
            onClick={logout}
            style={styles.footerLogoutBtn}
            title="Cerrar Sesión"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '330px',
    borderRight: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: '#fff',
  },
  header: {
    padding: '0.75rem 0.9rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.45rem 0.9rem',
    borderBottom: '1px solid #f1f5f9',
    backgroundColor: '#f8fafc',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    width: '100%',
    fontSize: '0.78rem',
    color: '#1e293b',
  },
  breadcrumbBar: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.2rem',
    padding: '0.45rem 0.75rem',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#fff',
    minHeight: '34px',
  },
  backBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.2rem 0.35rem',
    border: '1px solid #cbd5e1',
    borderRadius: '4px',
    background: '#f8fafc',
    color: '#334155',
    cursor: 'pointer',
    marginRight: '0.2rem',
  },
  breadcrumbItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.76rem',
    padding: '0.15rem 0.35rem',
    borderRadius: '4px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  crumbText: {
    maxWidth: '100px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sectionHeader: {
    padding: '0.5rem 0.9rem 0.25rem',
    fontSize: '0.68rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#94a3b8',
    letterSpacing: '0.05em',
  },
  emptyFolderHint: {
    padding: '0.3rem 0.9rem',
    fontSize: '0.75rem',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  folderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    margin: '0.2rem 0.65rem',
    padding: '0.5rem 0.65rem',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  folderName: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#1e293b',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  uploadBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.4rem 0.6rem',
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.76rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
  folderBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.4rem 0.48rem',
    background: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
    paddingBottom: '0.5rem',
  },
  emptyBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    padding: '1.5rem 1rem',
    color: '#94a3b8',
    fontSize: '0.8rem',
    textAlign: 'center',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
    padding: '0.65rem 0.9rem',
    borderBottom: '1px solid #f8fafc',
    userSelect: 'none',
  },
  itemMeta: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  itemTitle: {
    fontSize: '0.83rem',
    fontWeight: 600,
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  itemDate: {
    fontSize: '0.71rem',
    color: '#94a3b8',
    marginTop: '0.12rem',
  },
  footerContainer: {
    borderTop: '1px solid #e2e8f0',
    padding: '0.65rem 0.75rem',
    backgroundColor: '#fafafa',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  adminPermBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.45rem',
    width: '100%',
    padding: '0.45rem 0.75rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    color: '#1d4ed8',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  userProfileRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
    padding: '0.4rem 0.5rem',
    borderRadius: '6px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
  },
  userAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
  },
  userEmail: {
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#1e293b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userRoleBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#64748b',
    letterSpacing: '0.02em',
  },
  footerLogoutBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#fff',
    color: '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    flexShrink: 0,
  },
};
