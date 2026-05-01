// ============================================================
// SILLY SEASON SCRAPER — AUTO-REFRESH VIA WEB SCRAPING
// ============================================================
// Hämtar nyheter från bjorkloven.com och hockeysverige.se
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

// Nyckelord för att filtrera Björklöven-relaterade nyheter
const BJORKLOVEN_KEYWORDS = [
    'björklöven', 'bjorkloven', 'löven', 'björklövens',
    'visionite arena', 'umeå hockey',
];

const TRANSFER_KEYWORDS = {
    BEKRÄFTAT_NYFÖRVÄRV: ['nyförvärv', 'klar för', 'skrivit på', 'skriver på', 'signerar', 'signerat', 'värvning', 'ansluter', 'förstärker'],
    BEKRÄFTAD_FÖRLUST: ['lämnar', 'tackar av', 'inte förlänger', 'klar för annan', 'säljer', 'övergång från'],
    KONTRAKTSFÖRLÄNGNING: ['förlänger', 'förlängd', 'nytt kontrakt', 'nytt avtal', 'skriver nytt'],
    HETT_RYKTE: ['rykte', 'ryktas', 'intresse', 'kan bli', 'uppges', 'enligt uppgifter', 'spekuleras'],
};

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
            // Handle redirects
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

// ===== SCRAPERS =====

/**
 * Scrape bjorkloven.com/nyheter for official news
 */
async function scrapeBjorklovenOfficial() {
    const articles = [];
    try {
        const html = await fetchUrl('https://www.bjorkloven.com/nyheter');
        const $ = cheerio.load(html);

        // Try common news listing patterns
        $('article, .news-item, .post-item, [class*="news"], [class*="article"]').each((i, el) => {
            const $el = $(el);
            const title = $el.find('h2, h3, .title, [class*="title"], [class*="heading"]').first().text().trim();
            const body = $el.find('p, .excerpt, .summary, [class*="excerpt"], [class*="summary"]').first().text().trim();
            const link = $el.find('a').first().attr('href') || '';
            const dateStr = $el.find('time, .date, [class*="date"]').first().text().trim()
                || $el.find('time').attr('datetime') || '';

            if (title && isBjorklovenRelevant(title + ' ' + body)) {
                articles.push({
                    title,
                    body: body.slice(0, 200),
                    source: 'bjorkloven.com',
                    url: link.startsWith('http') ? link : `https://www.bjorkloven.com${link}`,
                    date: parseSwedishDate(dateStr),
                    tag: classifyArticle(title + ' ' + body),
                    priority: classifyPriority(title + ' ' + body),
                });
            }
        });

        // Fallback: if no articles found, try generic link approach
        if (articles.length === 0) {
            $('a').each((i, el) => {
                const $el = $(el);
                const text = $el.text().trim();
                const href = $el.attr('href') || '';
                if (text.length > 20 && text.length < 200 && (href.includes('nyheter') || href.includes('news'))) {
                    if (isTransferRelated(text)) {
                        articles.push({
                            title: text,
                            body: '',
                            source: 'bjorkloven.com',
                            url: href.startsWith('http') ? href : `https://www.bjorkloven.com${href}`,
                            date: new Date().toISOString().split('T')[0],
                            tag: classifyArticle(text),
                            priority: 'normal',
                        });
                    }
                }
            });
        }

        console.log(`[Scraper] bjorkloven.com: ${articles.length} artiklar hittade`);
    } catch (err) {
        console.error(`[Scraper] bjorkloven.com fel:`, err.message);
    }
    return articles;
}

/**
 * Scrape hockeysverige.se for Björklöven news
 */
