import galmuri11 from 'galmuri/dist/Galmuri11.woff2';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { checkThemes } from './data/themes';
import './styles/global.scss';

// Only the one pixel face we use (the package CSS pulls in ~50MB of variants).
document.fonts.add(new FontFace('Galmuri11', `url(${galmuri11})`));

if (import.meta.env.DEV) checkThemes();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
