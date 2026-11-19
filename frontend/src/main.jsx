import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { ConfirmProvider } from './context/ConfirmContext';
import './styles/style.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HashRouter>
      <ToastProvider>
        <AuthProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </AuthProvider>
      </ToastProvider>
    </HashRouter>
  </StrictMode>,
);
