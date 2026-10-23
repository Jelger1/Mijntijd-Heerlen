/* ===========================================
   HEERLEN: DE STORY VAN HET ZWARTE GOUD
   Main JavaScript
   =========================================== */

// --- CHART INSTANCES (voor cleanup) ---
let chartInstances = {};

// ===========================================
// NAVIGATION LOGIC
// ===========================================

// Intro video beheer
function pauseIntroVideo() {
    const introVideo = document.getElementById('intro-video');
    if (introVideo) {
        introVideo.pause();
        introVideo.muted = true;
    }
}

function playIntroVideo() {
    const introVideo = document.getElementById('intro-video');
    if (introVideo) {
        introVideo.muted = false;
        introVideo.play();
    }
}

// Unmute intro video bij eerste klik op de pagina
document.addEventListener('click', function unmuteIntro() {
    const introVideo = document.getElementById('intro-video');
    if (introVideo && !document.getElementById('intro').classList.contains('hidden-section')) {
        introVideo.muted = false;
    }
}, { once: true });

function showNavigator() {
    pauseIntroVideo();
    document.getElementById('intro').classList.add('hidden-section');
    document.getElementById('steenkool-video-overlay').classList.add('hidden-section');
    document.getElementById('navigator').classList.remove('hidden-section');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// Steenkool Video functies
let skipButtonTimeout = null;

function showSteenkoolVideo() {
    // Stop intro video audio
    pauseIntroVideo();
    
    document.getElementById('intro').classList.add('hidden-section');
    document.getElementById('steenkool-video-overlay').classList.remove('hidden-section');
    
    const video = document.getElementById('steenkool-video');
    const skipBtn = document.getElementById('skip-video-btn');
    
    // Reset video en skip button
    video.currentTime = 0;
    skipBtn.classList.add('hidden');
    skipBtn.classList.remove('fade-in');
    
    // Start video
    video.play();
    
    // Toon skip button na 3 seconden
    skipButtonTimeout = setTimeout(() => {
        skipBtn.classList.remove('hidden');
        skipBtn.classList.add('fade-in');
    }, 3000);
    
    // Ga automatisch naar navigator als video klaar is
    video.onended = function() {
        skipSteenkoolVideo();
    };
}

function skipSteenkoolVideo() {
    const video = document.getElementById('steenkool-video');
    const skipBtn = document.getElementById('skip-video-btn');
    
    // Clear timeout als die nog loopt
    if (skipButtonTimeout) {
        clearTimeout(skipButtonTimeout);
        skipButtonTimeout = null;
    }
    
    // Stop video
    video.pause();
    video.currentTime = 0;
    
    // Verberg skip button
    skipBtn.classList.add('hidden');
    skipBtn.classList.remove('fade-in');
    
    // Ga naar navigator
    showNavigator();
}

// Pre-History functies
function showPreHistory() {
    document.getElementById('navigator').classList.add('hidden-section');
    document.getElementById('story-prehistory').classList.remove('hidden-section');
    document.getElementById('timeline-ui').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function closePreHistory() {
    document.getElementById('story-prehistory').classList.add('hidden-section');
    document.getElementById('timeline-ui').classList.add('hidden');
    document.getElementById('navigator').classList.remove('hidden-section');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function startStory(id) {
    // Verberg alle story secties eerst
    document.querySelectorAll('[id^="story-"]').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('navigator').classList.add('hidden-section');
    document.getElementById('story-' + id).classList.remove('hidden-section');
    document.getElementById('timeline-ui').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
    
    // Wacht even tot DOM geupdate is, dan charts initialiseren
    setTimeout(() => initCharts(), 100);
}

function finishStory() {
    document.querySelectorAll('[id^="story-"]').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('story-val').classList.remove('hidden-section');
    document.getElementById('timeline-ui').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function backToNavigator() {
    // Destroy alle charts bij teruggaan
    destroyCharts();
    document.querySelectorAll('[id^="story-"]').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('timeline-ui').classList.add('hidden');
    document.getElementById('navigator').classList.remove('hidden-section');
    window.scrollTo({ top: 0, behavior: 'instant' });
}

function backToIntro() {
    // Destroy alle charts bij teruggaan naar intro
    destroyCharts();
    document.querySelectorAll('[id^="story-"]').forEach(el => el.classList.add('hidden-section'));
    document.getElementById('timeline-ui').classList.add('hidden');
    document.getElementById('navigator').classList.add('hidden-section');
    document.getElementById('steenkool-video-overlay').classList.add('hidden-section');
    document.getElementById('intro').classList.remove('hidden-section');
    playIntroVideo();
    window.scrollTo({ top: 0, behavior: 'instant' });
}

// ===========================================
// AUDIO PLAYER
// ===========================================

function toggleAudio(audioId, btnId) {
    const audio = document.getElementById(audioId);
    const btn = document.getElementById(btnId);
    const playIcon = btn.querySelector('.play-icon');
    
    // Bepaal of het een kleine knop is (gele versie) of grote knop
    const isSmallBtn = btn.classList.contains('audio-play-btn-small');
    const playSrc = isSmallBtn ? 'assets/play-sound-yellow.svg' : 'assets/play-sound.svg';
    const pauseSrc = isSmallBtn ? 'assets/pauze-sound-yellow.svg' : 'assets/pauze-sound.svg';
    
    if (audio.paused) {
        audio.play();
        btn.classList.add('playing');
        playIcon.src = pauseSrc;
        playIcon.alt = 'Pause';
    } else {
        audio.pause();
        btn.classList.remove('playing');
        playIcon.src = playSrc;
        playIcon.alt = 'Play';
    }
    
    // Reset to play button when audio ends
    audio.onended = function() {
        btn.classList.remove('playing');
        playIcon.src = playSrc;
        playIcon.alt = 'Play';
        audio.currentTime = 0;
    };
}

// ===========================================
// VIDEO POPUP
// ===========================================

function openVideoPopup() {
    const popup = document.getElementById('video-popup');
    const video = document.getElementById('molenberg-video');
    popup.classList.remove('hidden');
    popup.classList.add('flex');
    if (video) {
        video.currentTime = 0;
        video.play();
    }
}

function closeVideoPopup() {
    const popup = document.getElementById('video-popup');
    const video = document.getElementById('molenberg-video');
    if (video) {
        video.pause();
        video.currentTime = 0;
    }
    popup.classList.add('hidden');
    popup.classList.remove('flex');
}

// Sluit popup bij klikken buiten de video
document.addEventListener('click', function(e) {
    const popup = document.getElementById('video-popup');
    if (e.target === popup) {
        closeVideoPopup();
    }
});

// ===========================================
// SCROLL PROGRESS
// ===========================================

window.addEventListener('scroll', function() {
    const fill = document.getElementById("fill");
    if (!fill) return;
    
    let winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    let height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    let scrolled = height > 0 ? (winScroll / height) * 100 : 0;
    fill.style.height = scrolled + "%";
    
    // Marker activation logic - alleen voor timeline-ui markers
    const markerPositions = [10, 30, 50, 70, 90];
    let markers = document.querySelectorAll('#timeline-ui .marker');
    markers.forEach((m, idx) => {
        if (scrolled >= markerPositions[idx] - 5) {
            m.classList.add('active');
        } else {
            m.classList.remove('active');
        }
    });
});

// ===========================================
// CHART UTILITIES
// ===========================================

function destroyCharts() {
    Object.values(chartInstances).forEach(chart => {
        if (chart) chart.destroy();
    });
    chartInstances = {};
}

// Label wrapping voor charts
function wrap(label) {
    if (label.length <= 16) return label;
    let words = label.split(' ');
    let lines = [];
    let currentLine = words[0];
    
    for (let i = 1; i < words.length; i++) {
        if ((currentLine + " " + words[i]).length < 16) {
            currentLine += " " + words[i];
        } else {
            lines.push(currentLine);
            currentLine = words[i];
        }
    }
    lines.push(currentLine);
    return lines;
}

// Tooltip configuratie
const tooltipConfig = {
    callbacks: {
        title: function(items) {
            let label = items[0].chart.data.labels[items[0].dataIndex];
            return Array.isArray(label) ? label.join(' ') : label;
        }
    }
};

// ===========================================
// CHART INITIALIZATION
// ===========================================

function initCharts() {
    // Destroy bestaande charts eerst
    destroyCharts();

    // Chart Wealth - Kolenprijs over tijd
    const ctx1 = document.getElementById('chartWealth1');
    if (ctx1 && ctx1.getContext) {
        chartInstances.wealth = new Chart(ctx1.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['1900', '1910', '1917', '1925'].map(wrap),
                datasets: [{
                    label: 'Prijsindex Kolen',
                    data: [10, 15, 60, 45],
                    borderColor: '#ffe652',
                    fill: true,
                    backgroundColor: 'rgba(255, 230, 82, 0.1)',
                    tension: 0.3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: '#888' }, grid: { color: '#333' } },
                    y: { ticks: { color: '#888' }, grid: { color: '#333' } }
                }
            }
        });
    }

    // Chart Migrant Mix - Herkomst bevolking (horizontale bar voor leesbaarheid)
    const ctx2 = document.getElementById('chartMigrantMix');
    if (ctx2 && ctx2.getContext) {
        chartInstances.migrant = new Chart(ctx2.getContext('2d'), {
            type: 'bar',
            plugins: [ChartDataLabels],
            data: {
                labels: ['Limburgers', 'Drenten/Noorderlingen', 'Polen', 'Duitsers', 'Overig'],
                datasets: [{
                    data: [55, 15, 14, 12, 4],
                    backgroundColor: ['#1eb1eb', '#189acc', '#1283aa', '#0c6c88', '#065566'],
                    borderWidth: 0,
                    borderRadius: 4,
                    barThickness: 28
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        right: 50
                    }
                },
                plugins: {
                    tooltip: { enabled: false },
                    legend: { display: false },
                    title: {
                        display: true,
                        text: 'Herkomst mijnwerkers in Heerlen (1922)',
                        color: '#1eb1eb',
                        font: {
                            size: 16,
                            weight: 'bold'
                        },
                        padding: {
                            bottom: 16
                        }
                    },
                    datalabels: {
                        color: '#f1efee',
                        anchor: 'end',
                        align: 'right',
                        offset: 8,
                        font: {
                            weight: 'bold',
                            size: 14
                        },
                        formatter: function(value) {
                            return value + '%';
                        }
                    }
                },
                scales: {
                    x: {
                        display: false,
                        max: 70
                    },
                    y: {
                        ticks: {
                            color: '#f1efee',
                            font: {
                                size: 13,
                                weight: '500'
                            },
                            padding: 8
                        },
                        grid: {
                            display: false
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    // Chart Hierarchy - Mijnwerkers status
    const ctx3 = document.getElementById('chartHierarchy');
    if (ctx3 && ctx3.getContext) {
        chartInstances.hierarchy = new Chart(ctx3.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Houwers', 'Slepers', 'Piemels', 'Beambten'].map(wrap),
                datasets: [{
                    label: 'Status Index',
                    data: [100, 70, 30, 90],
                    backgroundColor: '#ffe652',
                    borderRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    tooltip: tooltipConfig,
                    legend: { display: false }
                },
                scales: {
                    x: { ticks: { color: '#888' }, grid: { display: false } },
                    y: { ticks: { color: '#888' }, grid: { color: '#333' } }
                }
            }
        });
    }
}

// ===========================================
// SECTION AUDIO OBSERVERS
// ===========================================

function initSectionAudio() {
    // Setup audio observers for sections with sound
    // Audio pauzeert automatisch wanneer sectie uit beeld gaat
    const audioSections = [
        { sectionId: 'kanarie-section', audioId: 'kanarie-audio', btnId: 'kanarie-play-btn' },
        { sectionId: 'barbara-section', audioId: 'barbara-audio', btnId: 'barbara-play-btn' }
    ];
    
    audioSections.forEach(({ sectionId, audioId, btnId }) => {
        const section = document.getElementById(sectionId);
        const audio = document.getElementById(audioId);
        const btn = document.getElementById(btnId);
        
        if (!section || !audio) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    // Section is out of view - pause and reset audio + button
                    audio.pause();
                    audio.currentTime = 0;
                    if (btn) {
                        btn.classList.remove('playing');
                        const playIcon = btn.querySelector('.play-icon');
                        if (playIcon) {
                            const isSmallBtn = btn.classList.contains('audio-play-btn-small');
                            playIcon.src = isSmallBtn ? 'assets/play-sound-yellow.svg' : 'assets/play-sound.svg';
                            playIcon.alt = 'Play';
                        }
                    }
                }
            });
        }, {
            threshold: 0.1 // Trigger when section goes out of view
        });
        
        observer.observe(section);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initSectionAudio();
    
    // Show start button after 5 seconds
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        setTimeout(() => {
            startBtn.classList.remove('opacity-0');
            startBtn.classList.add('opacity-100');
        }, 5000);
    }
});
