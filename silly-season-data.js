// ============================================================
// SILLY SEASON DATA — BJÖRKLÖVEN SHL 2026/2027
// ============================================================
// Baseline-data + automatiskt uppdaterad via scraper
// Senast manuellt verifierad: 2026-05-01
// ============================================================

/**
 * @typedef {'SIGNERAD'|'UTGÅENDE'|'FÖRLÄNGD'|'LÄMNAR'|'NYFÖRVÄRV'|'LÅN_SLUT'} ContractStatus
 * @typedef {'GK'|'LD'|'RD'|'CE'|'LW'|'RW'} Position
 * @typedef {'BEKRÄFTAT_NYFÖRVÄRV'|'BEKRÄFTAD_FÖRLUST'|'HETT_RYKTE'|'KONTRAKTSFÖRLÄNGNING'} NewsTag
 */

const SILLY_SEASON_BASELINE = {
    season: '2026/2027',
    league: 'SHL',
    headline: '9 spelare lämnar — SHL-lagbygget accelererar!',
    last_manual_update: '2026-05-01T00:00:00Z',

    // ===== BEKRÄFTADE KONTRAKTSFÖRLÄNGNINGAR =====
    confirmed_extensions: [
        { name: 'Axel Ottosson', number: 18, pos: 'CE', contractUntil: '2028', years: 2, date: '2026-04-25', source: 'bjorkloven.com', note: 'Lagkapten, nytt tvåårskontrakt' },
        { name: 'Oscar Tellström', number: 91, pos: 'LW', contractUntil: '2028', years: 2, date: '2025-12-20', source: 'bjorkloven.com', note: 'Förlängde i december 2025' },
        { name: 'Anton Malmström', number: 64, pos: 'LD', contractUntil: '2028', years: 2, date: '2025-12-20', source: 'bjorkloven.com', note: 'Förlängde i december 2025' },
        { name: 'Gustaf Kangas', number: 17, pos: 'CE', contractUntil: '2028', years: 2, date: '2026-01-30', source: 'bjorkloven.com', note: 'Förlängde i januari 2026' },
        { name: 'Lenni Killinen', number: 37, pos: 'LW', contractUntil: '2027', years: 1, date: '2026-01-14', source: 'hockeysverige.se', note: 'Förlängde i januari 2026' },
    ],

    // ===== BEKRÄFTADE NYFÖRVÄRV =====
    confirmed_signings: [
        { name: 'Lucas Wallmark', number: null, pos: 'CE', from: 'HC Fribourg-Gottéron', contractUntil: '2032', years: 6, date: '2026-04-26', source: 'hockeysverige.se', note: 'Moderklubbens stora värvning, 6-årskontrakt', rumor_pct: 100, age: 31 },
    ],

    // ===== BEKRÄFTADE FÖRLUSTER (9 spelare, 29 april 2026) =====
    confirmed_departures: [
        { name: 'Olle Eriksson Ek', number: 31, pos: 'GK', to: 'Jokerit (KHL)', date: '2026-04-29', source: 'bjorkloven.com', note: 'Bekräftad flytt till KHL' },
        { name: 'Melwin Asp-Cassåsen', number: null, pos: 'GK', to: 'Okänt', date: '2026-04-29', source: 'bjorkloven.com', note: 'Andramålvakt, lämnar inför SHL' },
        { name: 'Olli Vainio', number: 6, pos: 'RD', to: 'AIK', date: '2026-04-29', source: 'bjorkloven.com', note: 'Bekräftad till AIK' },
        { name: 'Lucas Nordsäter', number: 8, pos: 'RD', to: 'Okänt', date: '2026-04-29', source: 'bjorkloven.com', note: 'Följer inte med till SHL' },
        { name: 'Mathew Maione', number: 28, pos: 'LD', to: 'Okänt', date: '2026-04-29', source: 'bjorkloven.com', note: 'Följer inte med till SHL' },
        { name: 'Tim Theocharidis', number: null, pos: 'RD', to: 'Okänt', date: '2026-04-29', source: 'bjorkloven.com', note: 'Följer inte med till SHL' },
        { name: 'Liam Dower-Nilsson', number: 19, pos: 'RW', to: 'Frölunda HC', date: '2026-04-30', source: 'frolundahockey.com', note: 'Officiellt klar, 2-årskontrakt' },
        { name: 'Oliwer Sjöström', number: 26, pos: 'LD', to: 'Luleå HF', date: '2026-04-29', source: 'bjorkloven.com', note: 'Återvänder till moderklubben (lån slut)' },
        { name: 'Jakob Ihs-Wozniak', number: 89, pos: 'LW', to: 'Luleå HF', date: '2026-04-29', source: 'bjorkloven.com', note: 'Återvänder till moderklubben (lån slut)' },
    ],

    // ===== SPELARE MED UTGÅENDE KONTRAKT =====
    expiring_contracts: [
        { name: 'Daniel Brodin', number: 34, pos: 'RW', status: 'UTGÅENDE', rumor_to: null, rumor_pct: 0, source: 'hockeynews.se' },
        { name: 'Joel Mustonen', number: 39, pos: 'CE', status: 'UTGÅENDE', rumor_to: null, rumor_pct: 0, source: 'hockeynews.se' },
        { name: 'Jacob Olofsson', number: 32, pos: 'CE', status: 'UTGÅENDE', rumor_to: null, rumor_pct: 0, source: 'hockeynews.se' },
    ],

    // ===== HETA RYKTEN (INKOMMANDE) =====
    hot_rumors_in: [
        { name: 'Lucas Wallmark', pos: 'CE', from: 'HC Fribourg-Gottéron', rumor_pct: 100, source: 'hockeysverige.se', credibility: 'Bekräftat', note: 'Signerat 6-årskontrakt', tag: 'BEKRÄFTAT_NYFÖRVÄRV' },
    ],

    // ===== HETA RYKTEN (UTGÅENDE — alla nu bekräftade) =====
    hot_rumors_out: [
        { name: 'Liam Dower-Nilsson', pos: 'RW', to: 'Frölunda HC', rumor_pct: 100, source: 'frolundahockey.com', credibility: 'Bekräftat', note: 'Officiellt klar, 2-årskontrakt' },
        { name: 'Olle Eriksson Ek', pos: 'GK', to: 'Jokerit (KHL)', rumor_pct: 100, source: 'bjorkloven.com', credibility: 'Bekräftat', note: 'Lämnar för KHL' },
        { name: 'Olli Vainio', pos: 'RD', to: 'AIK', rumor_pct: 100, source: 'bjorkloven.com', credibility: 'Bekräftat', note: 'Klar för AIK' },
        { name: 'Oliwer Sjöström', pos: 'LD', to: 'Luleå HF', rumor_pct: 100, source: 'bjorkloven.com', credibility: 'Bekräftat', note: 'Återvänder till moderklubben' },
        { name: 'Jakob Ihs-Wozniak', pos: 'LW', to: 'Luleå HF', rumor_pct: 100, source: 'bjorkloven.com', credibility: 'Bekräftat', note: 'Lånet löper ut, återvänder' },
    ],

    // ===== FULLSTÄNDIG TRUPP MED STATUS =====
    roster: [
        // Målvakter
        { name: 'Frans Tuohimaa', number: 50, pos: 'GK', status: 'SIGNERAD', contractUntil: '2027', note: 'Förstamålvakt' },

        // Backar
        { name: 'Linus Cronholm', number: 24, pos: 'LD', status: 'SIGNERAD', contractUntil: '2027', note: '' },
        { name: 'Marcus Björk', number: 47, pos: 'RD', status: 'SIGNERAD', contractUntil: '2027', note: '' },
        { name: 'Anton Malmström', number: 64, pos: 'LD', status: 'FÖRLÄNGD', contractUntil: '2028', note: 'Förlängde dec 2025' },

        // Forwards
        { name: 'Axel Ottosson', number: 18, pos: 'CE', status: 'FÖRLÄNGD', contractUntil: '2028', note: 'Kapten, tvåårskontrakt' },
        { name: 'Marcus Nilsson', number: 10, pos: 'LW', status: 'SIGNERAD', contractUntil: '2027', note: '' },
        { name: 'Gustav Possler', number: 71, pos: 'RW', status: 'SIGNERAD', contractUntil: '2027', note: '' },
        { name: 'Albin Lundin', number: 33, pos: 'CE', status: 'SIGNERAD', contractUntil: '2027', note: '' },
        { name: 'Fredrik Forsberg', number: 56, pos: 'RW', status: 'SIGNERAD', contractUntil: '2027', note: '' },
        { name: 'Oscar Tellström', number: 91, pos: 'LW', status: 'FÖRLÄNGD', contractUntil: '2028', note: 'Förlängde dec 2025' },
        { name: 'Lenni Killinen', number: 37, pos: 'LW', status: 'FÖRLÄNGD', contractUntil: '2027', note: 'Förlängde jan 2026' },
        { name: 'Gustaf Kangas', number: 17, pos: 'CE', status: 'FÖRLÄNGD', contractUntil: '2028', note: 'Förlängde jan 2026' },
        { name: 'Daniel Brodin', number: 34, pos: 'RW', status: 'UTGÅENDE', contractUntil: '2026', note: '' },
        { name: 'Joel Mustonen', number: 39, pos: 'CE', status: 'UTGÅENDE', contractUntil: '2026', note: '' },
        { name: 'Jacob Olofsson', number: 32, pos: 'CE', status: 'UTGÅENDE', contractUntil: '2026', note: '' },

        // Nyförvärv
        { name: 'Lucas Wallmark', number: null, pos: 'CE', status: 'NYFÖRVÄRV', contractUntil: '2032', note: '6-årskontrakt, moderklubb' },
    ],

    // ===== NYHETSFLÖDE =====
    news_feed: [
        { id: 'base-1', date: '2026-04-30', time: '16:00', tag: 'BEKRÄFTAD_FÖRLUST', title: 'OFFICIELLT: Dower-Nilsson klar för Frölunda', body: 'Liam Dower-Nilsson har skrivit på ett tvåårskontrakt med Frölunda HC. Han lämnar Björklöven efter en stark slutspelssäsong.', source: 'frolundahockey.com', priority: 'breaking' },
        { id: 'base-2', date: '2026-04-29', time: '18:00', tag: 'BEKRÄFTAD_FÖRLUST', title: 'Nio spelare lämnar Björklöven', body: 'Björklöven tackar av nio spelare som inte följer med upp till SHL: Eriksson Ek, Asp-Cassåsen, Vainio, Nordsäter, Maione, Theocharidis, Dower-Nilsson, Sjöström och Ihs-Wozniak.', source: 'bjorkloven.com', priority: 'breaking' },
        { id: 'base-3', date: '2026-04-29', time: '17:30', tag: 'BEKRÄFTAD_FÖRLUST', title: 'Vainio bekräftad till AIK', body: 'Olli Vainio lämnar Björklöven och ansluter till AIK. Den finländske backen hade utgående kontrakt.', source: 'bjorkloven.com', priority: 'high' },
        { id: 'base-4', date: '2026-04-29', time: '17:00', tag: 'BEKRÄFTAD_FÖRLUST', title: 'Eriksson Ek till Jokerit — bekräftat', body: 'Målvakten Olle Eriksson Ek lämnar för Jokerit i KHL. Björklöven behöver nu hitta en ny andremålvakt till SHL.', source: 'bjorkloven.com', priority: 'high' },
        { id: 'base-5', date: '2026-04-27', time: '14:30', tag: 'BEKRÄFTAT_NYFÖRVÄRV', title: 'OFFICIELLT: Lucas Wallmark klar för Löven!', body: 'Den 31-årige centern har skrivit på ett 6-årskontrakt med sin moderklubb. Wallmark återvänder från HC Fribourg-Gottéron i Schweiz.', source: 'bjorkloven.com', priority: 'breaking' },
        { id: 'base-6', date: '2026-04-25', time: '10:00', tag: 'KONTRAKTSFÖRLÄNGNING', title: 'Kapten Ottosson förlänger — 2 år till', body: 'Axel Ottosson har skrivit på ett nytt tvåårskontrakt med Björklöven. Lagkaptenen följer med klubben upp i SHL.', source: 'bjorkloven.com', priority: 'high' },
        { id: 'base-7', date: '2026-04-22', time: '16:45', tag: 'BEKRÄFTAD_FÖRLUST', title: 'Theocharidis lämnar Löven', body: 'Backen Tim Theocharidis lämnar klubben efter två säsonger och följer inte med upp till SHL.', source: 'dagenshockey.se', priority: 'normal' },
        { id: 'base-8', date: '2026-04-18', time: '14:00', tag: 'BEKRÄFTAD_FÖRLUST', title: 'Sjöström och Ihs-Wozniak tillbaka till Luleå', body: 'De utlånade spelarna Oliwer Sjöström och Jakob Ihs-Wozniak återvänder till Luleå HF efter slutspelet.', source: 'hockeynews.se', priority: 'normal' },
        { id: 'base-9', date: '2026-01-30', time: '12:00', tag: 'KONTRAKTSFÖRLÄNGNING', title: 'Gustaf Kangas förlänger till 2028', body: 'Centern Gustaf Kangas har skrivit på ett nytt avtal med Björklöven som sträcker sig till 2028.', source: 'bjorkloven.com', priority: 'normal' },
        { id: 'base-10', date: '2026-01-14', time: '10:00', tag: 'KONTRAKTSFÖRLÄNGNING', title: 'Killinen stannar i Löven', body: 'Lenni Killinen har förlängt sitt kontrakt med Björklöven och stannar kvar till 2027.', source: 'hockeysverige.se', priority: 'normal' },
        { id: 'base-11', date: '2025-12-20', time: '12:00', tag: 'KONTRAKTSFÖRLÄNGNING', title: 'Tellström & Malmström förlänger', body: 'Oscar Tellström och Anton Malmström har båda förlängt sina kontrakt till 2028. Två viktiga pusselbitar för SHL-satsningen.', source: 'bjorkloven.com', priority: 'normal' },
    ],

    // ===== TRUPPBYGGE 2026/2027 — POSITIONER =====
    rink_positions: {
        goalies: [
            { slot: 'GK1', player: 'Frans Tuohimaa', number: 50, status: 'SIGNERAD' },
            { slot: 'GK2', player: null, status: 'VAKANT', rumors: ['Ny SHL-målvakt sökes', 'Eriksson Ek lämnade för KHL'] },
        ],
        defense_pairs: [
            { ld: { player: 'Linus Cronholm', number: 24, status: 'SIGNERAD' }, rd: { player: 'Marcus Björk', number: 47, status: 'SIGNERAD' } },
            { ld: { player: 'Anton Malmström', number: 64, status: 'FÖRLÄNGD' }, rd: { player: null, status: 'VAKANT', rumors: ['SHL-förstärkning sökes'] } },
            { ld: { player: null, status: 'VAKANT', rumors: ['Maione & Sjöström har lämnat', 'Nyförvärv'] }, rd: { player: null, status: 'VAKANT', rumors: ['Vainio→AIK, Nordsäter lämnar', 'Nyförvärv'] } },
        ],
        forward_lines: [
            { lw: { player: 'Marcus Nilsson', number: 10, status: 'SIGNERAD' }, ce: { player: 'Axel Ottosson', number: 18, status: 'FÖRLÄNGD' }, rw: { player: 'Gustav Possler', number: 71, status: 'SIGNERAD' } },
            { lw: { player: null, status: 'VAKANT', rumors: ['SHL-förstärkning', 'Ihs-Wozniak tillbaka till Luleå'] }, ce: { player: 'Lucas Wallmark', number: null, status: 'NYFÖRVÄRV' }, rw: { player: 'Fredrik Forsberg', number: 56, status: 'SIGNERAD' } },
            { lw: { player: 'Oscar Tellström', number: 91, status: 'FÖRLÄNGD' }, ce: { player: 'Gustaf Kangas', number: 17, status: 'FÖRLÄNGD' }, rw: { player: null, status: 'VAKANT', rumors: ['Dower-Nilsson→Frölunda', 'Nyförvärv'] } },
            { lw: { player: 'Lenni Killinen', number: 37, status: 'FÖRLÄNGD' }, ce: { player: null, status: 'VAKANT', rumors: ['Joel Mustonen (osäker)', 'Nyförvärv'] }, rw: { player: null, status: 'VAKANT', rumors: ['Daniel Brodin (osäker)', 'Nyförvärv'] } },
        ],
    },
};