async function scrapeHockeysverige() {
    const articles = [];
    try {
        // Try team-specific page
        const urls = [
            'https://www.hockeysverige.se/shl/bjorkloven',
            'https://www.hockeysverige.se/lag/bjorkloven',
        ];

        for (const url of urls) {
            try {
                const html = await fetchUrl(url);
                const $ = cheerio.load(html);

                $('article, .article, [class*="article"], [class*="news"]').each((i, el) => {
                    const $el = $(el);
                    const title = $el.find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
                    const body = $el.find('p, .teaser, .preamble, [class*="preamble"]').first().text().trim();
                    const link = $el.find('a').first().attr('href') || '';
                    const dateStr = $el.find('time, .date, [class*="date"], [class*="time"]').first().text().trim()
                        || $el.find('time').attr('datetime') || '';

                    if (title && title.length > 10 && isBjorklovenRelevant(title + ' ' + body)) {
                        articles.push({
                            title,
                            body: body.slice(0, 200),
                            source: 'hockeysverige.se',
                            url: link.startsWith('http') ? link : `https://www.hockeysverige.se${link}`,
                            date: parseSwedishDate(dateStr),
                            tag: classifyArticle(title + ' ' + body),
                            priority: classifyPriority(title + ' ' + body),
                        });
                    }
                });

                if (articles.length > 0) break; // Found articles, stop trying URLs
            } catch (e) {
                continue;
            }
        }

        console.log(`[Scraper] hockeysverige.se: ${articles.length} artiklar hittade`);
    } catch (err) {
        console.error(`[Scraper] hockeysverige.se fel:`, err.message);
    }
    return articles;
}

/**
 * Scrape hockeynews.se for Björklöven news
 */
async function scrapeHockeynews() {
    const articles = [];
    try {
        const urls = [
            'https://www.hockeynews.se/tag/bjorkloven',
            'https://www.hockeynews.se/nyheter',
        ];

        for (const url of urls) {
            try {
                const html = await fetchUrl(url);
                const $ = cheerio.load(html);

                $('article, .post, [class*="post"], [class*="article"]').each((i, el) => {
                    const $el = $(el);
                    const title = $el.find('h2, h3, h4, .entry-title, [class*="title"]').first().text().trim();
                    const body = $el.find('p, .excerpt, .entry-summary, [class*="excerpt"]').first().text().trim();
                    const link = $el.find('a').first().attr('href') || '';
                    const dateStr = $el.find('time, .date, [class*="date"]').first().text().trim()
                        || $el.find('time').attr('datetime') || '';

                    if (title && title.length > 10 && isBjorklovenRelevant(title + ' ' + body)) {
                        articles.push({
                            title,
                            body: body.slice(0, 200),
                            source: 'hockeynews.se',
                            url: link.startsWith('http') ? link : `https://www.hockeynews.se${link}`,
                            date: parseSwedishDate(dateStr),
                            tag: classifyArticle(title + ' ' + body),
                            priority: classifyPriority(title + ' ' + body),
                        });
                    }
                });

                if (articles.length > 0) break;
            } catch (e) {
                continue;
            }
        }

        console.log(`[Scraper] hockeynews.se: ${articles.length} artiklar hittade`);
    } catch (err) {
        console.error(`[Scraper] hockeynews.se fel:`, err.message);
    }
    return articles;
}

/**
 * Scrape dagenshockey.se for news
 */
async function scrapeDagenshockey() {
    const articles = [];
    try {
        const html = await fetchUrl('https://www.dagenshockey.se');
        const $ = cheerio.load(html);

        $('article, .post, [class*="article"], [class*="post"]').each((i, el) => {
            const $el = $(el);
            const title = $el.find('h2, h3, h4, .title, [class*="title"]').first().text().trim();
            const body = $el.find('p, .excerpt, [class*="excerpt"]').first().text().trim();
            const link = $el.find('a').first().attr('href') || '';
            const dateStr = $el.find('time, .date, [class*="date"]').first().text().trim()
                || $el.find('time').attr('datetime') || '';

            if (title && title.length > 10 && isBjorklovenRelevant(title + ' ' + body)) {
                articles.push({
                    title,
                    body: body.slice(0, 200),
                    source: 'dagenshockey.se',
                    url: link.startsWith('http') ? link : `https://www.dagenshockey.se${link}`,
                    date: parseSwedishDate(dateStr),
                    tag: classifyArticle(title + ' ' + body),
                    priority: classifyPriority(title + ' ' + body),
                });
            }
        });

        console.log(`[Scraper] dagenshockey.se: ${articles.length} artiklar hittade`);
    } catch (err) {
        console.error(`[Scraper] dagenshockey.se fel:`, err.message);
    }
    return articles;
}

