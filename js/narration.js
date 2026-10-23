/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Voorlezen: 'Luister' per hoofdstuk en 'Lees voor' (hele verhaal achter elkaar)
   Stem: ElevenLabs (Ben Steenstra, als oude verteller). Bestanden: assets/audio/voorlezen/
   Elk hoofdstuk wijst naar zijn opname met data-narration="...".
   (geladen met defer, na script.js)
   =========================================== */

const NARRATION_SPEEDS = [1, 0.85, 1.15];
const SPEED_LABELS = { 1: 'Tempo: normaal', 0.85: 'Tempo: rustig', 1.15: 'Tempo: vlot' };

const ICONS = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5v14l9-7zM16 5h3v14h-3z"/></svg>',
    stop: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h12v12H6z"/></svg>',
    speaker: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M4 9v6h4l5 4V5L8 9z"/></svg>',
};

const narrator = {
    audio: new Audio(),
    chapter: null,     // hoofdstuk dat nu wordt voorgelezen
    readAll: false,    // true: na dit hoofdstuk door naar het volgende
    speed: 1,
    story: null,       // verhaal dat nu open is
    panel: null,
};
narrator.audio.preload = 'none';

const chapterTitle = (chapter) => chapter.querySelector('.chapter__title').textContent.trim();

// ===========================================
// AFSPELEN
// ===========================================

function playChapter(chapter, { readAll = narrator.readAll } = {}) {
    // Andere geluiden (kanarie, feest, toespraak) stoppen; er speelt altijd maar één geluid
    if (typeof stopAllAudio === 'function') stopAllAudio();

    if (narrator.chapter !== chapter) {
        narrator.chapter?.classList.remove('is-narrating');
        narrator.chapter = chapter;
        narrator.audio.src = chapter.dataset.narration;
        chapter.classList.add('is-narrating');
    }
    narrator.readAll = readAll;
    narrator.audio.playbackRate = narrator.speed;
    narrator.audio.play().catch(() => render());
    updateMediaSession(chapter);
    render();
}

function pauseNarration() {
    narrator.audio.pause();
    render();
}

function stopNarration() {
    narrator.audio.pause();
    narrator.audio.removeAttribute('src');
    narrator.audio.load();
    narrator.chapter?.classList.remove('is-narrating');
    narrator.chapter = null;
    narrator.readAll = false;
    render();
}

function nextChapter(from = narrator.chapter) {
    let next = from?.nextElementSibling;
    while (next && !next.matches?.('.chapter[data-narration]')) next = next.nextElementSibling;
    return next;
}

function playNext() {
    const next = nextChapter();
    if (!next) return stopNarration();
    next.scrollIntoView({ behavior: prefersReducedMotion.matches ? 'instant' : 'smooth', block: 'start' });
    playChapter(next);
}

// Het hoofdstuk dat je nu leest: het eerste dat nog een flink stuk in beeld is
function chapterInView() {
    const chapters = [...narrator.story.querySelectorAll('.chapter[data-narration]')];
    return chapters.find((c) => c.getBoundingClientRect().bottom > window.innerHeight * 0.35) ?? chapters[0];
}

// ===========================================
// KNOPPEN EN SPELER
// ===========================================

function createListenButton(chapter) {
    const meta = document.createElement('div');
    meta.className = 'chapter__meta';
    const date = chapter.querySelector('.chapter__date');
    date.before(meta);
    meta.append(date);

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'listen-btn';
    btn.setAttribute('aria-pressed', 'false');
    btn.setAttribute('aria-label', `Luister naar: ${chapterTitle(chapter)}`);
    btn.innerHTML = `${ICONS.speaker}<span class="listen-btn__label">Luister</span>`;
    btn.addEventListener('click', () => {
        if (narrator.chapter === chapter && !narrator.audio.paused) pauseNarration();
        else playChapter(chapter, { readAll: narrator.chapter === chapter && narrator.readAll });
    });
    meta.append(btn);
}

