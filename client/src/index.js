import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// ── Suppress ResizeObserver loop warnings (harmless browser quirk) ──────────
const origError = window.onerror;
window.onerror = (message, ...args) => {
  if (typeof message === 'string' && message.includes('ResizeObserver loop')) return true;
  return origError?.(...args);
};
const origConsoleError = console.error.bind(console);
console.error = (...args) => {
  if (args[0]?.includes?.('ResizeObserver loop')) return;
  origConsoleError(...args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
