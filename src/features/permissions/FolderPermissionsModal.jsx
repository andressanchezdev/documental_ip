import React, { useState, useEffect } from 'react';
import { getUsers, getUserFolderPermissions, updateUserFolderPermissions } from '@/api/permissions';
import {
  Shield,
  User,
  Folder,
  Check,
  X,
  Loader2,
  CheckSquare,
  Square,
  AlertCircle,
  Search,
  Lock,
  Eye,
  Edit3,
  HardDrive,
} from 'lucide-react';

export function FolderPermissionsModal({ isOpen, onClose, onSaved }) {
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [folders, setFolders] = useState([]);
  const [capabilities, setCapabilities] = useState({
    can_read: true,
    can_edit: false,
    can_storage: false,
    is_admin: false,
  });
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // 1. Cargar lista de usuarios al abrir
  useEffect(() => {
    if (!isOpen) return;
    setLoadingUsers(true);
    setFeedback({ text: '', type: '' });
    getUsers()
      .then((data) => {
        const userList = Array.isArray(data) ? data : [];
        setUsers(userList);
        const defaultUser = userList.find((u) => u.role === 'editor') || userList[0];
        if (defaultUser) {
          setSelectedUserId(String(defaultUser.id));
        }
      })
      .catch((err) => {
        setFeedback({ text: `Error cargando usuarios: ${err.message}`, type: 'error' });
      })
      .finally(() => setLoadingUsers(false));
  }, [isOpen]);

  // 2. Cargar capacidades y carpetas del usuario seleccionado
  useEffect(() => {
    if (!selectedUserId || !isOpen) return;
    setLoadingFolders(true);
    setFeedback({ text: '', type: '' });

    getUserFolderPermissions(selectedUserId)
      .then((res) => {
        setFolders(Array.isArray(res.folders) ? res.folders : []);
        if (res.capabilities) {
          setCapabilities({
            can_read: Boolean(res.capabilities.can_read),
            can_edit: Boolean(res.capabilities.can_edit),
            can_storage: Boolean(res.capabilities.can_storage),
            is_admin: Boolean(res.capabilities.is_admin),
          });
        }
      })
      .catch((err) => {
        setFeedback({ text: `Error cargando permisos: ${err.message}`, type: 'error' });
      })
      .finally(() => setLoadingFolders(false));
  }, [selectedUserId, isOpen]);

  if (!isOpen) return null;

  const selectedUser = users.find((u) => String(u.id) === String(selectedUserId));
  const isTargetAdmin = selectedUser?.role === 'admin' || capabilities.is_admin;

  const handleToggleFolder = (folderId) => {
    if (isTargetAdmin) return;
    setFolders((prev) =>
      prev.map((f) => (f.folder_id === folderId ? { ...f, allowed: !f.allowed } : f))
    );
  };

  const handleToggleCapability = (key) => {
    if (isTargetAdmin) return;
    setCapabilities((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      // Si se activa edición o almacenamiento, asegurar que tenga lectura activa
      if ((key === 'can_edit' || key === 'can_storage') && next[key]) {
        next.can_read = true;
      }
      // Si se retira lectura, desactivar edición y almacenamiento
      if (key === 'can_read' && !next.can_read) {
        next.can_edit = false;
        next.can_storage = false;
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (isTargetAdmin) return;
    setFolders((prev) => prev.map((f) => ({ ...f, allowed: true })));
  };

  const handleDeselectAll = () => {
    if (isTargetAdmin) return;
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        allowed: f.reason === 'creator' ? true : false,
      }))
    );
  };

  const handleSave = async () => {
    if (!selectedUserId) return;
    setSaving(true);
    setFeedback({ text: '', type: '' });

    try {
      const allowedIds = folders.filter((f) => f.allowed).map((f) => f.folder_id);
      await updateUserFolderPermissions(selectedUserId, {
        folder_ids: allowedIds,
        can_read: capabilities.can_read,
        can_edit: capabilities.can_edit,
        can_storage: capabilities.can_storage,
      });
      setFeedback({
        text: 'Permisos de Lectura, Edición, Almacenamiento y Carpetas guardados correctamente.',
        type: 'success',
      });
      if (onSaved) onSaved();
    } catch (err) {
      setFeedback({ text: `Fallo al guardar: ${err.message}`, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const filteredFolders = folders.filter((f) =>
    (f.folder_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const allowedCount = folders.filter((f) => f.allowed).length;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={styles.iconBadge}>
              <Shield size={18} color="#2563eb" />
            </div>
            <div>
              <h3 style={styles.title}>Gestión de Permisos sobre Google Drive</h3>
              <p style={styles.subtitle}>
                Otorga o retira permisos de Lectura, Edición, Almacenamiento y acceso a Carpetas a los usuarios de la DB
              </p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn} title="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Selector de Usuario */}
        <div style={styles.userSection}>
          <label style={styles.label}>
            <User size={14} /> Usuario de la Base de Datos:
          </label>
          {loadingUsers ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#64748b' }}>
              <Loader2 size={15} className="animate-spin" /> Cargando usuarios...
            </div>
          ) : (
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              style={styles.select}
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.email || u.username} ({u.username}) — Rol base: {u.role?.toUpperCase()}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Nivel 1: Capacidades Globales sobre el Drive (Lectura, Edición, Almacenamiento) */}
        <div style={styles.capabilitiesSection}>
          <div style={styles.capHeader}>
            1. Permisos de Acción sobre Google Drive
          </div>
          <div style={styles.capGrid}>
            {/* Lectura */}
            <div
              onClick={() => handleToggleCapability('can_read')}
              style={{
                ...styles.capCard,
                borderColor: capabilities.can_read ? '#3b82f6' : '#e2e8f0',
                backgroundColor: capabilities.can_read ? '#eff6ff' : '#f8fafc',
                cursor: isTargetAdmin ? 'default' : 'pointer',
              }}
            >
              <div style={styles.capCardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  <Eye size={15} color={capabilities.can_read ? '#2563eb' : '#64748b'} />
                  <span>Lectura</span>
                </div>
                {capabilities.can_read ? (
                  <CheckSquare size={17} color="#2563eb" />
                ) : (
                  <Square size={17} color="#94a3b8" />
                )}
              </div>
              <span style={styles.capDesc}>
                Ver carpetas permitidas, Vista Previa PDF y descargar documentos.
              </span>
            </div>

            {/* Edición */}
            <div
              onClick={() => handleToggleCapability('can_edit')}
              style={{
                ...styles.capCard,
                borderColor: capabilities.can_edit ? '#10b981' : '#e2e8f0',
                backgroundColor: capabilities.can_edit ? '#ecfdf5' : '#f8fafc',
                cursor: isTargetAdmin ? 'default' : 'pointer',
              }}
            >
              <div style={styles.capCardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  <Edit3 size={15} color={capabilities.can_edit ? '#059669' : '#64748b'} />
                  <span>Edición</span>
                </div>
                {capabilities.can_edit ? (
                  <CheckSquare size={17} color="#059669" />
                ) : (
                  <Square size={17} color="#94a3b8" />
                )}
              </div>
              <span style={styles.capDesc}>
                Modificar contenido, estilos, membretes y fórmulas en Docs y Sheets.
              </span>
            </div>

            {/* Almacenamiento */}
            <div
              onClick={() => handleToggleCapability('can_storage')}
              style={{
                ...styles.capCard,
                borderColor: capabilities.can_storage ? '#f59e0b' : '#e2e8f0',
                backgroundColor: capabilities.can_storage ? '#fffbeb' : '#f8fafc',
                cursor: isTargetAdmin ? 'default' : 'pointer',
              }}
            >
              <div style={styles.capCardTop}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>
                  <HardDrive size={15} color={capabilities.can_storage ? '#d97706' : '#64748b'} />
                  <span>Almacenamiento</span>
                </div>
                {capabilities.can_storage ? (
                  <CheckSquare size={17} color="#d97706" />
                ) : (
                  <Square size={17} color="#94a3b8" />
                )}
              </div>
              <span style={styles.capDesc}>
                Subir archivos al Drive, crear carpetas/documentos y mover archivos.
              </span>
            </div>
          </div>
        </div>

        {/* Barra de Búsqueda y Acciones Rápidas de Carpetas */}
        <div style={styles.toolbar}>
          <div style={styles.searchBox}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="2. Filtrar carpetas de Google Drive..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={styles.searchInput}
            />
          </div>

          {!isTargetAdmin && (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button onClick={handleSelectAll} style={styles.quickBtn}>
                Marcar todas
              </button>
              <button onClick={handleDeselectAll} style={styles.quickBtn}>
                Desmarcar todas
              </button>
            </div>
          )}
        </div>

        {/* Aviso si es Admin */}
        {isTargetAdmin && (
          <div style={styles.adminNotice}>
            <Lock size={14} />
            <span>
              Los usuarios con rol <strong>ADMIN</strong> tienen acceso total garantizado a todas las carpetas y capacidades de Drive.
            </span>
          </div>
        )}

        {/* Lista Checklist de Carpetas */}
        <div style={styles.listContainer}>
          {loadingFolders ? (
            <div style={styles.centerBox}>
              <Loader2 size={22} className="animate-spin" color="#2563eb" />
              <span>Consultando carpetas de Google Drive...</span>
            </div>
          ) : filteredFolders.length === 0 ? (
            <div style={styles.centerBox}>
              <Folder size={28} color="#cbd5e1" />
              <span>No se encontraron carpetas en Google Drive.</span>
            </div>
          ) : (
            filteredFolders.map((item) => {
              const isCreator = item.reason === 'creator';
              const isLocked = isTargetAdmin || isCreator;

              return (
                <div
                  key={item.folder_id}
                  onClick={() => !isLocked && handleToggleFolder(item.folder_id)}
                  style={{
                    ...styles.folderRow,
                    backgroundColor: item.allowed ? '#f8fafc' : '#fff',
                    cursor: isLocked ? 'default' : 'pointer',
                    opacity: isLocked && !item.allowed ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    {item.allowed ? (
                      <CheckSquare size={18} color={isLocked ? '#64748b' : '#2563eb'} />
                    ) : (
                      <Square size={18} color="#cbd5e1" />
                    )}
                    <Folder size={17} color={item.allowed ? '#f59e0b' : '#94a3b8'} />
                    <span
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: item.allowed ? 600 : 400,
                        color: item.allowed ? '#0f172a' : '#64748b',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.folder_name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {isCreator && <span style={styles.badgeCreator}>Creador</span>}
                    {item.allowed && !isCreator && !isTargetAdmin && (
                      <span style={styles.badgeAllowed}>Permitida</span>
                    )}
                    {!item.allowed && <span style={styles.badgeBlocked}>Sin acceso</span>}
                  </div>
                </div>
              );
            })
          )}
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
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {allowedCount} de {folders.length} carpetas habilitadas
          </span>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={onClose} style={styles.cancelBtn}>
              Cerrar
            </button>
            {!isTargetAdmin && (
              <button onClick={handleSave} disabled={saving || loadingFolders} style={styles.saveBtn}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Guardando...' : 'Guardar Permisos'}
              </button>
            )}
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
    zIndex: 200,
    padding: '1rem',
  },
  modal: {
    background: '#fff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15)',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    margin: 0,
    fontSize: '0.98rem',
    fontWeight: 700,
    color: '#0f172a',
  },
  subtitle: {
    margin: '0.15rem 0 0',
    fontSize: '0.76rem',
    color: '#64748b',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '0.25rem',
    borderRadius: '6px',
  },
  userSection: {
    padding: '0.85rem 1.25rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.45rem',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.78rem',
    fontWeight: 600,
    color: '#334155',
  },
  select: {
    padding: '0.5rem 0.65rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    fontSize: '0.85rem',
    color: '#0f172a',
    backgroundColor: '#fff',
    outline: 'none',
  },
  capabilitiesSection: {
    padding: '0.85rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    backgroundColor: '#fff',
  },
  capHeader: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#475569',
    marginBottom: '0.55rem',
    letterSpacing: '0.03em',
  },
  capGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.6rem',
  },
  capCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.6rem 0.7rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.3rem',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  capCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  capDesc: {
    fontSize: '0.7rem',
    color: '#64748b',
    lineHeight: 1.3,
  },
  toolbar: {
    padding: '0.65rem 1.25rem',
    borderBottom: '1px solid #e2e8f0',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.35rem 0.6rem',
    flex: 1,
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    fontSize: '0.8rem',
    width: '100%',
    color: '#1e293b',
  },
  quickBtn: {
    padding: '0.35rem 0.6rem',
    fontSize: '0.74rem',
    fontWeight: 600,
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #cbd5e1',
    borderRadius: '5px',
    cursor: 'pointer',
  },
  adminNotice: {
    margin: '0.6rem 1.25rem 0',
    padding: '0.55rem 0.75rem',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '6px',
    color: '#1e40af',
    fontSize: '0.78rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  listContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '0.5rem 1.25rem',
    minHeight: '190px',
    maxHeight: '260px',
  },
  centerBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '170px',
    gap: '0.5rem',
    color: '#64748b',
    fontSize: '0.85rem',
  },
  folderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.6rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid #f1f5f9',
    marginBottom: '0.35rem',
    userSelect: 'none',
  },
  badgeCreator: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    backgroundColor: '#dbeafe',
    color: '#1d4ed8',
  },
  badgeAllowed: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    backgroundColor: '#dcfce7',
    color: '#15803d',
  },
  badgeBlocked: {
    fontSize: '0.68rem',
    fontWeight: 600,
    padding: '0.15rem 0.45rem',
    borderRadius: '4px',
    backgroundColor: '#f1f5f9',
    color: '#64748b',
  },
  feedbackBar: {
    margin: '0 1.25rem 0.6rem',
    padding: '0.55rem 0.75rem',
    borderRadius: '6px',
    border: '1px solid',
    fontSize: '0.8rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  footer: {
    padding: '0.85rem 1.25rem',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#f8fafc',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cancelBtn: {
    padding: '0.45rem 0.85rem',
    backgroundColor: '#fff',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
  },
  saveBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.45rem 0.95rem',
    backgroundColor: '#2563eb',
    border: 'none',
    borderRadius: '6px',
    fontSize: '0.8rem',
    fontWeight: 600,
    color: '#fff',
    cursor: 'pointer',
  },
};
