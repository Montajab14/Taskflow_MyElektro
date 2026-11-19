import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); localStorage.clear(); });

// jsdom n'implémente pas <dialog>.showModal : version minimale pour les tests
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ||= function showModal() { this.open = true; };
  HTMLDialogElement.prototype.close ||= function close(value) {
    if (value !== undefined) this.returnValue = value;
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };
}

// jsdom ne gère pas <form method="dialog"> : on ferme la boîte avec la valeur du bouton cliqué
document.addEventListener('submit', (e) => {
  const form = e.target;
  if (form.method === 'dialog' && form.closest('dialog')) {
    e.preventDefault();
    form.closest('dialog').close(e.submitter?.value);
  }
});
