import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginWithEmail, getMyDrivePermissions } from '@/api/auth';

const AuthContext = createContext(null);

function deriveDefaultPermissions(user) {
  if (!user) {
    return { canRead: false, canEdit: false, canStorage: false, isAdmin: false };
  }
  const role = user.role || 'reader';
  const isAdmin = role === 'admin' || Boolean(user.is_admin);
  return {
    canRead: user.can_read !== undefined ? Boolean(user.can_read) : true,
    canEdit:
      user.can_edit !== undefined
        ? Boolean(user.can_edit)
        : role === 'admin' || role === 'editor',
    canStorage:
      user.can_storage !== undefined
        ? Boolean(user.can_storage)
        : role === 'admin' || role === 'editor',
    isAdmin,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [permissions, setPermissions] = useState({
    canRead: true,
    canEdit: false,
    canStorage: false,
    isAdmin: false,
  });
  const [loading, setLoading] = useState(true);

  const refreshPermissions = useCallback(async (currentUser) => {
    const activeUser = currentUser || user;
    if (!localStorage.getItem('token')) return;
    try {
      const caps = await getMyDrivePermissions();
      if (caps) {
        const updatedPerms = {
          canRead: Boolean(caps.can_read),
          canEdit: Boolean(caps.can_edit),
          canStorage: Boolean(caps.can_storage),
          isAdmin: Boolean(caps.is_admin) || activeUser?.role === 'admin',
        };
        setPermissions(updatedPerms);
      }
    } catch {
      // Fallback a los permisos derivados del usuario si el endpoint aún no responde
      setPermissions(deriveDefaultPermissions(activeUser));
    }
  }, [user]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUser(parsed);
        setPermissions(deriveDefaultPermissions(parsed));
        refreshPermissions(parsed);
      } catch (e) {
        console.error('Error parseando usuario guardado:', e);
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const res = await loginWithEmail(email, password);

    const resolvedToken = res.token || res.access_token || res.jwt || '';
    const resolvedUser = res.user || res.data || {
      id: res.id || 1,
      email: email.trim(),
      username: res.username || email.trim(),
      role: res.role || 'editor',
    };

    if (!resolvedUser.email) {
      resolvedUser.email = email.trim();
    }

    localStorage.setItem('token', resolvedToken);
    localStorage.setItem('user', JSON.stringify(resolvedUser));
    setToken(resolvedToken);
    setUser(resolvedUser);

    const initialPerms = deriveDefaultPermissions(resolvedUser);
    setPermissions(initialPerms);
    await refreshPermissions(resolvedUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
    setPermissions({
      canRead: false,
      canEdit: false,
      canStorage: false,
      isAdmin: false,
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        refreshPermissions,
        canRead: permissions.canRead,
        canEdit: permissions.canEdit,
        canStorage: permissions.canStorage,
        isAdmin: permissions.isAdmin,
        isAuthenticated: !!token,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