// ===== VOTE MANAGER (localStorage) =====
const VoteManager = {
    _key: 'bjork_silly_votes',
    _getAll() {
        try { return JSON.parse(localStorage.getItem(this._key) || '{}'); }
        catch { return {}; }
    },
    vote(playerName, choice) {
        const all = this._getAll();
        if (!all[playerName]) all[playerName] = { extend: 0, release: 0, voted: false };
        if (all[playerName].voted) return all[playerName];
        all[playerName][choice]++;
        all[playerName].voted = true;
        localStorage.setItem(this._key, JSON.stringify(all));
        return all[playerName];
    },
    getVotes(playerName) {
        const all = this._getAll();
        // Seed with realistic starting votes if no data
        if (!all[playerName]) {
            const seeds = {
                'Daniel Brodin': { extend: 65, release: 35, voted: false },
                'Joel Mustonen': { extend: 58, release: 42, voted: false },
                'Jacob Olofsson': { extend: 44, release: 56, voted: false },
            };
            return seeds[playerName] || { extend: 50, release: 50, voted: false };
        }
        return all[playerName];
    },
    hasVoted(playerName) {
        const all = this._getAll();
        return all[playerName]?.voted || false;
    }
};

// Export for Node.js (server-side scraper)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SILLY_SEASON_BASELINE };
}
