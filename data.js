// ============================================================
// LÖVEN STATS HUB — MATCHDATA
// ============================================================
// För att lägga till en ny match:
//   1. Kopiera strukturen för en befintlig match nedan
//   2. Uppdatera datum, result, goalies och skaters
//   3. Spara filen och ladda om sidan
// ============================================================

const SERIES_INFO = {
    season: '2025/2026',
    round: 'Final',
    bestOf: 7,
    teamHome: 'IF Björklöven',
    teamHomeShort: 'IFB',
    teamAway: 'BIK Karlskoga',
    teamAwayShort: 'BIK',
};

// Hjälpfunktion — konvertera "MM:SS" till sekunder
function toiToSeconds(toi) {
    if (!toi) return 0;
    const parts = String(toi).split(':');
    return (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
}

const MATCHES = [
    // ===================== MATCH 1 =====================
    {
        id: 'match1',
        matchNumber: 1,
        date: '2026-04-15',
        arena: 'A3 Arena',
        result: { home: 4, away: 2 },
        home: {
            goalies: [
                { name: 'Frans Tuohimaa', number: 50, pos: 'GK', line: 1, ga: 2, soga: 25, spga: 12, svs: 23, svsPct: 92.0 },
                { name: 'Olle Eriksson Ek', number: 31, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Marcus Nilsson', number: 10, pos: 'LW', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 2, sog: 0, ppsog: 0, plusMinus: -1, toi: '14:21', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Axel Ottosson', number: 18, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 2, sog: 0, ppsog: 0, plusMinus: -1, toi: '14:36', hits: 1, fow: 6, fol: 4, foPct: 60 },
                { name: 'Linus Cronholm', number: 24, pos: 'LD', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 2, toi: '20:47', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Marcus Björk', number: 47, pos: 'RD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '17:50', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustav Possler', number: 71, pos: 'RW', line: 1, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 3, ppsog: 0, plusMinus: 0, toi: '20:03', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Olli Vainio', number: 6, pos: 'RD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '20:41', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Kangas', number: 16, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 5, ppsog: 0, plusMinus: 0, toi: '12:25', hits: 1, fow: 0, fol: 1, foPct: 0 },
                { name: 'Mathew Maione', number: 28, pos: 'LD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '18:15', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Albin Lundin', number: 33, pos: 'CE', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 2, sog: 2, ppsog: 0, plusMinus: 1, toi: '20:14', hits: 0, fow: 9, fol: 11, foPct: 45 },
                { name: 'Fredrik Forsberg', number: 56, pos: 'RW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 0, toi: '13:32', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Lucas Nordsäter', number: 8, pos: 'RD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 4, sog: 1, ppsog: 0, plusMinus: 1, toi: '16:28', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Liam Dower Nilsson', number: 19, pos: 'RW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '13:03', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jacob Olofsson', number: 32, pos: 'CE', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 2, toi: '12:34', hits: 0, fow: 5, fol: 6, foPct: 45 },
                { name: 'Anton Malmström', number: 64, pos: 'LD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 2, sog: 2, ppsog: 0, plusMinus: 1, toi: '14:59', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oscar Tellström', number: 91, pos: 'LW', line: 3, goals: 2, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 2, toi: '16:16', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliwer Sjöström', number: 26, pos: 'LD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '06:08', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Daniel Brodin', number: 34, pos: 'RW', line: 4, goals: 1, assists: 0, ppg: 1, shotsWide: 0, pim: 0, sog: 2, ppsog: 1, plusMinus: 0, toi: '13:14', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Lenni Killinen', number: 37, pos: 'LW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 1, ppsog: 0, plusMinus: 0, toi: '10:15', hits: 3, fow: 0, fol: 0, foPct: 0 },
                { name: 'Joel Mustonen', number: 39, pos: 'CE', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '13:02', hits: 0, fow: 4, fol: 6, foPct: 40 },
                { name: 'Jakob Ihs-Wozniak', number: 89, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '00:00', hits: 0, fow: 0, fol: 0, foPct: 0 },
            ],
        },
        away: {
            goalies: [
                { name: 'Olof Lindbom', number: 1, pos: 'GK', line: 1, ga: 3, soga: 24, spga: 13, svs: 21, svsPct: 87.5 },
                { name: 'Lars Volden', number: 35, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Henrik Björklund', number: 14, pos: 'RW', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 1, plusMinus: -2, toi: '22:38', hits: 0, fow: 3, fol: 1, foPct: 75 },
                { name: 'Åke Stakkestad', number: 17, pos: 'LW', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: -2, toi: '21:22', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliver Eklind', number: 73, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 1, ppsog: 1, plusMinus: 0, toi: '21:33', hits: 0, fow: 4, fol: 7, foPct: 36 },
                { name: 'Rikard Olsén', number: 90, pos: 'LD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '17:15', hits: 4, fow: 0, fol: 0, foPct: 0 },
                { name: 'Tim Barkemo', number: 91, pos: 'RD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '21:16', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jonatan Lundgren', number: 5, pos: 'RD', line: 2, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 3, ppsog: 0, plusMinus: 1, toi: '17:38', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Hampus Plato', number: 13, pos: 'RW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 4, ppsog: 3, plusMinus: -1, toi: '17:47', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Viktor Lang', number: 22, pos: 'LD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 0, ppsog: 0, plusMinus: 0, toi: '14:49', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Kalle Jellvert', number: 40, pos: 'CE', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 2, sog: 0, ppsog: 0, plusMinus: -2, toi: '19:22', hits: 1, fow: 14, fol: 5, foPct: 73 },
                { name: 'Adam Rockwood', number: 71, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '17:21', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Sander Vold Engebråten', number: 7, pos: 'RD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '15:16', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Eero Teräväinen', number: 9, pos: 'LD', line: 3, goals: 0, assists: 2, ppg: 0, shotsWide: 1, pim: 0, sog: 3, ppsog: 2, plusMinus: -2, toi: '21:30', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Alexander Ljungkrantz', number: 10, pos: 'RW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '07:18', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Thorell', number: 12, pos: 'CE', line: 3, goals: 1, assists: 0, ppg: 1, shotsWide: 1, pim: 0, sog: 3, ppsog: 3, plusMinus: -1, toi: '15:14', hits: 0, fow: 1, fol: 3, foPct: 25 },
                { name: 'Jonatan Harju', number: 44, pos: 'LW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '08:58', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Alexander Leandersson', number: 4, pos: 'RD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '00:52', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Franzén', number: 15, pos: 'CE', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '16:08', hits: 1, fow: 6, fol: 6, foPct: 50 },
                { name: 'Simen Andre Edvardsen', number: 19, pos: 'LW', line: 4, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 1, toi: '13:07', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Tobias Sjökvist', number: 27, pos: 'RW', line: 0, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '00:00', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Leevi Viitala', number: 78, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 2, sog: 3, ppsog: 0, plusMinus: 1, toi: '08:02', hits: 1, fow: 0, fol: 0, foPct: 0 },
            ],
        },
    },

    // ===================== MATCH 2 =====================
    {
        id: 'match2',
        matchNumber: 2,
        date: '2026-04-17',
        arena: 'A3 Arena',
        result: { home: 4, away: 2 },
        home: {
            goalies: [
                { name: 'Frans Tuohimaa', number: 50, pos: 'GK', line: 1, ga: 2, soga: 23, spga: 15, svs: 21, svsPct: 91.3 },
                { name: 'Olle Eriksson Ek', number: 31, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Marcus Nilsson', number: 10, pos: 'LW', line: 1, goals: 1, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 3, ppsog: 0, plusMinus: 1, toi: '12:57', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Axel Ottosson', number: 18, pos: 'CE', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '16:24', hits: 1, fow: 6, fol: 7, foPct: 46 },
                { name: 'Linus Cronholm', number: 24, pos: 'LD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 2, toi: '17:45', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Marcus Björk', number: 47, pos: 'RD', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 2, toi: '18:36', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustav Possler', number: 71, pos: 'RW', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 1, plusMinus: 1, toi: '20:17', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Olli Vainio', number: 6, pos: 'RD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 1, toi: '22:34', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Kangas', number: 16, pos: 'LW', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 1, toi: '15:38', hits: 1, fow: 0, fol: 1, foPct: 0 },
                { name: 'Mathew Maione', number: 28, pos: 'LD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 1, plusMinus: 1, toi: '17:45', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Albin Lundin', number: 33, pos: 'CE', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 2, sog: 2, ppsog: 0, plusMinus: 1, toi: '20:44', hits: 0, fow: 7, fol: 7, foPct: 50 },
                { name: 'Fredrik Forsberg', number: 56, pos: 'RW', line: 2, goals: 1, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 2, ppsog: 0, plusMinus: 1, toi: '13:42', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Lucas Nordsäter', number: 8, pos: 'RD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '14:51', hits: 4, fow: 0, fol: 0, foPct: 0 },
                { name: 'Liam Dower Nilsson', number: 19, pos: 'RW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 2, sog: 5, ppsog: 3, plusMinus: 0, toi: '15:24', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jacob Olofsson', number: 32, pos: 'CE', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 0, toi: '13:29', hits: 2, fow: 3, fol: 5, foPct: 37 },
                { name: 'Anton Malmström', number: 64, pos: 'LD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '13:10', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oscar Tellström', number: 91, pos: 'LW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '18:15', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliwer Sjöström', number: 26, pos: 'LD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '08:08', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Daniel Brodin', number: 34, pos: 'RW', line: 4, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 1, toi: '13:13', hits: 1, fow: 1, fol: 1, foPct: 50 },
                { name: 'Lenni Killinen', number: 37, pos: 'LW', line: 4, goals: 2, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 3, ppsog: 0, plusMinus: 1, toi: '10:37', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Joel Mustonen', number: 39, pos: 'CE', line: 4, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 2, sog: 1, ppsog: 0, plusMinus: 1, toi: '10:42', hits: 0, fow: 8, fol: 6, foPct: 57 },
                { name: 'Jakob Ihs-Wozniak', number: 89, pos: 'RW', line: 0, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '00:00', hits: 0, fow: 0, fol: 0, foPct: 0 },
            ],
        },
        away: {
            goalies: [
                { name: 'Lars Volden', number: 35, pos: 'GK', line: 1, ga: 3, soga: 26, spga: 7, svs: 23, svsPct: 88.5 },
                { name: 'Olof Lindbom', number: 1, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Henrik Björklund', number: 14, pos: 'RW', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '17:47', hits: 2, fow: 3, fol: 3, foPct: 50 },
                { name: 'Åke Stakkestad', number: 17, pos: 'LW', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 1, plusMinus: -1, toi: '17:56', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliver Eklind', number: 73, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: -4, toi: '20:50', hits: 1, fow: 7, fol: 7, foPct: 50 },
                { name: 'Rikard Olsén', number: 90, pos: 'RD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '07:26', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Tim Barkemo', number: 91, pos: 'LD', line: 1, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 2, ppsog: 0, plusMinus: 0, toi: '24:30', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jonatan Lundgren', number: 5, pos: 'RD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 0, ppsog: 0, plusMinus: -2, toi: '22:18', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Hampus Plato', number: 13, pos: 'RW', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 3, pim: 0, sog: 3, ppsog: 1, plusMinus: -1, toi: '17:14', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Viktor Lang', number: 22, pos: 'LD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '17:10', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Kalle Jellvert', number: 40, pos: 'CE', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 2, sog: 2, ppsog: 0, plusMinus: -1, toi: '19:22', hits: 2, fow: 9, fol: 6, foPct: 60 },
                { name: 'Adam Rockwood', number: 71, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '16:29', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Sander Vold Engebråten', number: 7, pos: 'LD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '15:24', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Eero Teräväinen', number: 9, pos: 'RD', line: 3, goals: 1, assists: 0, ppg: 1, shotsWide: 0, pim: 2, sog: 1, ppsog: 1, plusMinus: -2, toi: '17:32', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Alexander Ljungkrantz', number: 10, pos: 'RW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 4, ppsog: 0, plusMinus: 0, toi: '12:04', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Thorell', number: 12, pos: 'CE', line: 3, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 5, ppsog: 2, plusMinus: 0, toi: '15:49', hits: 0, fow: 3, fol: 4, foPct: 42 },
                { name: 'Jonatan Harju', number: 44, pos: 'LW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '12:03', hits: 3, fow: 0, fol: 0, foPct: 0 },
                { name: 'Alexander Leandersson', number: 4, pos: 'RD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '07:57', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Franzén', number: 15, pos: 'CE', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 2, sog: 0, ppsog: 0, plusMinus: 0, toi: '12:47', hits: 0, fow: 4, fol: 3, foPct: 57 },
                { name: 'Simen Andre Edvardsen', number: 19, pos: 'LW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -2, toi: '09:58', hits: 0, fow: 1, fol: 1, foPct: 50 },
                { name: 'Tobias Sjökvist', number: 27, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '03:58', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Leevi Viitala', number: 78, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '05:14', hits: 0, fow: 0, fol: 0, foPct: 0 },
            ],
        },
    },

    // ===================== MATCH 3 =====================
    {
        id: 'match3',
        matchNumber: 3,
        date: '2026-04-19',
        arena: 'Nobelhallen',
        result: { home: 5, away: 4 },
        home: {
            goalies: [
                { name: 'Frans Tuohimaa', number: 50, pos: 'GK', line: 1, ga: 4, soga: 16, spga: 9, svs: 12, svsPct: 75.0 },
                { name: 'Olle Eriksson Ek', number: 31, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Marcus Nilsson', number: 10, pos: 'LW', line: 1, goals: 0, assists: 2, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '14:57', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Axel Ottosson', number: 18, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '14:55', hits: 0, fow: 6, fol: 8, foPct: 42 },
                { name: 'Linus Cronholm', number: 24, pos: 'LD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '18:03', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Marcus Björk', number: 47, pos: 'RD', line: 1, goals: 1, assists: 0, ppg: 1, shotsWide: 0, pim: 0, sog: 5, ppsog: 3, plusMinus: -2, toi: '21:01', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustav Possler', number: 71, pos: 'RW', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '17:32', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Olli Vainio', number: 6, pos: 'RD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '18:05', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Mathew Maione', number: 28, pos: 'LD', line: 2, goals: 0, assists: 2, ppg: 0, shotsWide: 0, pim: 4, sog: 1, ppsog: 1, plusMinus: 0, toi: '17:50', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Albin Lundin', number: 33, pos: 'CE', line: 2, goals: 1, assists: 1, ppg: 1, shotsWide: 0, pim: 0, sog: 2, ppsog: 1, plusMinus: 0, toi: '19:58', hits: 1, fow: 12, fol: 8, foPct: 60 },
                { name: 'Fredrik Forsberg', number: 56, pos: 'RW', line: 2, goals: 1, assists: 2, ppg: 0, shotsWide: 3, pim: 0, sog: 3, ppsog: 0, plusMinus: 0, toi: '16:06', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jakob Ihs-Wozniak', number: 89, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '11:40', hits: 0, fow: 1, fol: 1, foPct: 50 },
                { name: 'Lucas Nordsäter', number: 8, pos: 'RD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 4, sog: 0, ppsog: 0, plusMinus: 0, toi: '15:46', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Liam Dower Nilsson', number: 19, pos: 'RW', line: 3, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 0, toi: '15:02', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Jacob Olofsson', number: 32, pos: 'CE', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '14:07', hits: 0, fow: 4, fol: 9, foPct: 30 },
                { name: 'Anton Malmström', number: 64, pos: 'LD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '14:33', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oscar Tellström', number: 91, pos: 'LW', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '16:53', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Bruno Osmanis', number: 21, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '00:00', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliwer Sjöström', number: 26, pos: 'LD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '10:08', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Daniel Brodin', number: 34, pos: 'RW', line: 4, goals: 0, assists: 2, ppg: 0, shotsWide: 1, pim: 0, sog: 2, ppsog: 0, plusMinus: 0, toi: '14:17', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Lenni Killinen', number: 37, pos: 'LW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '10:14', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Joel Mustonen', number: 39, pos: 'CE', line: 4, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 0, toi: '12:53', hits: 0, fow: 3, fol: 10, foPct: 23 },
            ],
        },
        away: {
            goalies: [
                { name: 'Lars Volden', number: 35, pos: 'GK', line: 1, ga: 5, soga: 25, spga: 8, svs: 20, svsPct: 80.0 },
                { name: 'Olof Lindbom', number: 1, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Alexander Leandersson', number: 4, pos: 'LD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '09:45', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Henrik Björklund', number: 14, pos: 'RW', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 2, ppsog: 0, plusMinus: -1, toi: '23:07', hits: 0, fow: 3, fol: 4, foPct: 42 },
                { name: 'Åke Stakkestad', number: 17, pos: 'LW', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 1, plusMinus: -1, toi: '20:25', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliver Eklind', number: 73, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 3, ppsog: 0, plusMinus: -1, toi: '20:52', hits: 0, fow: 8, fol: 7, foPct: 53 },
                { name: 'Tim Barkemo', number: 91, pos: 'RD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 0, ppsog: 0, plusMinus: 1, toi: '21:56', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jonatan Lundgren', number: 5, pos: 'RD', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: -1, toi: '19:35', hits: 2, fow: 0, fol: 0, foPct: 0 },
                { name: 'Eero Teräväinen', number: 9, pos: 'LD', line: 2, goals: 1, assists: 1, ppg: 0, shotsWide: 2, pim: 0, sog: 1, ppsog: 0, plusMinus: 3, toi: '19:57', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Hampus Plato', number: 13, pos: 'RW', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '16:22', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Kalle Jellvert', number: 40, pos: 'CE', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 1, toi: '17:24', hits: 0, fow: 7, fol: 6, foPct: 53 },
                { name: 'Adam Rockwood', number: 71, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '15:05', hits: 0, fow: 1, fol: 0, foPct: 100 },
                { name: 'Sander Vold Engebråten', number: 7, pos: 'LD', line: 3, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '09:49', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Alexander Ljungkrantz', number: 10, pos: 'RW', line: 3, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '09:08', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Thorell', number: 12, pos: 'CE', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '15:51', hits: 1, fow: 11, fol: 4, foPct: 73 },
                { name: 'Viktor Lang', number: 22, pos: 'RD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '15:38', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jonatan Harju', number: 44, pos: 'LW', line: 3, goals: 1, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 2, toi: '09:36', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Franzén', number: 15, pos: 'CE', line: 4, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 2, toi: '15:16', hits: 0, fow: 8, fol: 5, foPct: 61 },
                { name: 'Simen Andre Edvardsen', number: 19, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 1, ppsog: 0, plusMinus: 1, toi: '09:51', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Tobias Sjökvist', number: 27, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '03:01', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Noel Fransén', number: 65, pos: 'RD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 2, sog: 1, ppsog: 0, plusMinus: 1, toi: '14:48', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Leevi Viitala', number: 78, pos: 'LW', line: 4, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 1, toi: '09:36', hits: 0, fow: 0, fol: 0, foPct: 0 },
            ],
        },
    },

    // ===================== MATCH 4 =====================
    {
        id: 'match4',
        matchNumber: 4,
        date: '2026-04-21',
        arena: 'Nobelhallen',
        result: { home: 7, away: 3 },
        home: {
            goalies: [
                { name: 'Frans Tuohimaa', number: 50, pos: 'GK', line: 1, ga: 3, soga: 28, spga: 9, svs: 25, svsPct: 89.3 },
                { name: 'Olle Eriksson Ek', number: 31, pos: 'GK', line: 2, ga: 0, soga: 0, spga: 0, svs: 0, svsPct: 0.0 },
            ],
            skaters: [
                { name: 'Marcus Nilsson', number: 10, pos: 'LW', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '15:15', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Axel Ottosson', number: 18, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 2, sog: 1, ppsog: 1, plusMinus: 0, toi: '16:59', hits: 0, fow: 7, fol: 4, foPct: 63 },
                { name: 'Linus Cronholm', number: 24, pos: 'LD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '19:41', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Marcus Björk', number: 47, pos: 'RD', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 4, pim: 0, sog: 0, ppsog: 0, plusMinus: -1, toi: '21:04', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustav Possler', number: 71, pos: 'RW', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 3, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '19:23', hits: 0, fow: 0, fol: 1, foPct: 0 },
                { name: 'Olli Vainio', number: 6, pos: 'RD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 0, ppsog: 0, plusMinus: 0, toi: '19:07', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Mathew Maione', number: 28, pos: 'LD', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '16:59', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Albin Lundin', number: 33, pos: 'CE', line: 2, goals: 1, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '18:03', hits: 0, fow: 4, fol: 13, foPct: 23 },
                { name: 'Fredrik Forsberg', number: 56, pos: 'RW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '16:26', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jakob Ihs-Wozniak', number: 89, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '08:59', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Lucas Nordsäter', number: 8, pos: 'RD', line: 3, goals: 1, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: 3, toi: '15:15', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Liam Dower Nilsson', number: 19, pos: 'RW', line: 3, goals: 0, assists: 2, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 1, plusMinus: -1, toi: '17:59', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jacob Olofsson', number: 32, pos: 'CE', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '13:37', hits: 0, fow: 2, fol: 5, foPct: 28 },
                { name: 'Anton Malmström', number: 64, pos: 'LD', line: 3, goals: 1, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 1, ppsog: 0, plusMinus: 3, toi: '13:31', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oscar Tellström', number: 91, pos: 'LW', line: 3, goals: 2, assists: 1, ppg: 1, shotsWide: 2, pim: 0, sog: 2, ppsog: 1, plusMinus: 1, toi: '16:47', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliwer Sjöström', number: 26, pos: 'LD', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '06:14', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Daniel Brodin', number: 34, pos: 'RW', line: 4, goals: 1, assists: 0, ppg: 1, shotsWide: 0, pim: 2, sog: 3, ppsog: 1, plusMinus: 1, toi: '16:06', hits: 0, fow: 2, fol: 2, foPct: 50 },
                { name: 'Lenni Killinen', number: 37, pos: 'LW', line: 4, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '11:30', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Joel Mustonen', number: 39, pos: 'CE', line: 4, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '13:05', hits: 0, fow: 11, fol: 6, foPct: 64 },
                { name: 'Philip Hemmyr', number: 77, pos: 'LW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '00:00', hits: 0, fow: 0, fol: 0, foPct: 0 },
            ],
        },
        away: {
            goalies: [
                { name: 'Olof Lindbom', number: 1, pos: 'GK', line: 1, ga: 2, soga: 8, spga: 5, svs: 6, svsPct: 75.0 },
                { name: 'Lars Volden', number: 35, pos: 'GK', line: 2, ga: 4, soga: 10, spga: 10, svs: 6, svsPct: 60.0 },
            ],
            skaters: [
                { name: 'Alexander Leandersson', number: 4, pos: 'LD', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '06:05', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Henrik Björklund', number: 14, pos: 'RW', line: 1, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: -1, toi: '24:23', hits: 0, fow: 3, fol: 2, foPct: 60 },
                { name: 'Åke Stakkestad', number: 17, pos: 'LW', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: -2, toi: '19:49', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Oliver Eklind', number: 73, pos: 'CE', line: 1, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 2, ppsog: 0, plusMinus: -1, toi: '21:00', hits: 0, fow: 6, fol: 3, foPct: 66 },
                { name: 'Tim Barkemo', number: 91, pos: 'RD', line: 1, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 2, sog: 1, ppsog: 0, plusMinus: 2, toi: '22:46', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jonatan Lundgren', number: 5, pos: 'RD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 0, toi: '22:04', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Eero Teräväinen', number: 9, pos: 'LD', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 2, pim: 0, sog: 3, ppsog: 2, plusMinus: -2, toi: '19:36', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Hampus Plato', number: 13, pos: 'RW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 4, sog: 2, ppsog: 1, plusMinus: -1, toi: '13:22', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Kalle Jellvert', number: 40, pos: 'CE', line: 2, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 2, sog: 2, ppsog: 0, plusMinus: 0, toi: '14:54', hits: 0, fow: 13, fol: 8, foPct: 61 },
                { name: 'Adam Rockwood', number: 71, pos: 'LW', line: 2, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 2, sog: 1, ppsog: 0, plusMinus: 0, toi: '11:02', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Sander Vold Engebråten', number: 7, pos: 'LD', line: 3, goals: 1, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 2, ppsog: 0, plusMinus: -1, toi: '12:31', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Alexander Ljungkrantz', number: 10, pos: 'RW', line: 3, goals: 0, assists: 1, ppg: 0, shotsWide: 0, pim: 0, sog: 1, ppsog: 0, plusMinus: 1, toi: '10:40', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Thorell', number: 12, pos: 'CE', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 2, sog: 1, ppsog: 0, plusMinus: -1, toi: '12:30', hits: 0, fow: 6, fol: 6, foPct: 50 },
                { name: 'Viktor Lang', number: 22, pos: 'RD', line: 3, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -2, toi: '14:58', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Jonatan Harju', number: 44, pos: 'LW', line: 3, goals: 1, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 1, ppsog: 0, plusMinus: -1, toi: '10:11', hits: 3, fow: 0, fol: 0, foPct: 0 },
                { name: 'Gustaf Franzén', number: 15, pos: 'CE', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 0, pim: 0, sog: 0, ppsog: 0, plusMinus: -2, toi: '15:36', hits: 0, fow: 4, fol: 7, foPct: 36 },
                { name: 'Simen Andre Edvardsen', number: 19, pos: 'RW', line: 4, goals: 0, assists: 1, ppg: 0, shotsWide: 1, pim: 0, sog: 2, ppsog: 0, plusMinus: 0, toi: '12:35', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Tobias Sjökvist', number: 27, pos: 'RW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 0, ppsog: 0, plusMinus: 0, toi: '02:52', hits: 1, fow: 0, fol: 0, foPct: 0 },
                { name: 'Noel Fransén', number: 65, pos: 'RD', line: 4, goals: 0, assists: 2, ppg: 0, shotsWide: 0, pim: 0, sog: 3, ppsog: 0, plusMinus: 1, toi: '18:01', hits: 0, fow: 0, fol: 0, foPct: 0 },
                { name: 'Leevi Viitala', number: 78, pos: 'LW', line: 4, goals: 0, assists: 0, ppg: 0, shotsWide: 1, pim: 0, sog: 3, ppsog: 0, plusMinus: -1, toi: '09:17', hits: 0, fow: 0, fol: 0, foPct: 0 },
            ],
        },
    },
];

// Beräkna toiSeconds automatiskt för alla spelare
MATCHES.forEach(m => {
    ['home', 'away'].forEach(side => {
        m[side].skaters.forEach(s => {
            s.toiSeconds = toiToSeconds(s.toi);
            s.points = s.goals + s.assists;
        });
    });
});
