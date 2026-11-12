import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { checkThemes } from './data/themes';
import './styles/fonts';
import './styles/global.scss';

if (import.meta.env.DEV) checkThemes();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
