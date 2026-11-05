import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={styles.container}>
      <form onSubmit={handleSubmit} style={styles.card}>
        <h2 style={styles.title}>Gestor Documental</h2>
        <p style={styles.subtitle}>Ingresa tu correo y contraseña para acceder a tu cuenta</p>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.field}>
          <label style={styles.label}>Correo Electrónico</label>
          <div style={styles.inputWrapper}>
            <Mail size={18} style={styles.icon} />
            <input
              type="text"
              required
              autoComplete="email"
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="usuario@empresa.com"
            />
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>Contraseña</label>
          <div style={styles.inputWrapper}>
            <Lock size={18} style={styles.icon} />
            <input
              type="password"
              required
              autoComplete="current-password"
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
        </div>

        <button type="submit" disabled={submitting} style={styles.button}>
          {submitting ? 'Verificando cuenta...' : 'Iniciar Sesión'}
        </button>

        <div style={styles.helperBox}>
          <span style={{ fontWeight: 600 }}>Cuentas de prueba locales:</span>
          <span>admin@empresa.com / admin123</span>
          <span>editor@empresa.com / editor123</span>
          <span>lector@empresa.com / lector123</span>
        </div>
      </form>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  card: {
    background: '#fff',
    padding: '2.5rem',
    borderRadius: '12px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
    width: '100%',
    maxWidth: '410px',
  },
  title: {
    margin: '0 0 0.5rem',
    fontSize: '1.5rem',
    color: '#0f172a',
    textAlign: 'center',
    fontWeight: 700,
  },
  subtitle: {
    margin: '0 0 1.5rem',
    fontSize: '0.875rem',
    color: '#64748b',
    textAlign: 'center',
  },
  error: {
    background: '#fef2f2',
    border: '1px solid #fee2e2',
    color: '#dc2626',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '1.25rem',
    fontSize: '0.85rem',
  },
  field: {
    marginBottom: '1.25rem',
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: '0.4rem',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    padding: '0.6rem 0.8rem',
    background: '#fff',
  },
  icon: {
    color: '#94a3b8',
    marginRight: '0.6rem',
  },
  input: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '0.9rem',
    color: '#1e293b',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.95rem',
    cursor: 'pointer',
  },
  helperBox: {
    marginTop: '1.25rem',
    padding: '0.65rem 0.75rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.15rem',
    fontSize: '0.73rem',
    color: '#64748b',
  },
};
