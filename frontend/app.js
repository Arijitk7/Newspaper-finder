// ─── STATE ───────────────────────────────────────────
// Empty string = use same origin (works both locally and when deployed)
const BASE_URL = '';
let selectedPaper = localStorage.getItem('selectedPaper') || 'ei-samay';
let currentPdfUrl = '';
let currentPaperName = '';
let currentDate = '';

// ─── INIT ─────────────────────────────────────────────
(function init() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    document.getElementById('dateInput').value = `${yyyy}-${mm}-${dd}`;
    document.getElementById('dateInput').max = `${yyyy}-${mm}-${dd}`;
    selectPaper(selectedPaper, false);
})();

// ─── PAPER SELECTION ─────────────────────────────────
function selectPaper(paperId, save = true) {
    selectedPaper = paperId;
    if (save) localStorage.setItem('selectedPaper', paperId);
    document.querySelectorAll('.paper-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`card-${paperId}`);
    if (card) card.classList.add('active');
    hideResult();
}

// ─── FETCH ─────────────────────────────────────────────
async function doFetch() {
    const rawDate = document.getElementById('dateInput').value;
    if (!rawDate) { showError('Please select a date first.'); return; }

    const [yyyy, mm, dd] = rawDate.split('-');
    const formattedDate = `${dd}-${mm}-${yyyy}`;

    const sourceNames = { 'ei-samay': 'Fresherwave & Careerswave', 'economic-times': 'ET Archives' };
    document.getElementById('scanSource').textContent = sourceNames[selectedPaper] || 'news archives';

    setUIState('loading');

    try {
        const res = await fetch(`${BASE_URL}/api/paper?id=${selectedPaper}&date=${formattedDate}`);
        const data = await res.json();

        if (data.success && data.url) {
            currentPdfUrl = data.url;
            currentPaperName = data.paper;
            currentDate = data.date;

            // Convert /view to /preview for best inline reading
            const previewUrl = currentPdfUrl.includes('drive.google.com') && currentPdfUrl.includes('/view')
                ? currentPdfUrl.replace('/view', '/preview')
                : currentPdfUrl;

            document.getElementById('readerBtn').href = previewUrl;
            document.getElementById('resultLabel').textContent = `${currentPaperName} — ${currentDate}`;

            triggerConfetti();
            setUIState('result');
        } else {
            showError(data.error || `Could not find the paper for this date. The edition may not be available yet.`);
        }
    } catch (err) {
        showError(`Network error: ${err.message}`);
    }
}

// ─── SHARE ──────────────────────────────────────────
async function doShare() {
    if (navigator.share) {
        try {
            await navigator.share({
                title: `${currentPaperName} — ${currentDate}`,
                text: `Read today's ${currentPaperName} e-paper 📰`,
                url: currentPdfUrl
            });
        } catch (e) { /* cancelled */ }
    } else {
        await navigator.clipboard.writeText(currentPdfUrl);
        alert('Link copied to clipboard!');
    }
}

// ─── UI STATE MACHINE ─────────────────────────────────
function setUIState(state) {
    document.getElementById('loaderBox').style.display = 'none';
    document.getElementById('resultCard').style.display = 'none';
    document.getElementById('errorBox').classList.remove('visible');
    document.getElementById('fetchBtn').disabled = false;

    if (state === 'loading') {
        document.getElementById('loaderBox').style.display = 'block';
        document.getElementById('fetchBtn').disabled = true;
        document.getElementById('fetchBtnText').textContent = 'Searching Archives...';
    } else if (state === 'result') {
        document.getElementById('resultCard').style.display = 'block';
        document.getElementById('fetchBtnText').textContent = 'Fetch Another Edition';
    } else {
        document.getElementById('fetchBtnText').textContent = 'Fetch E-Paper';
    }
}

function hideResult() {
    document.getElementById('resultCard').style.display = 'none';
    document.getElementById('errorBox').classList.remove('visible');
    document.getElementById('fetchBtnText').textContent = 'Fetch E-Paper';
    document.getElementById('fetchBtn').disabled = false;
}

function showError(message) {
    setUIState('idle');
    document.getElementById('errorText').innerHTML = message;
    document.getElementById('errorBox').classList.add('visible');
}

// ─── CONFETTI ─────────────────────────────────────────
function triggerConfetti() {
    if (typeof confetti === 'undefined') return;
    const end = Date.now() + 2500;
    const interval = setInterval(() => {
        if (Date.now() > end) return clearInterval(interval);
        confetti({ particleCount: 40, spread: 360, startVelocity: 25, ticks: 50, zIndex: 9999,
            origin: { x: Math.random(), y: Math.random() * 0.4 } });
    }, 300);
}

// ─── PWA ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}
