import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { ConfirmProvider } from '../context/ConfirmContext';

export function renderApp(route = '/login') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider><AuthProvider><ConfirmProvider><App /></ConfirmProvider></AuthProvider></ToastProvider>
    </MemoryRouter>,
  );
}

export const json = (body, status = 200) => Promise.resolve({
  ok: status < 300, status, json: () => (body === undefined ? Promise.reject(new Error()) : Promise.resolve(body)),
});
