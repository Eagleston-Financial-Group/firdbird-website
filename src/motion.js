// Lightweight motion helpers (no animation library): scroll reveal, count-up for verified
// numbers, and the floating mobile call/quote bar. Everything degrades to static content when
// JavaScript, IntersectionObserver, or motion preferences don't allow animation.

const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

let revealObserver = null;
let countObserver = null;
let ctaObserver = null;

function inViewport(element) {
  const rect = element.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

// Elements marked data-reveal fade and slide up as they scroll into view. Anything already on
// screen when the page first paints is shown immediately, so content never appears late.
function setupReveal(root, animate) {
  const items = [...root.querySelectorAll('[data-reveal]:not(.is-visible)')];
  if (!animate) { items.forEach(element => element.classList.add('is-visible')); return; }
  const below = [];
  // Measure before the .motion class activates the hidden state, so on-screen items never transition.
  for (const element of items) (inViewport(element) ? element.classList.add('is-visible') : below.push(element));
  revealObserver ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 });
  below.forEach(element => revealObserver.observe(element));
}

const easeOutCubic = t => 1 - (1 - t) ** 3;

function runCount(element) {
  const target = Number(element.dataset.countTo);
  if (!Number.isFinite(target)) return;
  const duration = 700;
  const start = performance.now();
  const step = now => {
    const progress = Math.min(1, (now - start) / duration);
    element.textContent = String(Math.round(target * easeOutCubic(progress)));
    if (progress < 1) requestAnimationFrame(step);
  };
  element.textContent = '0';
  requestAnimationFrame(step);
}

// Numbers render at their final value by default (no-JS, reduced motion, already on screen);
// only stats below the fold count up once, when they come into view.
function setupCountUp(root, animate) {
  const items = [...root.querySelectorAll('[data-count-to]:not([data-counted])')];
  items.forEach(element => { element.dataset.counted = ''; });
  if (!animate) return;
  countObserver ??= new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      countObserver.unobserve(entry.target);
      runCount(entry.target);
    }
  }, { threshold: 0.6 });
  items.filter(element => !inViewport(element)).forEach(element => countObserver.observe(element));
}

// The phone action bar slides in once the page's own hero call-to-action has scrolled away.
// Pages without a [data-cta-sentinel] (applications, uploads) show it right away.
function setupFloatingCta() {
  const bar = document.querySelector('.mobile-actions');
  if (!bar) return;
  const sentinel = document.querySelector('[data-cta-sentinel]');
  ctaObserver?.disconnect();
  if (!sentinel || !('IntersectionObserver' in window)) { bar.classList.add('is-shown'); return; }
  ctaObserver = new IntersectionObserver(([entry]) => {
    bar.classList.toggle('is-shown', !entry.isIntersecting && entry.boundingClientRect.top < 0);
  });
  ctaObserver.observe(sentinel);
}

export function initMotion(root = document) {
  const animate = !prefersReducedMotion() && 'IntersectionObserver' in window;
  setupReveal(root, animate);
  setupCountUp(root, animate);
  setupFloatingCta();
  document.documentElement.classList.toggle('motion', animate);
}
