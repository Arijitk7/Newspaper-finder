// ─── STATE ─────────────────────────────────────────────────────────────────
const BASE_URL = ''; // same-origin — works locally AND on Render
let selectedPaper = localStorage.getItem('selectedPaper') || 'ei-samay';
let currentPdfUrl = '';
let currentPaperName = '';
let currentDate = '';

// ─── INIT ───────────────────────────────────────────────────────────────────
(function init() {
    // Smart date: before 7 AM IST (UTC+5:30), default to YESTERDAY because today's paper isn't out yet
    const now = new Date();
    // IST offset = +5:30 = 330 minutes
    const istOffset = 330 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istHour = istNow.getUTCHours();

    // Use today if IST hour >= 7, otherwise use yesterday
    const displayDate = new Date(istNow);
    if (istHour < 7) {
        displayDate.setUTCDate(displayDate.getUTCDate() - 1);
    }

    const yyyy = displayDate.getUTCFullYear();
    const mm = String(displayDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(displayDate.getUTCDate()).padStart(2, '0');

    // Max selectable date = today always
    const todayIST = new Date(istNow);
    const todayYYYY = todayIST.getUTCFullYear();
    const todayMM = String(todayIST.getUTCMonth() + 1).padStart(2, '0');
    const todayDD = String(todayIST.getUTCDate()).padStart(2, '0');

    const dateInput = document.getElementById('dateInput');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
    dateInput.max = `${todayYYYY}-${todayMM}-${todayDD}`;

    // Restore saved paper
    selectPaper(selectedPaper, false);

    // Scroll animations
    initScrollAnimations();
    initMagneticButtons();
})();

// ─── PAPER SELECTION ────────────────────────────────────────────────────────
function selectPaper(paperId, save = true) {
    selectedPaper = paperId;
    if (save) localStorage.setItem('selectedPaper', paperId);
    document.querySelectorAll('.paper-card').forEach(c => c.classList.remove('active'));
    const card = document.getElementById(`card-${paperId}`);
    if (card) {
        card.classList.add('active');
        // Ripple effect
        spawnRipple(card);
    }
    hideResultAndError();
}

// ─── FETCH ──────────────────────────────────────────────────────────────────
async function doFetch() {
    const rawDate = document.getElementById('dateInput').value;
    if (!rawDate) { showError('Please select a date to continue.'); return; }

    // Format: YYYY-MM-DD → DD-MM-YYYY for our backend
    const [yyyy, mm, dd] = rawDate.split('-');
    const formattedDate = `${dd}-${mm}-${yyyy}`;

    // Update loader label
    const loaderText = document.getElementById('loaderText');
    if (loaderText) loaderText.textContent = `Scanning archives for ${formattedDate}...`;

    setUIState('loading');

    try {
        const res = await fetch(`${BASE_URL}/api/paper?id=${selectedPaper}&date=${formattedDate}`);
        const data = await res.json();

        if (data.success && data.url) {
            currentPdfUrl = data.url;
            currentPaperName = data.paper;
            currentDate = data.date;

            // Build clean Google Drive preview URL
            const previewUrl = currentPdfUrl.includes('drive.google.com') && currentPdfUrl.includes('/view')
                ? currentPdfUrl.replace('/view', '/preview')
                : currentPdfUrl;

            document.getElementById('readerBtn').href = previewUrl;
            document.getElementById('resultLabel').textContent = `${currentPaperName} — ${currentDate}`;

            // Subtle success pulse instead of confetti
            pulseSuccess();
            setUIState('result');
        } else {
            showError(data.error || `No PDF found for this date. It may not be uploaded yet — try a recent date.`);
        }
    } catch (err) {
        showError(`Connection failed. Is the server awake? Try refreshing and waiting 30 seconds if it just woke up.<br><small style="opacity:0.6;">${err.message}</small>`);
    }
}

// ─── SHARE ──────────────────────────────────────────────────────────────────
async function doShare() {
    if (!currentPdfUrl) return;
    if (navigator.share) {
        try {
            await navigator.share({
                title: `${currentPaperName} — ${currentDate}`,
                text: `📰 Read today's ${currentPaperName}`,
                url: currentPdfUrl
            });
        } catch (e) { /* user cancelled */ }
    } else {
        await navigator.clipboard.writeText(currentPdfUrl);
        // Flash the share button
        const btn = document.querySelector('.btn-share');
        if (btn) {
            const orig = btn.innerHTML;
            btn.innerHTML = '<i class="fa-solid fa-check"></i> <span>Link Copied!</span>';
            btn.style.color = '#10b981';
            setTimeout(() => { btn.innerHTML = orig; btn.style.color = ''; }, 2000);
        }
    }
}

// ─── UI STATE MACHINE ───────────────────────────────────────────────────────
function setUIState(state) {
    document.getElementById('loaderBox').style.display = 'none';
    document.getElementById('resultCard').style.display = 'none';
    document.getElementById('errorBox').classList.remove('visible');
    document.getElementById('fetchBtn').disabled = false;

    const btnText = document.getElementById('btnText');

    if (state === 'loading') {
        document.getElementById('loaderBox').style.display = 'block';
        document.getElementById('fetchBtn').disabled = true;
        if (btnText) btnText.textContent = 'Searching...';
    } else if (state === 'result') {
        document.getElementById('resultCard').style.display = 'block';
        if (btnText) btnText.textContent = 'Fetch Another Edition';
    } else {
        if (btnText) btnText.textContent = "Fetch Today's E-Paper";
    }
}

function hideResultAndError() {
    document.getElementById('resultCard').style.display = 'none';
    document.getElementById('errorBox').classList.remove('visible');
    const btnText = document.getElementById('btnText');
    if (btnText) btnText.textContent = "Fetch Today's E-Paper";
    document.getElementById('fetchBtn').disabled = false;
}

function showError(message) {
    setUIState('idle');
    document.getElementById('errorText').innerHTML = message;
    document.getElementById('errorBox').classList.add('visible');

    // Shake animation on error
    const box = document.getElementById('errorBox');
    box.style.animation = 'none';
    box.offsetHeight; // reflow
    box.style.animation = 'shake 0.4s cubic-bezier(.36,.07,.19,.97)';
}

// ─── SUCCESS PULSE (replaces confetti) ────────────────────────────────────
function pulseSuccess() {
    const btn = document.getElementById('fetchBtn');
    if (!btn) return;
    btn.style.boxShadow = '0 0 0 0 rgba(34, 197, 94, 0.6)';
    btn.style.transition = 'box-shadow 0.1s';
    let step = 0;
    const sizes = ['0 0 0 8px rgba(34,197,94,0.3)', '0 0 0 16px rgba(34,197,94,0.15)', '0 0 0 24px rgba(34,197,94,0)', ''];
    const t = setInterval(() => {
        btn.style.boxShadow = sizes[step] || '';
        step++;
        if (step >= sizes.length) clearInterval(t);
    }, 150);
}

// ─── RIPPLE EFFECT ──────────────────────────────────────────────────────────
function spawnRipple(el) {
    const r = document.createElement('span');
    r.style.cssText = `
        position: absolute; border-radius: 50%;
        width: 200px; height: 200px;
        left: 50%; top: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: rgba(99,102,241,0.25);
        animation: rippleAnim 0.5s ease-out forwards;
        pointer-events: none;
    `;
    el.appendChild(r);
    setTimeout(() => r.remove(), 600);
}

// ─── SCROLL ANIMATIONS ──────────────────────────────────────────────────────
function initScrollAnimations() {
    // Add initial hidden state to all animatable elements
    const targets = document.querySelectorAll(
        '.hero, .paper-grid, .controls, .fetch-btn, .hero-eyebrow, .hero h1, .hero p, .paper-card, .footer'
    );

    targets.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(32px)';
        el.style.transition = `opacity 0.7s ease ${i * 0.06}s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.06}s`;
    });

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    targets.forEach(el => observer.observe(el));
}

