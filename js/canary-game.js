/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Kanarie-minigame: reageer op tijd als de kanarie stilvalt
   (geladen met defer, na script.js)
   =========================================== */

const CANARY_ROUNDS = 3;
const CANARY_FALL_DELAY = 1200; // ms na het stilvallen valt de kanarie van zijn stokje
const CANARY_TOO_LATE = 3000;   // ms na het stilvallen is de ronde verloren
const CANARY_STORAGE_KEY = 'mijntijd:kanarie-beste';

function formatSeconds(ms) {
    return (ms / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function initCanaryGame(game) {
    const stage = game.querySelector('.canary-game__stage');
    const text = game.querySelector('.canary-game__text');
    const startBtn = game.querySelector('[data-game="start"]');
    const alarmBtn = game.querySelector('[data-game="evacuate"]');
    const soundBtn = game.querySelector('[data-game="sound"]');
    const roundsList = game.querySelector('.canary-game__rounds');
    const introText = text.textContent;

    // Aparte, dringende melding voor schermlezers op het moment dat de kanarie stilvalt
    const alert = document.createElement('span');
    alert.className = 'sr-only';
    alert.setAttribute('aria-live', 'assertive');
    game.append(alert);

    let round = 0;
    let results = [];   // per ronde: reactietijd in ms, 'early' (vals alarm) of null (te laat)
    let silentAt = 0;
    let playing = false;
    let timers = [];
    let soundOn = true;
    let audioCtx = null;
    let chirpTimer = null;

    const later = (fn, ms) => timers.push(setTimeout(fn, ms));

    // --- Geluid: korte fluitjes met Web Audio (geen geluidsbestand nodig) ---
    function chirp() {
        if (!soundOn || !audioCtx) return;
        const t = audioCtx.currentTime;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(2600 + Math.random() * 800, t);
        osc.frequency.exponentialRampToValueAtTime(4200 + Math.random() * 900, t + 0.07);
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.1);
    }

    function startChirping() {
        const loop = () => {
            chirp();
            chirpTimer = setTimeout(loop, 140 + Math.random() * 420);
        };
        loop();
    }

    function stopChirping() {
        clearTimeout(chirpTimer);
        chirpTimer = null;
    }

    function clearTimers() {
        timers.forEach(clearTimeout);
        timers = [];
        stopChirping();
    }

    // --- Spelverloop ---
    function startRound() {
        if (round >= CANARY_ROUNDS) {
            round = 0;
            results = [];
            renderRounds();
        }
        // Het kanariegeluid bij de foto en het voorlezen zouden het spel verstoren
        if (typeof stopAllAudio === 'function') stopAllAudio();
        document.dispatchEvent(new CustomEvent('exclusive-sound', { detail: { source: 'canary-game' } }));
        audioCtx ??= new (window.AudioContext || window.webkitAudioContext)();
        audioCtx.resume();

        round += 1;
        playing = true;
        silentAt = 0;
        game.classList.remove('is-fallen');
        game.classList.add('is-singing');
        text.textContent = `Ronde ${round} van ${CANARY_ROUNDS}: de kanarie fluit. Blijf opletten…`;
        startBtn.hidden = true;
        alarmBtn.hidden = false;
        alarmBtn.focus({ preventScroll: true });
        startChirping();
        later(goSilent, 2500 + Math.random() * 4000);
    }

    function goSilent() {
        silentAt = performance.now();
        stopChirping();
        game.classList.remove('is-singing');
        alert.textContent = 'De kanarie is stilgevallen!';
        later(() => game.classList.add('is-fallen'), CANARY_FALL_DELAY);
        later(() => finishRound(null), CANARY_TOO_LATE);
    }

    function evacuate() {
        if (!playing) return;
        finishRound(silentAt ? performance.now() - silentAt : 'early');
    }

    function finishRound(result) {
        clearTimers();
        playing = false;
        alert.textContent = '';
        game.classList.remove('is-singing');
        results.push(result);
        renderRounds();

        alarmBtn.hidden = true;
        startBtn.hidden = false;
        text.textContent = roundMessage(result);

        if (round < CANARY_ROUNDS) {
            startBtn.textContent = 'Volgende ronde';
        } else {
            finishGame();
        }
        startBtn.focus({ preventScroll: true });
    }

    function roundMessage(result) {
        if (result === 'early') return 'Vals alarm! De kanarie floot nog. Zonder reden de hele ploeg naar boven sturen kost een dienst.';
        if (result === null) return 'Te laat. De kanarie viel van zijn stokje en jij was er nog. Onder de grond telde elke seconde.';
        if (result < 600) return `Snel! Je reageerde in ${formatSeconds(result)} seconde.`;
        if (result < CANARY_FALL_DELAY) return `Op tijd: ${formatSeconds(result)} seconde.`;
        return `Op het nippertje: ${formatSeconds(result)} seconde. De kanarie lag al op de bodem van zijn kooi.`;
    }

    function finishGame() {
        const times = results.filter((r) => typeof r === 'number');
        startBtn.textContent = 'Nog een dienst';

        if (!times.length) {
            text.textContent = 'Geen enkele keer op tijd weg… Gelukkig is dit maar een spel. Voor de koempels was het bittere ernst.';
            return;
        }

        const average = times.reduce((sum, t) => sum + t, 0) / times.length;
        const best = Math.min(...times);
        const verdict = times.length === CANARY_ROUNDS && average < 700
            ? 'Je bent een echte koempel: de hele ploeg komt veilig boven.'
            : 'Goed opgelet, maar onder de grond kon één fout je leven kosten.';
        text.textContent = `Klaar! ${times.length} van ${CANARY_ROUNDS} keer veilig weg, gemiddeld ${formatSeconds(average)} seconde. ${verdict}`;

        // Beste tijd bewaren voor het houwersdiploma
        try {
            const previous = Number(localStorage.getItem(CANARY_STORAGE_KEY));
            if (!previous || best < previous) localStorage.setItem(CANARY_STORAGE_KEY, String(Math.round(best)));
        } catch {
            // Opslag niet beschikbaar (bijv. privévenster): het spel werkt gewoon
        }
        document.dispatchEvent(new CustomEvent('canarygame:done', { detail: { best } }));
    }

    function renderRounds() {
        roundsList.replaceChildren(...results.map((result, i) => {
            const li = document.createElement('li');
            const ok = typeof result === 'number';
            li.className = ok ? 'is-good' : 'is-bad';
            li.textContent = `${i + 1}. ${ok ? `${formatSeconds(result)} s` : result === 'early' ? 'vals alarm' : 'te laat'}`;
            return li;
        }));
    }

    // Stoppen als het spel uit beeld gaat (wegscrollen of een ander verhaal openen)
    function abort() {
        if (!playing) return;
        clearTimers();
        playing = false;
        round = Math.max(round - 1, 0);
        game.classList.remove('is-singing', 'is-fallen');
        alarmBtn.hidden = true;
        startBtn.hidden = false;
        startBtn.textContent = round ? 'Verder spelen' : 'Start je dienst';
        text.textContent = introText;
    }

    new IntersectionObserver((entries) => {
        if (!entries[0].isIntersecting) abort();
    }).observe(game);

    startBtn.addEventListener('click', startRound);
    alarmBtn.addEventListener('click', evacuate);
    // Op een telefoon mag je ook op de kooi zelf tikken
    stage.addEventListener('pointerdown', evacuate);

    soundBtn.addEventListener('click', () => {
        soundOn = !soundOn;
        soundBtn.setAttribute('aria-pressed', String(soundOn));
    });
}

document.querySelectorAll('[data-canary-game]').forEach(initCanaryGame);