/**
 * Scrape Expressen/MrMadhawk for Björklöven news
 */
async function scrapeMrMadhawk() {
    const articles = [];
    try {
        const url = 'https://www.expressen.se/sport/hockey/';
        const html = await fetchUrl(url);
        const $ = cheerio.load(html);

        $('article, .teaser, [class*="article"], [class*="teaser"]').each((i, el) => {
            const $el = $(el);
            const title = $el.find('h2, h3, .title, [class*="title"]').first().text().trim();
            const body = $el.find('p, .preamble, [class*="preamble"]').first().text().trim();
            const link = $el.find('a').first().attr('href') || '';
            const author = $el.find('.author, [class*="author"], .byline').text().toLowerCase();
            
            const lowerBodyTitle = (title + ' ' + body).toLowerCase();
            const isMrMadhawk = author.includes('johan svensson') || author.includes('mrmadhawk') || lowerBodyTitle.includes('mrmadhawk') || lowerBodyTitle.includes('johan svensson');
            
            if (title && isBjorklovenRelevant(title + ' ' + body) && isMrMadhawk) {
                articles.push({
                    title,
                    body: body.slice(0, 200),
                    source: 'expressen.se (MrMadhawk)',
                    url: link.startsWith('http') ? link : `https://www.expressen.se${link}`,
                    date: new Date().toISOString().split('T')[0],
                    tag: classifyArticle(title + ' ' + body),
                    priority: 'high',
                });
            }
        });

        console.log(`[Scraper] expressen.se (MrMadhawk): ${articles.length} artiklar hittade`);
    } catch (err) {
        console.error(`[Scraper] expressen.se fel:`, err.message);
    }
    return articles;
}

/**
 * Scrape Gröngult forum on SvenskaFans
 */
async function scrapeGrongult() {
    const articles = [];
    try {
        const url = 'https://www.svenskafans.com/hockeyzon/bjorkloven/forum';
        const html = await fetchUrl(url);
        const $ = cheerio.load(html);

        $('.forum-post, article, .post, [class*="post"]').each((i, el) => {
            const $el = $(el);
            const body = $el.find('.post-content, .text, p').first().text().trim() || $el.text().trim();
            const author = $el.find('.author, .username, strong').first().text().trim();
            const dateStr = $el.find('.date, time').first().text().trim() || new Date().toISOString();

            if (body && body.length > 20 && isBjorklovenRelevant(body) && isTransferRelated(body)) {
                const lower = body.toLowerCase();
                if (lower.includes('rykte') || lower.includes('hört att') || lower.includes('påstås') || lower.includes('signat')) {
                    const title = `Forumrykte från ${author || 'Anonym'}`;
                    articles.push({
                        title,
                        body: body.slice(0, 200) + (body.length > 200 ? '...' : ''),
                        source: 'svenskafans.com (Gröngult)',
                        url: url,
                        date: parseSwedishDate(dateStr),
                        tag: 'FORUM_RYKTE',
                        priority: 'normal',
                    });
                }
            }
        });

        console.log(`[Scraper] Gröngult: ${articles.length} rykten hittade`);
    } catch (err) {
        console.error(`[Scraper] Gröngult fel:`, err.message);
    }
    return articles;
}

// ===== CLASSIFICATION HELPERS =====

function isBjorklovenRelevant(text) {
    const lower = text.toLowerCase();
    return BJORKLOVEN_KEYWORDS.some(kw => lower.includes(kw));
}

function isTransferRelated(text) {
    const lower = text.toLowerCase();
    const allKeywords = Object.values(TRANSFER_KEYWORDS).flat();
    return allKeywords.some(kw => lower.includes(kw)) && isBjorklovenRelevant(lower);
}

