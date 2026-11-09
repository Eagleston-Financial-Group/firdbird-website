import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App, normalizePath, resolveRoute } from './App';
import { applyPageMetadata } from './metadata';
import { initTracking } from './tracking';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';
import './styles/layout.css';
import './styles/home.css';
import './styles/pages.css';
import './styles/intake.css';
import './styles/refinements.css';

const pathname = normalizePath(window.location.pathname);
applyPageMetadata(resolveRoute(pathname));
initTracking();

const container = document.getElementById('root');
const app = <React.StrictMode><App pathname={pathname} /></React.StrictMode>;
// Public routes arrive prerendered (scripts/prerender.mjs); upload links and unknown paths get the
// empty shell and render in the browser.
if (container.hasChildNodes()) hydrateRoot(container, app);
else createRoot(container).render(app);
