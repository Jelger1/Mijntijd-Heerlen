/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Visuele effecten: scroll-onthullingen
   (geladen met defer, na script.js)
   =========================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// ===========================================
// SCROLL-ONTHULLINGEN
// ===========================================

const REVEAL_SELECTOR = [
    '.chapter__date',
    '.chapter__title',
    '.chapter__text',
    '.chapter .media-frame',
    '.data-table',
    '.chart',
    '.audio-player',
    '.outro__title',
    '.outro .theme-btn',
    '.outro__finish',
    '.outro__home',
].join(', ');

function initReveal() {
    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('has-reveal');

    const observer = new IntersectionObserver((entries) => {
        // Elementen die tegelijk in beeld komen verschijnen kort na elkaar
        entries.filter((entry) => entry.isIntersecting).forEach((entry, index) => {
            const el = entry.target;
            const delay = Math.min(index * 0.12, 0.48);
            el.style.setProperty('--reveal-delay', `${delay}s`);
            el.classList.add('is-revealed');
            observer.unobserve(el);

            // Na de animatie de reveal-stijlen loslaten, zodat bijv. hover-effecten weer werken
            setTimeout(() => el.removeAttribute('data-reveal'), (delay + 1.8) * 1000);
        });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    document.querySelectorAll(REVEAL_SELECTOR).forEach((el) => {
        el.dataset.reveal = '';
        observer.observe(el);
    });
}

initReveal();