function classifyArticle(text) {
    const lower = text.toLowerCase();
    // Check in priority order (most specific first)
    for (const [tag, keywords] of Object.entries(TRANSFER_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) {
            // Distinguish between confirmed and rumored
            if (tag === 'HETT_RYKTE' && (lower.includes('officiellt') || lower.includes('klar för') || lower.includes('bekräftat'))) {
                return lower.includes('lämnar') ? 'BEKRÄFTAD_FÖRLUST' : 'BEKRÄFTAT_NYFÖRVÄRV';
            }
            return tag;
        }
    }
    return 'HETT_RYKTE'; // Default
}

function classifyPriority(text) {
    const lower = text.toLowerCase();
    if (lower.includes('breaking') || lower.includes('officiellt') || lower.includes('bekräftat') || lower.includes('just nu')) {
        return 'breaking';
    }
    if (lower.includes('klar för') || lower.includes('skrivit på') || lower.includes('förlänger')) {
        return 'high';
    }
    return 'normal';
}

function parseSwedishDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Try ISO format first
    const isoMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[0];

    // Try "30 april 2026" format
    const months = {
        januari: '01', februari: '02', mars: '03', april: '04',
        maj: '05', juni: '06', juli: '07', augusti: '08',
        september: '09', oktober: '10', november: '11', december: '12',
    };
    const sweMatch = dateStr.toLowerCase().match(/(\d{1,2})\s+(januari|februari|mars|april|maj|juni|juli|augusti|september|oktober|november|december)\s+(\d{4})/);
    if (sweMatch) {
        const day = sweMatch[1].padStart(2, '0');
        const month = months[sweMatch[2]];
        const year = sweMatch[3];
        return `${year}-${month}-${day}`;
    }

    // Try "30/4" or "30/4-26" format
    const shortMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})(?:-(\d{2,4}))?/);
    if (shortMatch) {
        const day = shortMatch[1].padStart(2, '0');
        const month = shortMatch[2].padStart(2, '0');
        let year = shortMatch[3] || new Date().getFullYear().toString();
        if (year.length === 2) year = '20' + year;
        return `${year}-${month}-${day}`;
    }

    return new Date().toISOString().split('T')[0];
}

// ===== DEDUPLICATION =====

function deduplicateArticles(scraped, baseline) {
    const seen = new Set();

    // Add baseline titles to seen set (normalized)
    baseline.forEach(item => {
        seen.add(normalizeTitle(item.title));
    });

    // Filter scraped items
    return scraped.filter(item => {
        const normalized = normalizeTitle(item.title);
        if (seen.has(normalized)) return false;

        // Also check for very similar titles (>70% overlap)
        for (const existingTitle of seen) {
            if (titleSimilarity(normalized, existingTitle) > 0.7) return false;
        }

        seen.add(normalized);
        return true;
    });
}