function createPanel() {
    const panel = document.createElement('div');
    panel.className = 'narrator';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Voorlezen');
    panel.hidden = true;
    panel.innerHTML = `
        <button type="button" class="narrator__main" data-narrator="toggle"></button>
        <span class="narrator__now" aria-live="polite"></span>
        <button type="button" class="narrator__btn" data-narrator="next" aria-label="Volgend hoofdstuk">${ICONS.next}</button>
        <button type="button" class="narrator__btn narrator__speed" data-narrator="speed"></button>
        <button type="button" class="narrator__btn" data-narrator="stop" aria-label="Stop met voorlezen">${ICONS.stop}</button>`;
    document.body.append(panel);

    panel.addEventListener('click', (event) => {
        const action = event.target.closest('[data-narrator]')?.dataset.narrator;
        if (action === 'toggle') {
            if (!narrator.chapter) playChapter(chapterInView(), { readAll: true });
            else if (narrator.audio.paused) playChapter(narrator.chapter);
            else pauseNarration();
        } else if (action === 'next') {
            playNext();
        } else if (action === 'stop') {
            stopNarration();
        } else if (action === 'speed') {
            narrator.speed = NARRATION_SPEEDS[(NARRATION_SPEEDS.indexOf(narrator.speed) + 1) % NARRATION_SPEEDS.length];
            narrator.audio.playbackRate = narrator.speed;
            render();
        }
    });
    narrator.panel = panel;
}

function render() {
    const { panel, chapter, audio } = narrator;
    const playing = Boolean(chapter) && !audio.paused;
    const active = Boolean(chapter);

    panel.hidden = !narrator.story;
    // In de kleur van het verhaal dat open is
    panel.dataset.theme = narrator.story?.dataset.theme ?? '';
    panel.classList.toggle('is-active', active);
    const main = panel.querySelector('.narrator__main');
    main.innerHTML = `${playing ? ICONS.pause : ICONS.play}<span>${active ? (playing ? 'Pauzeer' : 'Verder') : 'Lees voor'}</span>`;
    main.setAttribute('aria-label', active ? (playing ? 'Pauzeer voorlezen' : 'Verder voorlezen') : 'Lees het verhaal voor vanaf hier');
    panel.querySelector('.narrator__now').textContent = active ? chapterTitle(chapter) : '';
    const speedBtn = panel.querySelector('.narrator__speed');
    speedBtn.textContent = `${String(narrator.speed).replace('.', ',')}×`;
    speedBtn.setAttribute('aria-label', SPEED_LABELS[narrator.speed]);

    document.querySelectorAll('.listen-btn').forEach((btn) => {
        const isCurrent = btn.closest('.chapter') === chapter;
        const isPlaying = isCurrent && playing;
        btn.setAttribute('aria-pressed', String(isPlaying));
        btn.classList.toggle('is-playing', isPlaying);
        btn.querySelector('.listen-btn__label').textContent = isPlaying ? 'Pauzeer' : isCurrent ? 'Verder' : 'Luister';
    });
}

// Bediening via het vergrendelscherm / de koptelefoon op telefoons
function updateMediaSession(chapter) {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
        title: chapterTitle(chapter),
        artist: 'Graaf in het mijnverleden van Heerlen',
        album: chapter.closest('.story').getAttribute('aria-label') ?? '',
        artwork: [{ src: 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
}

function initMediaSession() {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => narrator.chapter && playChapter(narrator.chapter));
    navigator.mediaSession.setActionHandler('pause', pauseNarration);
    navigator.mediaSession.setActionHandler('stop', stopNarration);
    navigator.mediaSession.setActionHandler('nexttrack', playNext);
}

// ===========================================
// INITIALISATIE
// ===========================================

function initNarration() {
    document.querySelectorAll('.chapter[data-narration]').forEach(createListenButton);
    createPanel();
    initMediaSession();

    narrator.audio.addEventListener('ended', () => {
        if (narrator.readAll) playNext();
        else stopNarration();
    });
    narrator.audio.addEventListener('play', render);
    narrator.audio.addEventListener('pause', render);

    // Een ander geluid start (kanarie, feest, toespraak): voorlezen pauzeert
    document.addEventListener('play', (event) => {
        if (event.target instanceof HTMLAudioElement && event.target !== narrator.audio) pauseNarration();
    }, true);
    // De kanarie-game maakt zelf geluid (Web Audio) en meldt dat met dit event
    document.addEventListener('exclusive-sound', pauseNarration);

    document.addEventListener('viewchange', ({ detail }) => {
        stopNarration();
        narrator.story = detail.view.classList.contains('story') ? detail.view : null;
        render();
    });
    render();
}

initNarration();
