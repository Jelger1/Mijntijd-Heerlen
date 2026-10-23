/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Main JavaScript (geladen met defer: de DOM is al beschikbaar)
   =========================================== */

// --- DOM REFERENTIES ---
const views = document.querySelectorAll('[data-view]');
const introVideo = document.getElementById('intro-video');
const startBtn = document.getElementById('start-btn');
const steenkoolVideo = document.getElementById('steenkool-video');
const skipBtn = document.getElementById('skip-video-btn');
const timeline = document.getElementById('timeline-ui');
const timelineMarkers = timeline.querySelectorAll('.timeline__marker');
const audioButtons = document.querySelectorAll('[data-action="audio"]');
const videoDialog = document.getElementById('video-dialog');
const molenbergVideo = document.getElementById('molenberg-video');

const AUDIO_ICONS = {
    default: { play: 'assets/play-sound.svg', pause: 'assets/pauze-sound.svg' },
    overlay: { play: 'assets/play-sound-yellow.svg', pause: 'assets/pauze-sound-yellow.svg' },
};

// Chart.js + datalabels: pas laden als de grafiek echt nodig is
const CHART_SCRIPTS = [
    'https://cdn.jsdelivr.net/npm/chart.js@4.6.1/dist/chart.umd.min.js',
    'https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.2.0/dist/chartjs-plugin-datalabels.min.js',
];

// Adres (#hash) per view, zodat terugknop, herladen en delen van een link werken.
// De introvideo staat er bewust niet in: die heeft een tik nodig om met geluid te starten.
const ROUTES = {
    intro: '',
    navigator: 'keuze',
    'story-prehistory': 'voor-de-mijnen',
    'story-welvaart': 'welvaart',
    'story-migratie': 'migratie',
    'story-cultuur': 'cultuur',
    'story-val': 'sluiting',
};

let skipButtonTimeout = null;
let migrantChart = null;
let chartLibrary = null;

// ===========================================
// NAVIGATION LOGIC
// ===========================================

function urlFor(id) {
    if (!(id in ROUTES)) return location.href;
    return ROUTES[id] ? `#${ROUTES[id]}` : location.pathname + location.search;
}

function viewFromHash() {
    const route = decodeURIComponent(location.hash.slice(1));
    return Object.keys(ROUTES).find((id) => route && ROUTES[id] === route) ?? 'intro';
}

// Toont precies één view en zet tijdlijn, media, grafiek en geschiedenis in de juiste staat.
// history: 'push' (nieuwe stap), 'replace' (huidige stap vervangen) of 'none' (bij terugknop)
function showView(id, { history: mode = 'push' } = {}) {
    const target = document.getElementById(id);
    views.forEach((view) => { view.hidden = view !== target; });

    if (id !== 'intro') pauseIntroVideo();
    if (id !== 'steenkool-video-overlay') stopSteenkoolVideo();
    if (videoDialog.open) videoDialog.close();
    stopAllAudio();

    loadPosters(target);

    const isStory = target.classList.contains('story');
    timeline.hidden = !isStory;
    if (isStory) timeline.dataset.theme = target.dataset.theme;

    if (id === 'story-migratie') initMigrantChart();
    else destroyCharts();

    if (mode !== 'none') {
        window.history[mode === 'replace' ? 'replaceState' : 'pushState']({ view: id }, '', urlFor(id));
    }

    window.scrollTo({ top: 0, behavior: 'instant' });
    updateProgress();

    // Focus mee verplaatsen, anders blijft die achter op een knop die nu verborgen is
    target.focus({ preventScroll: true });

    // Andere scripts (effects.js, progress.js, ...) reageren hierop
    document.dispatchEvent(new CustomEvent('viewchange', { detail: { id, view: target } }));
}

function showNavigator() {
    showView('navigator');
}

function showPreHistory() {
    showView('story-prehistory');
}

function startStory(id) {
    showView(`story-${id}`);
}

function finishStory() {
    showView('story-val');
}

function backToIntro() {
    showView('intro');
    playIntroVideo();
}

// Intro video beheer
function pauseIntroVideo() {
    introVideo.pause();
    introVideo.muted = true;
}

function playIntroVideo() {
    introVideo.muted = false;
    introVideo.play().catch(() => {});
}