// ─── MAGNETIC BUTTON EFFECT ─────────────────────────────────────────────────
function initMagneticButtons() {
    const btn = document.getElementById('fetchBtn');
    if (!btn) return;

    btn.addEventListener('mousemove', (e) => {
        if (btn.disabled) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translateY(-3px) translate(${x * 0.06}px, ${y * 0.12}px)`;
    });

    btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
    });
}

// ─── PARALLAX ───────────────────────────────────────────────────────────────
document.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2;
    const y = (e.clientY / window.innerHeight - 0.5) * 2;

    document.querySelectorAll('.orb-1').forEach(o => {
        o.style.transform = `translate(${x * 18}px, ${y * 12}px)`;
    });
    document.querySelectorAll('.orb-2').forEach(o => {
        o.style.transform = `translate(${x * -14}px, ${y * -10}px)`;
    });
    document.querySelectorAll('.orb-3').forEach(o => {
        o.style.transform = `translateX(-50%) translate(${x * 10}px, ${y * 8}px)`;
    });
});

// ─── Add global CSS for animations not in HTML ─────────────────────────────
const style = document.createElement('style');
style.textContent = `
    @keyframes rippleAnim {
        to { transform: translate(-50%, -50%) scale(3); opacity: 0; }
    }
    @keyframes shake {
        10%, 90% { transform: translateX(-2px); }
        20%, 80% { transform: translateX(4px); }
        30%, 50%, 70% { transform: translateX(-6px); }
        40%, 60% { transform: translateX(6px); }
    }
`;
document.head.appendChild(style);
