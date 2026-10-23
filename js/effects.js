/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Visuele effecten: scroll-onthullingen, afdalen in de mijn, kolenstof
   (geladen met defer, na script.js)
   =========================================== */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Het verhaal dat nu open is (null in intro/keuzemenu); bijgewerkt bij elke viewchange
let activeStory = null;

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
    '.canary-game',
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

// ===========================================
// AFDALEN IN DE MIJN (tijdlijn als mijnschacht)
// ===========================================

// Symbolische diepte onderaan een verhaal: hoe verder je leest, hoe dieper je zakt
const MAX_DEPTH = 600;

const descent = {
    timeline: document.getElementById('timeline-ui'),
    depth: document.querySelector('.timeline__depth'),
    year: document.querySelector('.timeline__year'),
    markers: [], // { el, pos, chapter }
    queued: false,
};

// Eén marker per hoofdstuk, op het punt waar dat hoofdstuk het bovenste deel van het scherm bereikt
// (dan ben je het aan het lezen)
const READ_LINE = 0.6;

function layoutMarkers() {
    descent.markers.forEach(({ el }) => el.remove());
    descent.markers = [];
    if (!activeStory) return;

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const cage = descent.timeline.querySelector('.timeline__cage');

    activeStory.querySelectorAll('.chapter').forEach((chapter) => {
        const start = chapter.offsetTop - window.innerHeight * READ_LINE;
        const pos = scrollable > 0 ? Math.min(Math.max(start / scrollable, 0), 1) : 0;
        const el = document.createElement('span');
        el.className = 'timeline__marker';
        el.style.top = `${pos * 100}%`;
        descent.timeline.insertBefore(el, cage);
        descent.markers.push({ el, pos, chapter });
    });
}

function updateDescent() {
    descent.queued = false;
    if (!activeStory) return;

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;
    descent.timeline.style.setProperty('--progress', progress.toFixed(4));
    descent.depth.textContent = `${Math.round((progress * MAX_DEPTH) / 5) * 5} M`;

    // Jaartal van het laatst gepasseerde hoofdstuk (het outro heeft geen jaartal: dan blijft het vorige staan)
    let current = descent.markers[0];
    descent.markers.forEach((marker) => {
        const passed = progress >= marker.pos - 0.001;
        marker.el.classList.toggle('is-active', passed);
        if (passed && marker.chapter.querySelector('.chapter__date')) current = marker;
    });
    const date = current?.chapter.querySelector('.chapter__date');
    if (date) descent.year.textContent = date.textContent.replace(/\s*na Christus/i, '');

    dust.depth = progress;
}

// Op mobiel is het dieptelabel alleen zichtbaar tijdens het scrollen (anders dekt het tekst af)
let scrollIdleTimer = null;

function queueDescent() {
    descent.timeline.classList.add('is-scrolling');
    clearTimeout(scrollIdleTimer);
    scrollIdleTimer = setTimeout(() => descent.timeline.classList.remove('is-scrolling'), 1200);

    if (descent.queued) return;
    descent.queued = true;
    requestAnimationFrame(updateDescent);
}

function refreshDescent() {
    layoutMarkers();
    updateDescent();
}

// ===========================================
// KOLENSTOF
// ===========================================

const dust = {
    canvas: null,
    ctx: null,
    particles: [],
    depth: 0,       // 0..1, bovenaan weinig stof, diep in de mijn meer
    rgb: [255, 230, 82],
    running: false,
    last: 0,
};

function initDust() {
    if (prefersReducedMotion.matches) return;
    dust.canvas = document.createElement('canvas');
    dust.canvas.className = 'dust';
    dust.canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(dust.canvas);
    dust.ctx = dust.canvas.getContext('2d');
    resizeDust();
}

function resizeDust() {
    if (!dust.canvas) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    dust.canvas.width = Math.round(window.innerWidth * ratio);
    dust.canvas.height = Math.round(window.innerHeight * ratio);
    dust.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    // Aantal korrels schaalt met het schermoppervlak (telefoon ±15, desktop ±45)
    const count = Math.round(Math.min(70, (window.innerWidth * window.innerHeight) / 22000));
    while (dust.particles.length < count) dust.particles.push(createParticle(true));
    dust.particles.length = count;
}

