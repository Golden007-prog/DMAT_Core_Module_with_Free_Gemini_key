import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { sessionStore } from './state/sessionStore';
import './styles.css';

// e2e test hook — dev server only, never in production builds
if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).__coreforge = { sessionStore };
}

// GitHub Pages hosts the app under /<repo-name>/ — Vite injects the base
const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
