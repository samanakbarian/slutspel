const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'stats.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ===== SCHEMA =====
db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    date TEXT NOT NULL,
    opponent TEXT NOT NULL,
    result_bjork INTEGER NOT NULL DEFAULT 0,
    result_opp INTEGER NOT NULL DEFAULT 0,
    arena TEXT DEFAULT '',
    round TEXT DEFAULT '',
    overtime INTEGER DEFAULT 0,
    source_file TEXT DEFAULT '',
    imported_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS skaters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL,
    team TEXT NOT NULL CHECK(team IN ('bjork','opp')),
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    pos TEXT NOT NULL DEFAULT 'FW',
    line INTEGER DEFAULT 1,
    goals INTEGER DEFAULT 0,
    assists INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    ppg INTEGER DEFAULT 0,
    sog INTEGER DEFAULT 0,
    ppsog INTEGER DEFAULT 0,
    shots_wide INTEGER DEFAULT 0,
    pim INTEGER DEFAULT 0,
    plus_minus INTEGER DEFAULT 0,
    toi TEXT DEFAULT '0:00',
    toi_seconds INTEGER DEFAULT 0,
    hits INTEGER DEFAULT 0,
    fow INTEGER DEFAULT 0,
    fol INTEGER DEFAULT 0,
    fo_pct REAL DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS goalies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL,
    team TEXT NOT NULL CHECK(team IN ('bjork','opp')),
    name TEXT NOT NULL,
    number INTEGER NOT NULL,
    line INTEGER DEFAULT 1,
    ga INTEGER DEFAULT 0,
    soga INTEGER DEFAULT 0,
    spga INTEGER DEFAULT 0,
    svs INTEGER DEFAULT 0,
    svs_pct REAL DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_skaters_match ON skaters(match_id);
  CREATE INDEX IF NOT EXISTS idx_goalies_match ON goalies(match_id);
`);

// ===== PREPARED STATEMENTS =====
const insertMatch = db.prepare(`
  INSERT OR REPLACE INTO matches (id, date, opponent, result_bjork, result_opp, arena, round, overtime, source_file)
  VALUES (@id, @date, @opponent, @result_bjork, @result_opp, @arena, @round, @overtime, @source_file)
`);

const insertSkater = db.prepare(`
  INSERT INTO skaters (match_id, team, name, number, pos, line, goals, assists, points, ppg, sog, ppsog, shots_wide, pim, plus_minus, toi, toi_seconds, hits, fow, fol, fo_pct)
  VALUES (@match_id, @team, @name, @number, @pos, @line, @goals, @assists, @points, @ppg, @sog, @ppsog, @shots_wide, @pim, @plus_minus, @toi, @toi_seconds, @hits, @fow, @fol, @fo_pct)
`);

const insertGoalie = db.prepare(`
  INSERT INTO goalies (match_id, team, name, number, line, ga, soga, spga, svs, svs_pct)
  VALUES (@match_id, @team, @name, @number, @line, @ga, @soga, @spga, @svs, @svs_pct)
