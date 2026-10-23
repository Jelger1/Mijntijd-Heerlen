/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Voortgang (welke verhalen zijn gelezen) en het houwersdiploma
   Alles wordt alleen in deze browser bewaard (localStorage).
   (geladen met defer, na script.js)
   =========================================== */

// De drie verhalen die nodig zijn voor het diploma, en de bonusverhalen
const DIPLOMA_STORIES = { welvaart: 'Welvaart', migratie: 'Migratie', cultuur: 'Mijncultuur' };
const BONUS_STORIES = { prehistory: 'Voor de mijnen', val: 'De sluiting' };

const PROGRESS_KEY = 'mijntijd:gelezen';
const NAME_KEY = 'mijntijd:naam';

// Opslag kan geblokkeerd zijn (privévenster): dan werkt alles, maar zonder onthouden
const storage = {
    get(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value === null ? fallback : JSON.parse(value);
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // niet beschikbaar: negeren
        }
    },
    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch {
            // niet beschikbaar: negeren
        }
    },
};

const progress = {
    read: new Set(storage.get(PROGRESS_KEY, [])),
    blocks: [],   // voortgangsblokken in het keuzemenu en de outro's
};

const readCount = () => Object.keys(DIPLOMA_STORIES).filter((id) => progress.read.has(id)).length;
const total = Object.keys(DIPLOMA_STORIES).length;

// ===========================================
// VOORTGANG
// ===========================================

function markRead(story) {
    if (progress.read.has(story)) return;
    progress.read.add(story);
    storage.set(PROGRESS_KEY, [...progress.read]);
    renderProgress();
}

function createProgressBlock({ withReset }) {
    const block = document.createElement('div');
    block.className = 'progress';

    const pips = document.createElement('span');
    pips.className = 'progress__pips';
    pips.setAttribute('aria-hidden', 'true');
    Object.keys(DIPLOMA_STORIES).forEach((id) => {
        const pip = document.createElement('span');
        pip.dataset.theme = id;
        pip.dataset.story = id;
        pips.append(pip);
    });

    const text = document.createElement('p');
    text.className = 'progress__text';

    const diplomaBtn = document.createElement('button');
    diplomaBtn.type = 'button';
    diplomaBtn.className = 'game-btn progress__diploma';
    diplomaBtn.dataset.diplomaOpen = '';
    diplomaBtn.textContent = 'Haal je houwersdiploma';

    block.append(pips, text, diplomaBtn);

    if (withReset) {
        const reset = document.createElement('button');
        reset.type = 'button';
        reset.className = 'progress__reset';
        reset.textContent = 'Voortgang wissen';
        reset.addEventListener('click', () => {
            progress.read.clear();
            storage.remove(PROGRESS_KEY);
            renderProgress();
        });
        block.append(reset);
    }

    progress.blocks.push(block);
    return block;
}

function renderProgress() {
    const count = readCount();
    const complete = count === total;
    const message = complete
        ? 'Alle drie de verhalen ontdekt. Je hebt je houwersdiploma verdiend!'
        : count === 0
            ? 'Lees alle drie de verhalen en verdien je houwersdiploma.'
            : `${count} van ${total} verhalen ontdekt. Nog ${total - count} te gaan voor je houwersdiploma.`;

    progress.blocks.forEach((block) => {
        block.querySelector('.progress__text').textContent = message;
        block.querySelector('.progress__diploma').hidden = !complete;
        block.querySelectorAll('.progress__pips span').forEach((pip) => {
            pip.classList.toggle('is-on', progress.read.has(pip.dataset.story));
        });
        const reset = block.querySelector('.progress__reset');
        if (reset) reset.hidden = progress.read.size === 0;
    });

    // Gelezen verhalen krijgen een vinkje op hun themaknop (keuzemenu en outro's)
    document.querySelectorAll('.theme-btn[data-story]').forEach((btn) => {
        const isRead = progress.read.has(btn.dataset.story);
        btn.classList.toggle('is-read', isRead);
        let note = btn.querySelector('.theme-btn__note');
        if (isRead && !note) {
            note = document.createElement('span');
            note.className = 'theme-btn__note sr-only';
            note.textContent = ', gelezen';
            btn.append(note);
        } else if (!isRead && note) {
            note.remove();
        }
    });
}

