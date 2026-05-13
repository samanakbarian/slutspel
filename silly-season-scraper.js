// ============================================================
// SILLY SEASON SCRAPER v2 — GOOGLE NEWS RSS + RULE-BASED CLASSIFIER
// ============================================================
// Hämtar nyheter via Google News RSS (pålitligt, ingen JS-rendering)
// Klassificerar med regelbaserad logik
// Cachar i minnet med fallback till JSON-fil
// ============================================================

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ===== CONFIG =====
const CACHE_FILE = path.join(__dirname, 'data', 'silly-season-cache.json');
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // 30 minuter
const REQUEST_TIMEOUT_MS = 15000;

// ===== KEYWORDS =====

const BJORKLOVEN_TOKENS = [
    'björklöven', 'bjorkloven', 'björklövens', 'bjorklovens',
    'löven',
];

const EXTENSION_KEYWORDS = [
    'förlänger', 'forlanger', 'förlängde', 'forlangde',
    'förlängning', 'forlangning', 'kontraktsförlängning',
    'nytt kontrakt', 'skriver nytt', 'nytt avtal',
    'stannar kvar', 'stannar i',
];

const SIGNING_KEYWORDS = [
    'klar för björklöven', 'klar for bjorkloven',
    'klar för löven', 'klar for loven',
    'ansluter till björklöven', 'ansluter till bjorkloven',
    'nyförvärv', 'nyforvarv', 'värvar', 'varvar',
    'signerar', 'skrivit på', 'skrivit pa',
    'förstärker', 'forstarker',
];

const LOSS_KEYWORDS = [
    'lämnar björklöven', 'lamnar bjorkloven',
    'lämnade björklöven', 'lamnade bjorkloven',
    'lämnar löven', 'lamnar loven',
    'lämnade löven', 'lamnade loven',
    'tackar av', 'inte förlänger', 'inte forlanger',
    'klar för ny klubb', 'klar for ny klubb',
    'klar för annan', 'klar for annan',
    'lämnar', 'lamnar', 'lämnade', 'lamnade',
];

const RUMOR_KEYWORDS = [
    'rykte', 'ryktas', 'uppges', 'kopplas',
    'intresse', 'jagas', 'kan värva', 'kan varva',
    'uppgifter:', 'uppgifter',
    'spekuleras', 'enligt uppgifter',
];

const TRANSFER_RELEVANCE_WORDS = [
    ...EXTENSION_KEYWORDS, ...SIGNING_KEYWORDS, ...LOSS_KEYWORDS, ...RUMOR_KEYWORDS,
    'kontrakt', 'transfer', 'övergång', 'overgang', 'utlåning', 'utlaning',
];

// ===== IN-MEMORY STATE =====
let cachedData = null;
let lastFetchTime = null;
let isFetching = false;
let refreshTimer = null;

// ===== HTTP FETCH UTILITY =====
function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const req = client.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7',
            },
            timeout: REQUEST_TIMEOUT_MS,
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const nextUrl = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).toString();
                return fetchUrl(nextUrl).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) {
                res.resume();
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            res.on('error', reject);
        });
        req.on('timeout', () => { req.destroy(); reject(new Error(`Timeout for ${url}`)); });
        req.on('error', reject);
    });
}

// ===== HELPERS =====

function hasBjorklovenContext(text) {
    const t = text.toLowerCase();
    return BJORKLOVEN_TOKENS.some(token => t.includes(token));
}

function isTransferRelevant(text) {
    const t = text.toLowerCase();
    return TRANSFER_RELEVANCE_WORDS.some(kw => t.includes(kw));
}

