import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/app';
import { AuthProvider } from '@/lib/auth/auth-context';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