function initProgress() {
    // Voortgang in het keuzemenu (met wis-knop) en aan het eind van de drie verhalen
    document.querySelector('.hub .theme-grid').after(createProgressBlock({ withReset: true }));
    Object.keys(DIPLOMA_STORIES).forEach((id) => {
        document.querySelector(`#story-${id} .outro__title`).after(createProgressBlock({ withReset: false }));
    });

    // Een verhaal telt als gelezen zodra je het slot (outro) bereikt
    const observer = new IntersectionObserver((entries) => {
        entries.filter((entry) => entry.isIntersecting).forEach(({ target }) => {
            markRead(target.closest('.story').id.replace('story-', ''));
        });
    }, { threshold: 0.3 });
    document.querySelectorAll('.story .outro').forEach((outro) => observer.observe(outro));

    renderProgress();
}

// ===========================================
// HOUWERSDIPLOMA (getekend op canvas, te downloaden als PNG)
// ===========================================

const diploma = {
    dialog: document.getElementById('diploma-dialog'),
    canvas: document.querySelector('.diploma-dialog__canvas'),
    input: document.getElementById('diploma-name'),
    shareBtn: document.querySelector('[data-diploma="share"]'),
    queued: false,
};

// Vorm van de kolenbrok en de gekruiste hamers (uit Arbeidscultuur.svg)
const ROCK = [[60, 95], [340, 40], [760, 85], [1130, 55], [1100, 420], [1140, 790], [720, 815], [300, 775], [55, 805], [85, 430]];
const PICKAXES = '113.75 102.28 163.73 149.94 151.02 165.02 89.89 102.93 31.81 163.12 18.6 147.21 49.72 118.01 51.73 118.39 51.44 116.48 77.77 90.62 41.58 53.86 21.98 78.42 0 60.32 9.52 50.52 11.04 51.08 10.61 49.41 58.6 0 76.91 21.76 55.88 40.23 54.51 40.03 54.51 41.44 52.14 43.52 89.48 79.13 125.93 43.33 116.26 33.27 117.03 30.88 114.45 31.74 103.63 22.17 123.92 2.54 144.89 24.27 148.82 20.44 159.16 30.88 156.1 34.61 168.47 50.18 166.05 56.16 170.84 54.24 182.33 80.29 145.56 63.34 137.52 53.57 101.65 90.74 113.07 101.63 112.85 102.62 113.75 102.28';
const STRATA = ['#e4e4e4', '#b4b4b4', '#847e84', '#544e4e', '#1e1e1e'];
const YELLOW = '#ffe652';
const DISPLAY_FONT = '"Girdo Black", Impact, sans-serif';
const BODY_FONT = 'Inter, system-ui, sans-serif';

function fillPolygon(ctx, points, dx = 0, dy = 0) {
    ctx.beginPath();
    points.forEach(([x, y], i) => (i ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy)));
    ctx.closePath();
    ctx.fill();
}

// Tekst zo groot mogelijk, maar nooit breder dan maxWidth
function fitText(ctx, text, size, maxWidth, family) {
    let s = size;
    do {
        ctx.font = `${s}px ${family}`;
        s -= 4;
    } while (ctx.measureText(text).width > maxWidth && s > 20);
}