function createParticle(anywhere) {
    return {
        x: Math.random() * window.innerWidth,
        y: anywhere ? Math.random() * window.innerHeight : -5,
        r: 0.6 + Math.random() * 1.6,
        vy: 4 + Math.random() * 12,          // px per seconde, langzaam naar beneden
        sway: 6 + Math.random() * 14,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.15 + Math.random() * 0.35,
        tinted: Math.random() < 0.3,         // een deel van de korrels vangt het licht in de themakleur
    };
}

function drawDust(now) {
    if (!dust.running) return;
    const dt = Math.min((now - dust.last) / 1000, 0.05);
    dust.last = now;
    const { ctx } = dust;
    const [r, g, b] = dust.rgb;
    const visible = Math.round(dust.particles.length * (0.45 + 0.55 * dust.depth));

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let i = 0; i < visible; i++) {
        const p = dust.particles[i];
        p.y += p.vy * dt;
        p.x += Math.sin(now / 1800 + p.phase) * p.sway * dt;
        if (p.y > window.innerHeight + 5) Object.assign(p, createParticle(false));

        ctx.fillStyle = p.tinted ? `rgba(${r}, ${g}, ${b}, ${p.alpha})` : `rgba(190, 180, 170, ${p.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }
    requestAnimationFrame(drawDust);
}

function setDustRunning(on) {
    if (!dust.canvas || on === dust.running) return;
    dust.running = on;
    dust.canvas.hidden = !on;
    if (on) {
        dust.last = performance.now();
        requestAnimationFrame(drawDust);
    }
}

// ===========================================
// MIJNLAMP
// ===========================================

const touchOnly = window.matchMedia('(hover: none)');

function initLamps() {
    document.querySelectorAll('[data-lamp]').forEach((frame) => {
        const lamp = document.createElement('span');
        lamp.className = 'lamp';
        lamp.setAttribute('aria-hidden', 'true');

        const hint = document.createElement('span');
        hint.className = 'lamp-hint';
        hint.setAttribute('aria-hidden', 'true');
        hint.textContent = touchOnly.matches ? 'Tik of sleep met je lamp' : 'Schijn met je muis';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'lamp-toggle';
        toggle.setAttribute('aria-pressed', 'false');
        toggle.innerHTML = '<span>Licht aan</span>';

        frame.append(lamp, hint, toggle);

        let releaseTimer = null;
        const shine = (event) => {
            if (event.target.closest('button')) return;
            const rect = lamp.getBoundingClientRect();
            lamp.style.setProperty('--lamp-x', `${((event.clientX - rect.left) / rect.width) * 100}%`);
            lamp.style.setProperty('--lamp-y', `${((event.clientY - rect.top) / rect.height) * 100}%`);
            frame.classList.add('is-lamp-active');
            clearTimeout(releaseTimer);
        };

        frame.addEventListener('pointermove', shine);
        frame.addEventListener('pointerdown', shine);
        // Na loslaten kijkt de lamp na een tijdje weer zelf rond
        frame.addEventListener('pointerleave', () => {
            releaseTimer = setTimeout(() => frame.classList.remove('is-lamp-active'), 2500);
        });

        toggle.addEventListener('click', () => {
            const lit = frame.classList.toggle('is-lit');
            toggle.setAttribute('aria-pressed', String(lit));
        });
    });
}

// ===========================================
// INITIALISATIE
// ===========================================

document.addEventListener('viewchange', ({ detail }) => {
    activeStory = detail.view.classList.contains('story') ? detail.view : null;

    if (activeStory) {
        const rgb = getComputedStyle(activeStory).getPropertyValue('--accent-rgb').trim().split(/\s+/).map(Number);
        if (rgb.length === 3) dust.rgb = rgb;
    }
    setDustRunning(Boolean(activeStory) && !document.hidden);

    // Na de layout van de nieuwe view de markers plaatsen
    requestAnimationFrame(refreshDescent);
});

window.addEventListener('scroll', queueDescent, { passive: true });

let resizeTimer = null;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
        resizeDust();
        refreshDescent();
    }, 150);
});

// Webfont geladen = tekst kan van hoogte veranderen: markers opnieuw plaatsen
document.fonts?.ready.then(refreshDescent);

document.addEventListener('visibilitychange', () => setDustRunning(Boolean(activeStory) && !document.hidden));

initLamps();
initReveal();
initDust();
