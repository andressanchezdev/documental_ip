import React, { useEffect, useState } from 'react';
import { apiFetch } from '@/api/client';
import { Loader2 } from 'lucide-react';

export function DocumentPreview({ docId, title }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let activeUrl = null;
    setLoading(true);
    setError(null);

    apiFetch(`/docs/${docId}/preview`)
      .then((blob) => {
        activeUrl = URL.createObjectURL(blob);
        setBlobUrl(activeUrl);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));

    return () => {
      if (activeUrl) URL.revokeObjectURL(activeUrl);
    };
  }, [docId]);

  if (loading) {
    return (
      <div style={styles.center}>
        <Loader2 className="animate-spin" size={32} color="#2563eb" />
        <p style={{ marginTop: '0.75rem', color: '#64748b', fontSize: '0.9rem' }}>
          Cargando previsualización...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
      </div>
    );
  }

  return (
    <iframe
      src={blobUrl}
      title={title}
      style={{ width: '100%', height: '100%', border: 'none', borderRadius: '6px' }}
    />
  );
}

const styles = {
  center: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
};