// Steenkool Video functies
function showSteenkoolVideo() {
    showView('steenkool-video-overlay');

    skipBtn.hidden = true;
    steenkoolVideo.currentTime = 0;
    steenkoolVideo.play().catch(() => {});

    // Toon skip button na 3 seconden
    skipButtonTimeout = setTimeout(() => { skipBtn.hidden = false; }, 3000);
}

function stopSteenkoolVideo() {
    clearTimeout(skipButtonTimeout);
    steenkoolVideo.pause();
    if (steenkoolVideo.currentTime > 0) steenkoolVideo.currentTime = 0;
    skipBtn.hidden = true;
}

// Vervangt de video-stap in de geschiedenis: 'terug' vanaf de keuzepagina gaat dan naar de intro
function skipSteenkoolVideo() {
    showView('navigator', { history: 'replace' });
}

// ===========================================
// AUDIO PLAYER
// ===========================================

function setAudioState(btn, playing) {
    const icons = btn.classList.contains('audio-btn--overlay') ? AUDIO_ICONS.overlay : AUDIO_ICONS.default;
    btn.querySelector('img').src = playing ? icons.pause : icons.play;
    btn.setAttribute('aria-pressed', String(playing));
}

function toggleAudio(btn) {
    const audio = document.getElementById(btn.dataset.audio);

    if (audio.paused) {
        audio.play().catch(() => setAudioState(btn, false));
        setAudioState(btn, true);
    } else {
        audio.pause();
        setAudioState(btn, false);
    }
}

function stopAudio(btn) {
    const audio = document.getElementById(btn.dataset.audio);
    audio.pause();
    audio.currentTime = 0;
    setAudioState(btn, false);
}

function stopAllAudio() {
    audioButtons.forEach(stopAudio);
}

// ===========================================
// VIDEO POPUP
// ===========================================

function openVideoDialog() {
    loadPosters(videoDialog);
    videoDialog.showModal();
    molenbergVideo.currentTime = 0;
    molenbergVideo.play().catch(() => {});
}

// ===========================================
// SCROLL PROGRESS
// ===========================================

let progressQueued = false;

function updateProgress() {
    progressQueued = false;
    if (timeline.hidden) return;

    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const scrolled = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
    timeline.style.setProperty('--progress', (scrolled / 100).toFixed(4));

    timelineMarkers.forEach((marker) => {
        marker.classList.toggle('is-active', scrolled >= marker.dataset.pos - 5);
    });
}

// ===========================================
// CHART
// ===========================================

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.append(script);
    });
}

function loadChartLibrary() {
    // Na elkaar laden: de datalabels-plugin heeft Chart.js nodig
    chartLibrary ??= CHART_SCRIPTS.reduce((ready, src) => ready.then(() => loadScript(src)), Promise.resolve());
    return chartLibrary;
}

function destroyCharts() {
    if (migrantChart) migrantChart.destroy();
    migrantChart = null;
}

// Chart Migrant Mix - Herkomst bevolking (horizontale bar voor leesbaarheid)
async function initMigrantChart() {
    const canvas = document.getElementById('chartMigrantMix');

    try {
        await loadChartLibrary();
    } catch {
        chartLibrary = null; // volgende keer opnieuw proberen
        return;
    }

    // De gebruiker kan intussen weg zijn genavigeerd, of de grafiek bestaat al
    if (migrantChart || canvas.closest('[data-view]').hidden) return;

    // Op smalle schermen: kleinere letters en lange labels over twee regels
    const narrow = canvas.parentElement.clientWidth < 400;

    migrantChart = new Chart(canvas, {
        type: 'bar',
        plugins: [ChartDataLabels],
        data: {
            labels: ['Limburgers', narrow ? ['Drenten/', 'Noorderlingen'] : 'Drenten/Noorderlingen', 'Polen', 'Duitsers', 'Overig'],
            datasets: [{
                data: [55, 15, 14, 12, 4],
                backgroundColor: ['#1eb1eb', '#189acc', '#1283aa', '#0c6c88', '#065566'],
                borderWidth: 0,
                borderRadius: 4,
                barThickness: narrow ? 22 : 28,
            }],
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: { right: narrow ? 40 : 50 },
            },
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false },
                title: {
                    display: true,
                    text: narrow ? ['Herkomst mijnwerkers', 'in Heerlen (1922)'] : 'Herkomst mijnwerkers in Heerlen (1922)',
                    color: '#1eb1eb',
                    font: { size: narrow ? 14 : 16, weight: 'bold' },
                    padding: { bottom: 16 },
                },
                datalabels: {
                    color: '#f1efee',
                    anchor: 'end',
                    align: 'right',
                    offset: 8,
                    font: { weight: 'bold', size: narrow ? 12 : 14 },
                    formatter: (value) => `${value}%`,
                },
            },
            scales: {
                x: { display: false, max: 70 },
                y: {
                    ticks: {
                        color: '#f1efee',
                        font: { size: narrow ? 11 : 13, weight: '500' },
                        padding: 8,
                    },
                    grid: { display: false },
                    border: { display: false },
                },
            },
        },
    });
}