function normalizeTitle(title) {
    return title.toLowerCase()
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

// ===== MAIN FETCH & MERGE =====

async function fetchAndMerge() {
    if (isFetching) {
        console.log('[Scraper] Hämtning pågår redan, hoppar över...');
        return cachedData;
    }

    isFetching = true;
    console.log(`[Scraper] Startar hämtning från alla källor... ${new Date().toLocaleTimeString('sv-SE')}`);

    try {
        // Fetch from all sources in parallel
        const [bjork, hockeysve, hockeynews, dagens, madhawk, grongult] = await Promise.allSettled([
            scrapeBjorklovenOfficial(),
            scrapeHockeysverige(),
            scrapeHockeynews(),
            scrapeDagenshockey(),
            scrapeMrMadhawk(),
            scrapeGrongult(),
        ]);

        const allScraped = [
            ...(bjork.status === 'fulfilled' ? bjork.value : []),
            ...(hockeysve.status === 'fulfilled' ? hockeysve.value : []),
            ...(hockeynews.status === 'fulfilled' ? hockeynews.value : []),
            ...(dagens.status === 'fulfilled' ? dagens.value : []),
            ...(madhawk.status === 'fulfilled' ? madhawk.value : []),
            ...(grongult.status === 'fulfilled' ? grongult.value : []),
        ];

        console.log(`[Scraper] Totalt ${allScraped.length} artiklar hämtade`);

        // Load baseline data
        let baseline;
        try {
            delete require.cache[require.resolve('./silly-season-data')];
            const mod = require('./silly-season-data');
            baseline = mod.SILLY_SEASON_BASELINE;
        } catch (e) {
            console.error('[Scraper] Kunde inte ladda baseline:', e.message);
            baseline = cachedData || {};
        }

        // Deduplicate against baseline
        const newArticles = deduplicateArticles(allScraped, baseline.news_feed || []);
        console.log(`[Scraper] ${newArticles.length} nya unika artiklar efter dedup`);

        // Create news feed items from scraped articles
        const scrapedNewsItems = newArticles.map((article, i) => ({
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

        // Merge: scraped news first (newest), then baseline
        const mergedNewsFeed = [
            ...scrapedNewsItems,
            ...(baseline.news_feed || []),
        ].sort((a, b) => {
            // Sort by date descending, then by time
            const dateComp = (b.date || '').localeCompare(a.date || '');
            if (dateComp !== 0) return dateComp;
            return (b.time || '').localeCompare(a.time || '');
        });

        // Build merged data
        cachedData = {
            ...baseline,
            news_feed: mergedNewsFeed,
            _meta: {
                lastRefresh: new Date().toISOString(),
                scrapedArticles: allScraped.length,
                newArticles: newArticles.length,
                sources: {
                    'bjorkloven.com': bjork.status === 'fulfilled' ? bjork.value.length : 'error',
                    'hockeysverige.se': hockeysve.status === 'fulfilled' ? hockeysve.value.length : 'error',
                    'hockeynews.se': hockeynews.status === 'fulfilled' ? hockeynews.value.length : 'error',
                    'dagenshockey.se': dagens.status === 'fulfilled' ? dagens.value.length : 'error',
                    'expressen.se': madhawk.status === 'fulfilled' ? madhawk.value.length : 'error',
                    'grongult': grongult.status === 'fulfilled' ? grongult.value.length : 'error',
                },
            },
        };

        lastFetchTime = new Date();

        // Save to cache file
        saveCacheToFile(cachedData);

        console.log(`[Scraper] ✅ Klar! ${mergedNewsFeed.length} nyheter totalt, senast uppdaterad ${lastFetchTime.toLocaleTimeString('sv-SE')}`);

    } catch (err) {
        console.error('[Scraper] Fel vid hämtning:', err.message);

        // If we have no cached data, try loading from file
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

/**
 * Get current silly season data (cached or freshly fetched)
 */
async function getSillySeasonData() {
    if (cachedData) return cachedData;

    // Try loading from file cache first
    cachedData = loadCacheFromFile();
    if (cachedData) return cachedData;

    // Fallback: fetch fresh
    return fetchAndMerge();
}

/**
 * Force a refresh of all data
 */
async function refreshSillySeasonData() {
    return fetchAndMerge();
}

/**
 * Start the auto-refresh timer
 */
function startAutoRefresh() {
    // Initial fetch
    fetchAndMerge().catch(err => console.error('[Scraper] Initial fetch failed:', err.message));

    // Set up interval
    refreshTimer = setInterval(() => {
        fetchAndMerge().catch(err => console.error('[Scraper] Auto-refresh failed:', err.message));
    }, REFRESH_INTERVAL_MS);

    console.log(`[Scraper] Auto-refresh aktiverad, intervall: ${REFRESH_INTERVAL_MS / 60000} minuter`);
}

/**
 * Stop the auto-refresh timer
 */
function stopAutoRefresh() {
    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
        console.log('[Scraper] Auto-refresh stoppad');
    }
}

/**
 * Get scraper status
 */
function getScraperStatus() {
    return {
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
