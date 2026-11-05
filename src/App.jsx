import React from 'react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { LoginPage } from '@/features/auth/LoginPage';
import { DocumentsPage } from '@/features/documents/DocumentsPage';

function Root() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <DocumentsPage /> : <LoginPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}