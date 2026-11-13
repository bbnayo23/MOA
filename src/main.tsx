import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { checkThemes } from './data/themes';
import './styles/fonts';
import './styles/global.scss';

if (import.meta.env.DEV) checkThemes();
// installable app: offline-capable shell (public/sw.js); dev stays uncached
if (import.meta.env.PROD && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
