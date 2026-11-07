import React from 'react';
import { createRoot } from 'react-dom/client';
import { Header, Footer } from './components/Layout';
import Home from './pages/Home';
import ApplicationPage, { applicationIndexMetadata, isApplicationPath } from './pages/Applications';
import { applications } from './data/applications';
import { informationalPages, pageMetadata } from './pages/InformationalPages';
import { applyPageMetadata } from './metadata';
import './styles.css';
import intakeCss from './intake.css?raw';
import './enhancements.css';

const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
const Information = informationalPages[pathname];
const application = applications[pathname];
const metadata = pageMetadata[pathname] || applicationIndexMetadata[pathname] || application;
const usesIntakeStyles = isApplicationPath(pathname) || metadata?.usesIntakeStyles;
applyPageMetadata(metadata, pathname, application, usesIntakeStyles);

// Load application styles only on intake-related pages.
if (usesIntakeStyles) {
  const style = document.createElement('style');
  style.dataset.intakeStyles = '';
  style.textContent = intakeCss;
  document.head.appendChild(style);
}

function App() {
  return <><Header /><main id="main">{pathname==='/' ? <Home /> : isApplicationPath(pathname) ? <ApplicationPage pathname={pathname} /> : Information ? <Information /> : <section className="section wrap"><span className="eyebrow">PAGE NOT FOUND</span><h1>Let’s get you back on track.</h1><p>Choose the coverage or service you need.</p><a className="button" href="/">Back to home ↗</a></section>}</main><Footer /></>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
