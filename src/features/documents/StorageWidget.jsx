import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/api/client';
import { HardDrive } from 'lucide-react';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 MB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function StorageWidget() {
  const [storage, setStorage] = useState(null);

  useEffect(() => {
    apiFetch('/storage')
      .then((data) => setStorage(data))
      .catch((err) => console.error('Error cargando almacenamiento:', err));
  }, []);

  if (!storage || !storage.limit) return null;

  const usedText = formatBytes(storage.usage);
  const totalText = formatBytes(storage.limit);
  const percentage = Math.min(100, Math.max(storage.usage > 0 ? 1 : 0, Math.round((storage.usage / storage.limit) * 100)));

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#475569' }}>
          <HardDrive size={15} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Almacenamiento Drive</span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1e293b' }}>
          {percentage}%
        </span>
      </div>

      <div style={styles.progressBar}>
        <div
          style={{
            ...styles.progressFill,
            width: `${percentage}%`,
            backgroundColor: percentage > 85 ? '#ef4444' : '#2563eb',
          }}
        />
      </div>

      <div style={styles.footer}>
        <span>{usedText} usados de {totalText}</span>
      </div>
    </div>
  );
}

const styles = {
  card: {
    padding: '0.85rem 1rem',
    borderTop: '1px solid #e2e8f0',
    backgroundColor: '#fff',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.4rem',
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#e2e8f0',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  footer: {
    fontSize: '0.7rem',
    color: '#64748b',
    marginTop: '0.35rem',
  },
};