// ===========================================
// INITIALISATIE
// ===========================================

// Posters pas ophalen als hun verhaal (of de popup) opent, niet al bij de eerste paginaload
function loadPosters(root) {
    root.querySelectorAll('video[data-poster]').forEach((video) => {
        video.poster = video.dataset.poster;
        delete video.dataset.poster;
    });
}

// Story-video's laden pas (preload="none") en spelen alleen af als ze bijna in beeld zijn
function initLazyVideos() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(({ target, isIntersecting }) => {
            if (isIntersecting) target.play().catch(() => {});
            else target.pause();
        });
    }, { rootMargin: '100% 0px' });

    document.querySelectorAll('video[data-lazy-video]').forEach((video) => observer.observe(video));
}

// Audio in secties met data-autopause stopt zodra de sectie uit beeld gaat
function initSectionAudio() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) {
                entry.target.querySelectorAll('[data-action="audio"]').forEach(stopAudio);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-autopause]').forEach((section) => observer.observe(section));

    audioButtons.forEach((btn) => {
        document.getElementById(btn.dataset.audio).addEventListener('ended', () => stopAudio(btn));
    });
}

const actions = {
    start: showSteenkoolVideo,
    'skip-intro': skipSteenkoolVideo,
    hub: showNavigator,
    prehistory: showPreHistory,
    story: (btn) => startStory(btn.dataset.story),
    finish: finishStory,
    intro: backToIntro,
    audio: toggleAudio,
    'open-video': openVideoDialog,
};

// Unmute intro video bij eerste klik op de pagina
document.addEventListener('click', () => {
    if (!document.getElementById('intro').hidden) introVideo.muted = false;
}, { once: true });

// Alle knoppen met data-action via één listener
document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-action]');
    if (trigger) actions[trigger.dataset.action]?.(trigger);
});

steenkoolVideo.addEventListener('ended', skipSteenkoolVideo);

// Popup: video stoppen bij sluiten, sluiten bij klik buiten de video
videoDialog.addEventListener('close', () => {
    molenbergVideo.pause();
    molenbergVideo.currentTime = 0;
});

videoDialog.addEventListener('click', (event) => {
    if (event.target === videoDialog) videoDialog.close();
});

// Terugknop / swipe-terug van de telefoon: toon de view uit de geschiedenis
window.addEventListener('popstate', (event) => {
    const id = event.state?.view ?? viewFromHash();

    if (id === 'steenkool-video-overlay') {
        showView('navigator', { history: 'replace' });
    } else {
        showView(id, { history: 'none' });
        if (id === 'intro') introVideo.play().catch(() => {});
    }
});

window.addEventListener('scroll', () => {
    if (progressQueued) return;
    progressQueued = true;
    requestAnimationFrame(updateProgress);
}, { passive: true });

timelineMarkers.forEach((marker) => { marker.style.top = `${marker.dataset.pos}%`; });
views.forEach((view) => { view.tabIndex = -1; });

initLazyVideos();
initSectionAudio();

// Directe link (bijv. .../#migratie) of herladen: meteen die view openen.
// Pas bij DOMContentLoaded, zodat de andere scripts hun viewchange-listeners al hebben.
window.history.scrollRestoration = 'manual';
document.addEventListener('DOMContentLoaded', () => {
    const initialView = viewFromHash();
    if (initialView === 'intro') window.history.replaceState({ view: 'intro' }, '');
    else showView(initialView, { history: 'replace' });
});

// Toon startknop na 5 seconden
setTimeout(() => startBtn.classList.add('is-visible'), 5000);
