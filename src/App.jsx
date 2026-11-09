// The whole page for one pathname. Shared by the browser entry (src/main.jsx) and the build-time
// prerenderer (src/entry-server.jsx), so it must not touch window/document during render.
import { useEffect, useLayoutEffect } from 'react';
import { Header, Footer, MobileActions } from './components/Layout';
import Icon from './components/Icon';
import Home from './pages/Home';
import ApplicationPage, { applicationIndexMetadata, isApplicationPath } from './pages/Applications';
import { applications } from './data/applications';
import { informationalPages, pageMetadata } from './pages/InformationalPages';
import { quoteHrefFor } from './data/landing';
import { initMotion } from './motion';
import { RouteContext } from './components/RouteContext';

export const normalizePath = pathname => pathname.replace(/\/+$/, '') || '/';

export function resolveRoute(pathname) {
  const Information = informationalPages[pathname];
  const application = applications[pathname];
  const metadata = pageMetadata[pathname] || applicationIndexMetadata[pathname] || application;
  const isApplication = isApplicationPath(pathname);
  const isUploadPage = pathname.startsWith('/upload/');
  const notFound = pathname !== '/' && !Information && !isApplication;
  return {
    pathname, Information, application, metadata, isApplication, isUploadPage, notFound,
    usesIntakeStyles: isApplication || Boolean(metadata?.usesIntakeStyles),
    indexable: !notFound && !isUploadPage,
    quoteHref: quoteHrefFor(pathname),
  };
}

// Every public route that is prerendered and listed in the sitemap.
export function publicRoutes() {
  return [...new Set(['/', ...Object.keys(informationalPages), ...Object.keys(applicationIndexMetadata), ...Object.keys(applications)])].sort();
}

const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function NotFound() {
  return <section className="section wrap not-found"><span className="eyebrow">Page not found</span><h1>We couldn’t find that page.</h1><p className="lead">Choose the coverage or service you need.</p><div className="hero-actions"><a className="button" href="/">Back to home <Icon name="arrow-right" size={18} /></a><a className="button secondary" href="/quote">Get a quote</a></div></section>;
}

export function App({ pathname }) {
  const route = resolveRoute(pathname);
  const { Information, isApplication, quoteHref } = route;
  useBrowserLayoutEffect(() => {
    initMotion();
    // Client-rendered pages paint after the browser's own fragment jump, so honor #section links
    // here (but never private #draft= return links).
    let target = '';
    try { target = decodeURIComponent(window.location.hash.slice(1)); } catch { /* Ignore malformed fragment URLs. */ }
    if (target && !target.includes('=')) document.getElementById(target)?.scrollIntoView();
  }, []);
  return <RouteContext.Provider value={pathname}>
    <Header pathname={pathname} quoteHref={quoteHref} isApplication={isApplication} />
    <main id="main" data-track-area="content">{pathname === '/' ? <Home /> : isApplication ? <ApplicationPage pathname={pathname} /> : Information ? <Information /> : <NotFound />}</main>
    <Footer />
    <MobileActions isApplication={isApplication} quoteHref={quoteHref} />
  </RouteContext.Provider>;
}