`);

const deleteMatchData = db.prepare(`DELETE FROM skaters WHERE match_id = ?`);
const deleteMatchGoalies = db.prepare(`DELETE FROM goalies WHERE match_id = ?`);
const deleteMatch = db.prepare(`DELETE FROM matches WHERE id = ?`);

const getMatch = db.prepare(`SELECT * FROM matches WHERE id = ?`);
const getAllMatches = db.prepare(`SELECT * FROM matches ORDER BY date ASC`);
const getSkaters = db.prepare(`SELECT * FROM skaters WHERE match_id = ? ORDER BY team, line, pos`);
const getGoalies = db.prepare(`SELECT * FROM goalies WHERE match_id = ? ORDER BY team, line`);
const matchExists = db.prepare(`SELECT 1 FROM matches WHERE id = ?`);

// ===== HELPER FUNCTIONS =====

/**
 * Save a fully parsed match object into the database.
 * Replaces existing data if match_id already exists.
 */
function saveMatch(matchData, sourceFile = '') {
    const txn = db.transaction(() => {
        // Clear old data for this match
        deleteMatchData.run(matchData.id);
        deleteMatchGoalies.run(matchData.id);

        // Insert match
        insertMatch.run({
            id: matchData.id,
            date: matchData.date,
            opponent: matchData.opponent,
            result_bjork: matchData.result.bjorkloven,
            result_opp: matchData.result.opponent,
            arena: matchData.meta?.arena || '',
            round: matchData.meta?.round || '',
            overtime: matchData.meta?.overtime ? 1 : 0,
            source_file: sourceFile
        });

        // Insert Björklöven skaters
        for (const s of matchData.bjorkloven.skaters) {
            insertSkater.run({
                match_id: matchData.id, team: 'bjork',
                name: s.name, number: s.number, pos: s.pos, line: s.line,
                goals: s.goals, assists: s.assists, points: s.points, ppg: s.ppg,
                sog: s.sog, ppsog: s.ppsog, shots_wide: s.shotsWide, pim: s.pim,
                plus_minus: s.plusMinus, toi: s.toi, toi_seconds: s.toiSeconds,
                hits: s.hits, fow: s.fow, fol: s.fol, fo_pct: s.foPct
            });
        }

        // Insert opponent skaters
        for (const s of matchData.opponentTeam.skaters) {
            insertSkater.run({
                match_id: matchData.id, team: 'opp',
                name: s.name, number: s.number, pos: s.pos, line: s.line,
                goals: s.goals, assists: s.assists, points: s.points, ppg: s.ppg,
                sog: s.sog, ppsog: s.ppsog, shots_wide: s.shotsWide, pim: s.pim,
                plus_minus: s.plusMinus, toi: s.toi, toi_seconds: s.toiSeconds,
                hits: s.hits, fow: s.fow, fol: s.fol, fo_pct: s.foPct
            });
        }

        // Insert goalies
        for (const g of matchData.bjorkloven.goalies) {
            insertGoalie.run({
                match_id: matchData.id, team: 'bjork',
                name: g.name, number: g.number, line: g.line,
                ga: g.ga, soga: g.soga, spga: g.spga, svs: g.svs, svs_pct: g.svsPct
            });
        }
        for (const g of matchData.opponentTeam.goalies) {
            insertGoalie.run({
                match_id: matchData.id, team: 'opp',
                name: g.name, number: g.number, line: g.line,
                ga: g.ga, soga: g.soga, spga: g.spga, svs: g.svs, svs_pct: g.svsPct
            });
        }
    });

    txn();
}

/**
 * Load a match from DB and return it in the same format the frontend expects.
 */
function loadMatch(matchId) {
    const m = getMatch.get(matchId);
    if (!m) return null;
    const skaters = getSkaters.all(matchId);
    const goalies = getGoalies.all(matchId);

    const buildTeam = (team) => {
        const sk = skaters.filter(s => s.team === team).map(s => ({
            name: s.name, number: s.number, pos: s.pos, line: s.line,
            goals: s.goals, assists: s.assists, points: s.points, ppg: s.ppg,
            sog: s.sog, ppsog: s.ppsog, shotsWide: s.shots_wide, pim: s.pim,
            plusMinus: s.plus_minus, toi: s.toi, toiSeconds: s.toi_seconds,
            hits: s.hits, fow: s.fow, fol: s.fol, foPct: s.fo_pct
        }));
        const gk = goalies.filter(g => g.team === team).map(g => ({
            name: g.name, number: g.number, line: g.line,
            ga: g.ga, soga: g.soga, spga: g.spga, svs: g.svs, svsPct: g.svs_pct
        }));
        return { skaters: sk, goalies: gk };
    };

    const bjork = buildTeam('bjork');
    const opp = buildTeam('opp');

    return {
        id: m.id, date: m.date, opponent: m.opponent,
        result: { bjorkloven: m.result_bjork, opponent: m.result_opp },
        bjorkloven: bjork, opponentTeam: opp,
        meta: { arena: m.arena, round: m.round, overtime: !!m.overtime }
    };
}

/**
 * Load all matches in the format the frontend expects.
 */
function loadAllMatches() {
    const matches = getAllMatches.all();
    return matches.map(m => loadMatch(m.id)).filter(Boolean);
}

/**
 * Delete a match and all related data.
 */
function removeMatch(matchId) {
    const txn = db.transaction(() => {
        deleteMatchData.run(matchId);
        deleteMatchGoalies.run(matchId);
        deleteMatch.run(matchId);
    });
    txn();
}

/**
 * Clear all data.
 */
function clearAll() {
    db.exec('DELETE FROM skaters; DELETE FROM goalies; DELETE FROM matches;');
}

module.exports = { db, saveMatch, loadMatch, loadAllMatches, removeMatch, clearAll, matchExists };
