require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const path = require('path');

const app = express();
app.use(express.json());

// Security headers (allow iframes for our own frontend)
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors());

// Rate limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 120,
    message: { success: false, error: 'Too many requests, please slow down.' }
});
app.use('/api/', apiLimiter);

// ─── Serve frontend static files ────────────────────
// Express will serve the frontend folder so one deployment = full website
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── Newspaper Source Directory ─────────────────────
const PAPER_SOURCES = {
    'ei-samay': {
        name: 'Ei Samay',
        emoji: '📰',
        lang: 'Bengali',
        targets: [
            'https://www.fresherwave.com/today-ei-samay-epaper-in-pdf-p24/',
            'https://www.careerswave.in/ei-samay-epaper-pdf-free-download/'
        ]
    },
    'economic-times': {
        name: 'Economic Times',
        emoji: '💹',
        lang: 'English',
        targets: [
            'https://www.fresherwave.com/economic-times-epaper-pdf-in-p2024/',
            'https://www.fresherwave.com/today-the-economic-times-epaper-in-pdf/',
            'https://www.careerswave.in/economic-times-epaper-pdf-free-download/'
        ]
    }
};

// ─── In-Memory Cache ─────────────────────────────────
const MEMORY_CACHE = {};

function getTodayDate() {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
}

// Generate multiple date format variants to match any site's format
function getDateVariants(dateStr) {
    // dateStr is DD-MM-YYYY
    const [dd, mm, yyyy] = dateStr.split('-');
    const date = new Date(parseInt(yyyy), parseInt(mm)-1, parseInt(dd));
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const shortMonths = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const mIdx = parseInt(mm) - 1;
    return [
        dateStr,                              // 31-03-2026
        `${dd}/${mm}/${yyyy}`,                // 31/03/2026
        `${dd}-${mm}-${yyyy}`,               // 31-03-2026
        `${yyyy}-${mm}-${dd}`,               // 2026-03-31
        `${dd} ${monthNames[mIdx]} ${yyyy}`,  // 31 March 2026
        `${dd} ${shortMonths[mIdx]} ${yyyy}`, // 31 Mar 2026
        `${monthNames[mIdx]} ${dd}, ${yyyy}`, // March 31, 2026
        `${dd}.${mm}.${yyyy}`,               // 31.03.2026
    ];
}

// ─── Scraping Logic ──────────────────────────────────
function extractPdfLinkForDate(html, targetDate) {
    const $ = cheerio.load(html);
    let found = null;
    const variants = getDateVariants(targetDate);

    // Method 1: Find any date variant in table rows
    $('tr').each((i, row) => {
        if (found) return;
        const text = $(row).text();
        const hasDate = variants.some(v => text.includes(v));
        if (hasDate) {
            const match = text.match(/https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/(?:view|edit|preview)[^"'\s]*/i);
            if (match) { found = match[0]; return; }
            const href = $(row).find('a[href*="drive.google.com"]').attr('href');
            if (href) found = href;
        }
    });

    // Method 2: Find any date variant in any paragraph/div/td text, then find nearest link
    if (!found) {
        $('p, div, td, li, span').each((i, el) => {
            if (found) return;
            const text = $(el).text();
            const hasDate = variants.some(v => text.includes(v));
            if (hasDate) {
                // Look for drive link in text
                const match = text.match(/https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/(?:view|edit|preview)[^"'\s]*/i);
                if (match) { found = match[0]; return; }
                // Look for nearby anchor
                const href = $(el).find('a[href*="drive.google"]').attr('href')
                    || $(el).closest('tr').find('a[href*="drive.google"]').attr('href');
                if (href) found = href;
            }
        });
    }

    // Method 3: For today's date or if no date found, grab first Drive link on the page
    if (!found && (targetDate === getTodayDate() || !found)) {
        const match = html.match(/https:\/\/drive\.google\.com\/file\/d\/[a-zA-Z0-9_-]+\/(?:view|edit|preview)[^"'\s]*/i);
        if (match) return match[0];
        $('a[href*="drive.google.com/file/d/"]').each((i, el) => {
            if (!found) found = $(el).attr('href');
        });
    }

    return found;
}


async function tryScrapeUrl(url, targetDate) {
    const response = await axios.get(url, {
        timeout: 12000,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/121' }
    });
    const link = extractPdfLinkForDate(response.data, targetDate);
    if (link) return link;
    throw new Error('No link found');
}

async function fetchPaper(paperId, targetDate) {
    const config = PAPER_SOURCES[paperId];
    if (!config) return null;

    // Serve from cache if available
    if (MEMORY_CACHE[paperId]?.[targetDate]) {
        console.log(`[Cache] Hit for ${paperId} on ${targetDate}`);
        return MEMORY_CACHE[paperId][targetDate];
    }

    console.log(`[Scraper] Fetching ${config.name} for ${targetDate}...`);
    const promises = config.targets.map(url => tryScrapeUrl(url, targetDate));

    try {
        const url = await Promise.any(promises);
        if (!MEMORY_CACHE[paperId]) MEMORY_CACHE[paperId] = {};
        MEMORY_CACHE[paperId][targetDate] = url;
        console.log(`[Scraper] Found: ${url}`);
        return url;
    } catch {
        console.warn(`[Scraper] All sources failed for ${config.name} on ${targetDate}`);
        return null;
    }
}

// ─── API Routes ──────────────────────────────────────
app.get('/api/papers', (req, res) => {
    res.json({ success: true, papers: PAPER_SOURCES });
});

app.get('/api/paper', async (req, res) => {
    const paperId = req.query.id || 'ei-samay';
    const targetDate = req.query.date || getTodayDate();

    if (!PAPER_SOURCES[paperId]) {
        return res.status(400).json({ success: false, error: 'Invalid newspaper ID.' });
    }

    const url = await fetchPaper(paperId, targetDate);

    if (url) {
        return res.json({ success: true, url, date: targetDate, paper: PAPER_SOURCES[paperId].name });
    } else {
        return res.status(404).json({
            success: false,
            error: `Could not find ${PAPER_SOURCES[paperId].name} for ${targetDate}. The edition may not be uploaded yet — try again later.`
        });
    }
});

// Catch-all: serve index.html for any non-API route
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// ─── Morning Cron Job ────────────────────────────────
cron.schedule('0 6 * * *', async () => {
    const today = getTodayDate();
    console.log(`[Cron] Morning auto-scrape for ${today}...`);
    for (const id of Object.keys(PAPER_SOURCES)) {
        await fetchPaper(id, today);
    }
    console.log('[Cron] Done. Cache primed for today.');
});

// ─── Start ───────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n🚀 E-Paper Hub running → http://localhost:${PORT}`);
    console.log(`   Papers: ${Object.keys(PAPER_SOURCES).join(', ')}`);
    console.log(`   Rate limiting: ON | Caching: ON | Cron: 6:00 AM daily\n`);
});
