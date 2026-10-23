/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Ontdekken: woordenboek, hotspots op foto's en de mijnenkaart
   Alles opent dezelfde infokaart (#info-card).
   (geladen met defer, na script.js)
   =========================================== */

// Uitleg bij mijnwoorden in de tekst (<button class="term" data-term="...">)
const GLOSSARY = {
    koempel: {
        title: 'Koempel',
        text: "Mijnwerkerswoord voor collega of maat, afgeleid van het Duitse 'Kumpel'. Onder de grond was je koempel degene op wie je moest kunnen vertrouwen.",
    },
    kolenslag: {
        title: 'Kolenslag',
        text: 'Campagne na de Tweede Wereldoorlog om zoveel mogelijk steenkool te winnen voor de wederopbouw. Mijnwerkers maakten extra diensten, ook op zondag.',
    },
    staatsmijnen: {
        title: 'Staatsmijnen',
        text: 'Mijnen die eigendom waren van de Nederlandse staat (opgericht in 1902), naast particuliere mijnen zoals die van Oranje-Nassau. Ze kregen namen van leden van het Koninklijk Huis: Wilhelmina, Emma, Hendrik en Maurits.',
    },
    koolmonoxide: {
        title: 'Koolmonoxide',
        text: 'Een kleur- en reukloos, giftig gas. In de mijn kwam het vooral vrij na een brand of ontploffing. Kanaries reageren er sneller op dan mensen: viel de vogel stil, dan was het tijd om te gaan.',
    },
    'meester-houwer': {
        title: 'Meester-houwer',
        text: 'Een houwer hakte de kolen los uit de kolenlaag. De meester-houwer was de ervaren houwer die de leiding had over zijn ploeg.',
    },
    schacht: {
        title: 'Schacht',
        text: "Verticale tunnel van de oppervlakte naar de diepte. Een lift, de 'kooi', bracht mijnwerkers en kolen op en neer.",
    },
    schaf: {
        title: 'Schaf',
        text: "De korte eetpauze tijdens de dienst; 'schaften' betekent eten.",
    },
    thermenmuseum: {
        title: 'Thermenmuseum',
        text: 'Museum in het centrum van Heerlen, gebouwd over de resten van het Romeinse badhuis (de thermen) dat in 1940 werd gevonden.',
    },
};

// ===========================================
// INFOKAART
// ===========================================

const infoCard = {
    el: document.getElementById('info-card'),
    kicker: document.querySelector('.info-card__kicker'),
    title: document.querySelector('.info-card__title'),
    text: document.querySelector('.info-card__text'),
    trigger: null,
};

function openInfo(trigger, { kicker, title, text }) {
    if (infoCard.trigger === trigger) return closeInfo();
    closeInfo({ restoreFocus: false });

    infoCard.kicker.textContent = kicker;
    infoCard.title.textContent = title;
    infoCard.text.textContent = text;
    // Kleur van het verhaal waarin je op het woord of punt tikte
    infoCard.el.dataset.theme = trigger.closest('[data-theme]')?.dataset.theme ?? '';
    infoCard.el.hidden = false;
    infoCard.el.focus({ preventScroll: true });

    infoCard.trigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
}

function closeInfo({ restoreFocus = true } = {}) {
    const { trigger } = infoCard;
    if (!trigger) return;
    infoCard.el.hidden = true;
    infoCard.trigger = null;
    trigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) trigger.focus({ preventScroll: true });
}

// ===========================================
// WOORDENBOEK & HOTSPOTS
// ===========================================

function initDiscover() {
    document.querySelectorAll('.term, .hotspot').forEach((trigger) => {
        trigger.setAttribute('aria-controls', 'info-card');
        trigger.setAttribute('aria-expanded', 'false');
    });

    document.addEventListener('click', (event) => {
        const term = event.target.closest('.term');
        if (term) {
            const entry = GLOSSARY[term.dataset.term];
            if (entry) openInfo(term, { kicker: 'Woordenboek', ...entry });
            return;
        }

        const spot = event.target.closest('.hotspot');
        if (spot) {
            openInfo(spot, {
                kicker: spot.dataset.infoKicker ?? 'Op de foto',
                title: spot.dataset.infoTitle,
                text: spot.dataset.infoText,
            });
            return;
        }

        // Klik buiten de kaart sluit hem
        if (infoCard.trigger && !infoCard.el.contains(event.target)) closeInfo({ restoreFocus: false });
    });

    document.querySelector('.info-card__close').addEventListener('click', () => closeInfo());
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeInfo();
    });
    document.addEventListener('viewchange', () => closeInfo({ restoreFocus: false }));
}

initDiscover();