function normalizeTitle(title) {
    return (title || '').toLowerCase()
        .replace(/[^\wåäö\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function titleSimilarity(a, b) {
    const wordsA = new Set(a.split(' '));
    const wordsB = new Set(b.split(' '));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    return intersection.size / Math.max(wordsA.size, wordsB.size);
}

// ===== CLASSIFICATION =====

function classifyArticle(title, body = '', source = '') {
    const text = `${title} ${body}`.toLowerCase();
    const isOfficial = (source || '').toLowerCase().includes('bjorkloven') || (source || '').toLowerCase().includes('björklöven');
    const bjCtx = hasBjorklovenContext(text);

    // 1. Extensions
    if (EXTENSION_KEYWORDS.some(kw => text.includes(kw))) {
        const falsePositives = ['segersvit', 'segerserien', 'vinst', 'poängserie',
            'efter förlängning', 'efter forlangning', 'kvartsfinal', 'semifinal', 'final',
            'vann', 'förlorade'];
        if (falsePositives.some(fp => text.includes(fp))) {
            // Not a contract extension, fall through
        } else if (bjCtx || isOfficial) {
            return 'KONTRAKTSFÖRLÄNGNING';
        } else {
            const contractWords = ['kontrakt', 'avtal', 'säsong', 'skriver', 'stannar'];
            if (contractWords.some(cw => text.includes(cw))) {
                return 'KONTRAKTSFÖRLÄNGNING';
            }
        }
    }

    // 2. Signings
    if (SIGNING_KEYWORDS.some(kw => text.includes(kw))) {
        if (bjCtx || isOfficial) return 'BEKRÄFTAT_NYFÖRVÄRV';
    }

    // 3. Losses
    if (LOSS_KEYWORDS.some(kw => text.includes(kw))) {
        if (bjCtx || isOfficial) return 'BEKRÄFTAD_FÖRLUST';
    }

    // 4. Rumors
    if (RUMOR_KEYWORDS.some(kw => text.includes(kw))) {
        if (bjCtx || isOfficial) return 'HETT_RYKTE';
    }

    return 'ÖVRIGT';
}

function classifyPriority(title, source = '') {
    const t = title.toLowerCase();
    const isOfficial = (source || '').toLowerCase().includes('bjorkloven');
    if (isOfficial && (t.includes('klar') || t.includes('förlänger') || t.includes('lämnar'))) return 'breaking';
    if (t.includes('officiellt') || t.includes('bekräftat') || t.includes('klar för')) return 'high';
    if (t.includes('uppgifter') || t.includes('avslöjar')) return 'high';
    return 'normal';
}

// ===== GOOGLE NEWS RSS SCRAPER =====

async function scrapeGoogleNewsRSS(query, label = '') {
    const encoded = encodeURIComponent(query);
    const url = `https://news.google.com/rss/search?q=${encoded}&hl=sv&gl=SE&ceid=SE:sv`;
    const articles = [];

    try {
        const xml = await fetchUrl(url);
        const $ = cheerio.load(xml, { xmlMode: true });

        $('item').each((i, el) => {
            const $el = $(el);
            const title = $el.find('title').text().trim();
            const link = $el.find('link').text().trim();
            const pubDate = $el.find('pubDate').text().trim();
            const sourceName = $el.find('source').text().trim();

            if (!title || !link) return;

            articles.push({
                title,
                link,
                pubDate,
                sourceName,
                queryLabel: label,
            });
        });

        console.log(`[Scraper] Google News RSS [${label}]: ${articles.length} items`);
    } catch (err) {
        console.error(`[Scraper] Google News RSS [${label}] error:`, err.message);
    }

    return articles;
}

// ===== PARSE PUB DATE =====

function parsePubDate(pubDateStr) {
    if (!pubDateStr) return new Date().toISOString().split('T')[0];
    try {
        const d = new Date(pubDateStr);
        if (!isNaN(d.getTime())) {
            return d.toISOString().split('T')[0];
        }
    } catch (e) { /* ignore */ }
    return new Date().toISOString().split('T')[0];
}

// ===== DEDUPLICATION =====

function deduplicateArticles(articles, baselineTitles = []) {
    const seenTitles = baselineTitles.map(t => normalizeTitle(t));
    const unique = [];

    for (const art of articles) {
        const norm = normalizeTitle(art.title);
        if (!norm) continue;

        let isDupe = false;
        for (const seen of seenTitles) {
            if (titleSimilarity(norm, seen) > 0.70) {
                isDupe = true;
                break;
            }
        }

        if (!isDupe) {
            unique.push(art);
            seenTitles.push(norm);
        }
    }

    return unique;
}

// ===== PROCESS ARTICLES =====

function processArticles(rawArticles) {
    const results = [];

    for (const art of rawArticles) {
        const { title, link, pubDate, sourceName } = art;
        const fullText = `${title} ${sourceName}`;

        // Must mention Björklöven
        if (!hasBjorklovenContext(fullText + ' ' + link)) continue;

        // Must be transfer-relevant
        if (!isTransferRelevant(title)) continue;

        // Classify
        const tag = classifyArticle(title, '', sourceName);
        if (tag === 'ÖVRIGT') continue;

        results.push({
            title,
            body: '',
            source: sourceName || 'Google News',
            url: link,
            date: parsePubDate(pubDate),
            tag,
            priority: classifyPriority(title, sourceName),
        });
    }

    return results;
}

// ===== MAIN FETCH & MERGE =====

async function fetchAndMerge() {
    if (isFetching) {
        console.log('[Scraper] Hämtning pågår redan, hoppar över...');
        return cachedData;
    }

    isFetching = true;
    console.log(`[Scraper] Startar v2-hämtning... ${new Date().toLocaleTimeString('sv-SE')}`);

    try {
        // Fetch from Google News RSS with two complementary queries
        const [gnOfficial, gnTransfer] = await Promise.allSettled([
            scrapeGoogleNewsRSS(
                'site:bjorkloven.com (förlänger OR klar OR lämnar OR nyförvärv OR kontrakt OR värvar OR ansluter)',
                'gn_official'
            ),
            scrapeGoogleNewsRSS(
                '"Björklöven" (förlänger OR klar för OR lämnar OR nyförvärv OR kontrakt OR värvar)',
                'gn_transfer'
            ),
        ]);

        const allRaw = [
            ...(gnOfficial.status === 'fulfilled' ? gnOfficial.value : []),
            ...(gnTransfer.status === 'fulfilled' ? gnTransfer.value : []),
        ];

        console.log(`[Scraper] Totalt ${allRaw.length} raw items från Google News RSS`);

        // Deduplicate raw articles (between the two Google News queries)
        const deduped = deduplicateArticles(allRaw, []);
        console.log(`[Scraper] ${deduped.length} unika artiklar efter dedup (borttog ${allRaw.length - deduped.length} dupes)`);

        // Classify
        const classified = processArticles(deduped);
        console.log(`[Scraper] ${classified.length} artiklar klassificerade`);

        // Create news feed items
        const scrapedNewsItems = classified.map((article, i) => ({
            id: `scraped-${Date.now()}-${i}`,
            date: article.date,
            time: new Date().toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' }),
            tag: article.tag,
            title: article.title,
            body: article.body || '',
            source: article.source,
            priority: article.priority,
            url: article.url,
            scraped: true,
        }));

        // Sort by date descending
        scrapedNewsItems.sort((a, b) => {
            const dateComp = (b.date || '').localeCompare(a.date || '');
            if (dateComp !== 0) return dateComp;
            return (b.time || '').localeCompare(a.time || '');
        });

        // Group stats by tag
        const tagCounts = {};
        classified.forEach(a => { tagCounts[a.tag] = (tagCounts[a.tag] || 0) + 1; });

        // Load baseline for structural data only (roster, rink_positions — NOT news_feed)
        let baseline;
        try {
            delete require.cache[require.resolve('./silly-season-data')];
            const mod = require('./silly-season-data');
            baseline = mod.SILLY_SEASON_BASELINE;
        } catch (e) {
            console.error('[Scraper] Kunde inte ladda baseline:', e.message);
            baseline = {};
        }

        // Build data: structural from baseline + only scraped news
        cachedData = {
            headline: baseline.headline || 'Silly Season',
            subline: baseline.subline || '',
            season: baseline.season || '2026/2027',
            league: baseline.league || 'SHL',
            roster: baseline.roster || [],
            rink_positions: baseline.rink_positions || {},
            hot_rumors_in: baseline.hot_rumors_in || [],
            hot_rumors_out: baseline.hot_rumors_out || [],
            news_feed: scrapedNewsItems,
            _meta: {
                lastRefresh: new Date().toISOString(),
                scrapedArticles: allRaw.length,
                newArticles: classified.length,
                tagCounts,
                sources: {
                    'gn_official': gnOfficial.status === 'fulfilled' ? gnOfficial.value.length : 'error',
                    'gn_transfer': gnTransfer.status === 'fulfilled' ? gnTransfer.value.length : 'error',
                },
            },
        };

        lastFetchTime = new Date();
        saveCacheToFile(cachedData);

        console.log(`[Scraper] ✅ v2 klar! ${scrapedNewsItems.length} nyheter (enbart skrapade). Tags: ${JSON.stringify(tagCounts)}`);

    } catch (err) {
        console.error('[Scraper] Fel vid hämtning:', err.message);
        if (!cachedData) {
            cachedData = loadCacheFromFile();
        }
    } finally {
        isFetching = false;
    }

    return cachedData;
}

// ===== FILE CACHE =====

function saveCacheToFile(data) {
    try {
        const dir = path.dirname(CACHE_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (err) {
        console.error('[Scraper] Kunde inte spara cache:', err.message);
    }
}

function loadCacheFromFile() {
    try {
        if (fs.existsSync(CACHE_FILE)) {
            const data = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
            console.log('[Scraper] Laddade cachad data från fil');
            return data;
        }
    } catch (err) {
        console.error('[Scraper] Kunde inte ladda cache:', err.message);
    }
    return null;
}

// ===== PUBLIC API =====

async function getSillySeasonData() {
    if (cachedData) return cachedData;
    cachedData = loadCacheFromFile();
    if (cachedData) return cachedData;
    return fetchAndMerge();
}

async function refreshSillySeasonData() {
    return fetchAndMerge();
}

function startAutoRefresh() {
    fetchAndMerge().catch(err => console.error('[Scraper] Initial fetch failed:', err.message));
    refreshTimer = setInterval(() => {
        fetchAndMerge().catch(err => console.error('[Scraper] Auto-refresh failed:', err.message));
    }, REFRESH_INTERVAL_MS);
    console.log(`[Scraper] v2 auto-refresh aktiverad, intervall: ${REFRESH_INTERVAL_MS / 60000} minuter`);
}

function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('[Scraper] Auto-refresh stoppad');
    }
}

function getScraperStatus() {
    return {
        version: 'v2-google-news-rss',
        lastRefresh: lastFetchTime?.toISOString() || null,
        isFetching,
        hasCachedData: !!cachedData,
        refreshIntervalMs: REFRESH_INTERVAL_MS,
        cacheFile: CACHE_FILE,
    };
}

module.exports = {
    getSillySeasonData,
    refreshSillySeasonData,
    startAutoRefresh,
    stopAutoRefresh,
    getScraperStatus,
};