function drawDiploma() {
    diploma.queued = false;
    const ctx = diploma.canvas.getContext('2d');
    const W = diploma.canvas.width;
    const name = diploma.input.value.trim() || 'Jouw naam';
    const date = new Date().toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
    const canaryBest = Number(storage.get('mijntijd:kanarie-beste', 0));

    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, W, diploma.canvas.height);

    // Gestapelde lagen (verste/donkerste eerst), dan de brok met gele glow
    for (let i = STRATA.length; i >= 1; i--) {
        ctx.fillStyle = STRATA[i - 1];
        fillPolygon(ctx, ROCK, i * 9, -i * 9);
    }
    ctx.save();
    ctx.shadowColor = 'rgba(255, 230, 82, 0.45)';
    ctx.shadowBlur = 60;
    ctx.fillStyle = '#231f20';
    fillPolygon(ctx, ROCK);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#f1efee';
    ctx.font = `26px ${DISPLAY_FONT}`;
    ctx.fillText('GRAAF IN HET MIJNVERLEDEN VAN HEERLEN', W / 2, 165);

    ctx.fillStyle = YELLOW;
    ctx.font = `150px ${DISPLAY_FONT}`;
    ctx.fillText('DIPLOMA', W / 2, 310);
    ctx.font = `58px ${DISPLAY_FONT}`;
    ctx.fillText('VAN HOUWER', W / 2, 380);

    ctx.fillStyle = '#c9c9c9';
    ctx.font = `26px ${BODY_FONT}`;
    ctx.fillText('uitgereikt aan', W / 2, 445);

    ctx.fillStyle = '#f1efee';
    fitText(ctx, name.toUpperCase(), 76, 820, DISPLAY_FONT);
    ctx.fillText(name.toUpperCase(), W / 2, 530);

    ctx.fillStyle = '#c9c9c9';
    ctx.font = `24px ${BODY_FONT}`;
    ctx.fillText('heeft het mijnverleden van Heerlen doorgraven:', W / 2, 590);

    ctx.fillStyle = YELLOW;
    ctx.font = `32px ${DISPLAY_FONT}`;
    ctx.fillText(Object.values(DIPLOMA_STORIES).map((s) => s.toUpperCase()).join('  ·  '), W / 2, 640);

    const extras = Object.entries(BONUS_STORIES).filter(([id]) => progress.read.has(id)).map(([, label]) => `+ ${label}`);
    if (canaryBest) extras.push(`Kanarietest: ${(canaryBest / 1000).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} s`);
    if (extras.length) {
        ctx.fillStyle = '#c9c9c9';
        ctx.font = `22px ${BODY_FONT}`;
        ctx.fillText(extras.join('   ·   '), W / 2, 685);
    }

    // Onderaan: datum, handtekening van de examencommissie, stempel
    ctx.textAlign = 'left';
    ctx.fillStyle = '#c9c9c9';
    ctx.font = `22px ${BODY_FONT}`;
    ctx.fillText(`Heerlen, ${date}`, 150, 765);

    ctx.strokeStyle = '#f1efee';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(500, 735);
    ctx.bezierCurveTo(540, 700, 560, 760, 600, 725);
    ctx.bezierCurveTo(630, 700, 650, 750, 690, 728);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.font = `18px ${DISPLAY_FONT}`;
    ctx.fillText('DE EXAMENCOMMISSIE', 600, 770);

    ctx.save();
    ctx.translate(1000, 690);
    ctx.rotate(-0.2);
    ctx.strokeStyle = YELLOW;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = YELLOW;
    ctx.font = `16px ${DISPLAY_FONT}`;
    ctx.fillText('GESLAAGD', 0, 50);
    // Hamers iets boven het midden; na M behandelt een SVG-pad alle volgende puntparen als lijnen
    ctx.scale(0.42, 0.42);
    ctx.translate(-91, -120);
    ctx.fill(new Path2D(`M${PICKAXES}Z`));
    ctx.restore();
}

function queueDiploma() {
    if (diploma.queued) return;
    diploma.queued = true;
    requestAnimationFrame(drawDiploma);
}

function diplomaBlob() {
    return new Promise((resolve) => diploma.canvas.toBlob(resolve, 'image/png'));
}

function diplomaFileName() {
    const slug = diploma.input.value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `houwersdiploma${slug ? `-${slug}` : ''}.png`;
}

async function downloadDiploma() {
    const url = URL.createObjectURL(await diplomaBlob());
    const link = document.createElement('a');
    link.href = url;
    link.download = diplomaFileName();
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function shareDiploma() {
    const file = new File([await diplomaBlob()], diplomaFileName(), { type: 'image/png' });
    try {
        await navigator.share({ files: [file], title: 'Mijn houwersdiploma', text: 'Ik heb het mijnverleden van Heerlen doorgraven!' });
    } catch {
        // Delen geannuleerd: niets aan de hand
    }
}

async function openDiploma() {
    diploma.input.value = storage.get(NAME_KEY, '');
    diploma.dialog.showModal();
    // Het canvas kan pas met Girdo Black tekenen als het font geladen is
    await document.fonts?.load(`76px ${DISPLAY_FONT}`);
    drawDiploma();
}

function initDiploma() {
    // Delen met bestand kan alleen op apparaten die dat ondersteunen (vooral telefoons)
    const probe = new File([''], 'test.png', { type: 'image/png' });
    diploma.shareBtn.hidden = !(navigator.canShare && navigator.canShare({ files: [probe] }));

    document.addEventListener('click', (event) => {
        if (event.target.closest('[data-diploma-open]')) openDiploma();
    });
    diploma.input.addEventListener('input', () => {
        storage.set(NAME_KEY, diploma.input.value.trim());
        queueDiploma();
    });
    document.querySelector('[data-diploma="download"]').addEventListener('click', downloadDiploma);
    diploma.shareBtn.addEventListener('click', shareDiploma);
    diploma.dialog.addEventListener('click', (event) => {
        if (event.target === diploma.dialog) diploma.dialog.close();
    });
}

initProgress();
initDiploma();
