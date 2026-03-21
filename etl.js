const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const { saveMatch, matchExists } = require('./db');

// ===== PARSING UTILITIES (extracted from frontend) =====
function toiSec(t) { if (!t) return 0; const p = String(t).split(':'); return (parseInt(p[0]) || 0) * 60 + (parseInt(p[1]) || 0); }
function pct(a, b) { return b > 0 ? (a / b * 100) : 0; }
function safeNum(v) { const n = Number(v); return isNaN(n) ? 0 : n; }

function parseFileName(fn) {
    const name = path.basename(fn).replace(/\.xlsx?$/i, '');
    const parts = name.split('_');
    if (parts.length < 3) throw new Error(`Filnamn måste vara: Motståndare_Bjorkloven_YYYYDDMM.xlsx (got: ${name})`);
    const opp = parts[0];
    const ds = parts[parts.length - 1];
    if (ds.length !== 8) throw new Error(`Datumformat i filnamn måste vara YYYYDDMM (got: ${ds})`);
    const y = ds.slice(0, 4), d = ds.slice(4, 6), mo = ds.slice(6, 8);
    return { opponent: opp, date: `${y}-${mo}-${d}`, matchId: `match_${y}${mo}${d}_${opp.toLowerCase()}` };
}

function parseSheet(ws) {
    const simpleRows = XLSX.utils.sheet_to_json(ws, { defval: '' });
    const goalies = [], skaters = [];

    const hasSkaterCols = simpleRows.length > 0 && ('G' in simpleRows[0] || 'g' in simpleRows[0] || 'POS' in simpleRows[0]);

    if (hasSkaterCols && simpleRows.some(r => r.Spelare || r.spelare || r.NR || r.Nr)) {
        simpleRows.forEach(r => {
            if (!r.Spelare && !r.spelare && !r.NR && !r.Nr) return;
            const name = r.Spelare || r.spelare || '';
            const pos = String(r.POS || r.Pos || r.pos || '').toUpperCase().trim();
            const nr = safeNum(r.NR || r.Nr || r.nr);
            if (pos === 'GK' || pos === 'MV') {
                const soga = safeNum(r.SOGA || r.soga), svs = safeNum(r.SVS || r.svs || r['Räddningar']);
                goalies.push({
                    name, number: nr, line: safeNum(r.LINE || r.Line || r.line) || 1,
                    ga: safeNum(r.GA || r.ga || r['Insläppta']), soga, spga: safeNum(r.SPGA || r.spga), svs,
                    svsPct: r['SVS%'] != null && r['SVS%'] !== '' ? safeNum(r['SVS%']) : pct(svs, soga)
                });
            } else if (name || nr) {
                const g = safeNum(r.G || r.g), a = safeNum(r.A || r.a), fw = safeNum(r.FOW || r.fow), fl = safeNum(r.FOL || r.fol);
                const toi = r.TOI || r.toi || r['Tid'] || '0:00';
                skaters.push({
                    name, number: nr, pos: pos || 'FW', line: safeNum(r.LINE || r.Line || r.line) || 1,
                    goals: g, assists: a, points: g + a, ppg: safeNum(r.PPG || r.ppg),
                    shotsWide: safeNum(r.SW || r.sw), pim: safeNum(r.PIM || r.pim),
                    sog: safeNum(r.SOG || r.sog), ppsog: safeNum(r.PPSOG || r.ppsog),
                    plusMinus: safeNum(r['+/-'] || r['Plus/Minus'] || r.plusminus),
                    toi, toiSeconds: toiSec(toi), hits: safeNum(r.Hits || r.hits || r.HIT),
                    fow: fw, fol: fl, foPct: r['FO%'] != null && r['FO%'] !== '' ? safeNum(r['FO%']) : pct(fw, fw + fl)
                });
            }
        });
        if (goalies.length > 0 || skaters.length > 0) {
            console.log(`  [ETL] Parsed (single-table): ${goalies.length} goalies, ${skaters.length} skaters`);
            return { goalies, skaters };
        }
    }

    // Multi-section format
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    function findHeaderRow(data, markers) {
        for (let i = 0; i < data.length; i++) {
            const row = (data[i] || []).map(c => String(c).trim().toUpperCase());
            if (markers.every(m => row.some(cell => cell === m.toUpperCase()))) return i;
        }
        return -1;
    }
    function parseSection(data, headerIdx) {
        if (headerIdx < 0 || headerIdx >= data.length) return [];
        const headers = (data[headerIdx] || []).map(c => String(c).trim());
        const rows = [];
        for (let i = headerIdx + 1; i < data.length; i++) {
            const rowData = data[i] || [];
            if (rowData.length === 0 || rowData.every(c => c === '' || c == null)) break;
            const firstCells = rowData.slice(0, 3).map(c => String(c).trim().toUpperCase());
            if (firstCells.includes('SPELARE') && i > headerIdx + 1) break;
            const obj = {};
            headers.forEach((h, idx) => { if (h) obj[h] = rowData[idx] != null ? rowData[idx] : ''; });
            rows.push(obj);
        }
        return rows;
    }

    const gkIdx = findHeaderRow(raw, ['Spelare', 'NR']);
    let skIdx = -1;
    if (gkIdx >= 0) {
        const gkHeaders = (raw[gkIdx] || []).map(c => String(c).trim().toUpperCase());
        const isGoalieHeader = gkHeaders.includes('GA') || gkHeaders.includes('SVS') || gkHeaders.includes('SOGA');
        if (isGoalieHeader) {
            const gkRows = parseSection(raw, gkIdx);
            gkRows.forEach(r => {
                const soga = safeNum(r.SOGA || r.soga), svs = safeNum(r.SVS || r.svs);
                if (r.Spelare || r.NR) goalies.push({
                    name: r.Spelare || '', number: safeNum(r.NR),
                    line: safeNum(r.LINE || r.Line) || 1, ga: safeNum(r.GA), soga, spga: safeNum(r.SPGA), svs,
                    svsPct: r['SVS%'] != null && r['SVS%'] !== '' ? safeNum(r['SVS%']) : pct(svs, soga)
                });
            });
            skIdx = findHeaderRow(raw.slice(gkIdx + 1), ['Spelare', 'NR']);
            if (skIdx >= 0) skIdx += gkIdx + 1;
        } else {
            skIdx = gkIdx;
        }
    }
    if (skIdx < 0) skIdx = findHeaderRow(raw, ['Spelare', 'G']);
    if (skIdx < 0) skIdx = findHeaderRow(raw, ['Spelare', 'SOG']);

    if (skIdx >= 0) {
        const skRows = parseSection(raw, skIdx);
        skRows.forEach(r => {
            const name = r.Spelare || r.spelare || '';
            const pos = String(r.POS || r.Pos || '').toUpperCase().trim();
            const nr = safeNum(r.NR || r.Nr);
            if (!name && !nr) return;
            if (pos === 'GK' || pos === 'MV') {
                const soga = safeNum(r.SOGA), svs = safeNum(r.SVS);
                goalies.push({
                    name, number: nr, line: safeNum(r.LINE || r.Line) || 1,
                    ga: safeNum(r.GA), soga, spga: safeNum(r.SPGA), svs,
                    svsPct: r['SVS%'] != null && r['SVS%'] !== '' ? safeNum(r['SVS%']) : pct(svs, soga)
                });
                return;
            }
            const g = safeNum(r.G), a = safeNum(r.A), fw = safeNum(r.FOW), fl = safeNum(r.FOL);
            const toi = r.TOI || '0:00';
            skaters.push({
                name, number: nr, pos: pos || 'FW', line: safeNum(r.LINE || r.Line) || 1,
                goals: g, assists: a, points: g + a, ppg: safeNum(r.PPG),
                shotsWide: safeNum(r.SW), pim: safeNum(r.PIM), sog: safeNum(r.SOG), ppsog: safeNum(r.PPSOG),
                plusMinus: safeNum(r['+/-']), toi, toiSeconds: toiSec(toi), hits: safeNum(r.Hits || r.HIT),
                fow: fw, fol: fl, foPct: r['FO%'] != null && r['FO%'] !== '' ? safeNum(r['FO%']) : pct(fw, fw + fl)
            });
        });
    }

    console.log(`  [ETL] Parsed (multi-section): ${goalies.length} goalies, ${skaters.length} skaters`);
    return { goalies, skaters };
}

function teamTotals(sk, gk) {
    const t = { sog: 0, pim: 0, hits: 0, fow: 0, fol: 0, ppg: 0, goals: 0, assists: 0, points: 0, shotsWide: 0, ppsog: 0 };
    sk.forEach(s => {
        t.sog += s.sog; t.pim += s.pim; t.hits += s.hits; t.fow += s.fow; t.fol += s.fol;
        t.ppg += s.ppg; t.goals += s.goals; t.assists += s.assists; t.points += s.points; t.shotsWide += s.shotsWide; t.ppsog += s.ppsog;
    });
    t.foPct = pct(t.fow, t.fow + t.fol);
    t.ga = gk.reduce((s, g) => s + g.ga, 0); t.svs = gk.reduce((s, g) => s + g.svs, 0); t.soga = gk.reduce((s, g) => s + g.soga, 0);
    t.svsPct = pct(t.svs, t.soga);
    return t;
}

function groupLines(sk) {
    const lines = {};
    sk.forEach(s => { if (!lines[s.line]) lines[s.line] = []; lines[s.line].push(s); });
    return Object.entries(lines).sort((a, b) => a[0] - b[0]).map(([n, p]) => ({
        line: Number(n),
        forwards: p.filter(x => ['LW', 'CE', 'RW'].includes(x.pos)),
        defense: p.filter(x => ['LD', 'RD'].includes(x.pos)),
        all: p,
        totals: {
            plusMinus: p.reduce((s, x) => s + x.plusMinus, 0), sog: p.reduce((s, x) => s + x.sog, 0),
            pim: p.reduce((s, x) => s + x.pim, 0), goals: p.reduce((s, x) => s + x.goals, 0), hits: p.reduce((s, x) => s + x.hits, 0),
            toi: (() => { const avg = p.reduce((s, x) => s + x.toiSeconds, 0) / Math.max(p.length, 1); const m = Math.floor(avg / 60), ss = Math.round(avg % 60); return `${m}:${ss < 10 ? '0' : ''}${ss}`; })()
        }
    }));
}

// ===== IMPORT FUNCTION =====
function importFile(filePath) {
    const absPath = path.resolve(filePath);
    const fileName = path.basename(absPath);

    if (!/\.xlsx?$/i.test(fileName)) {
        console.log(`[ETL] Skipping non-Excel file: ${fileName}`);
        return null;
    }

    console.log(`[ETL] Processing: ${fileName}`);
    try {
        const info = parseFileName(fileName);

        // Check if already imported
        if (matchExists.get(info.matchId)) {
            console.log(`[ETL] Match ${info.matchId} already exists, re-importing...`);
        }

        const buf = fs.readFileSync(absPath);
        const wb = XLSX.read(buf, { type: 'buffer' });
        if (wb.SheetNames.length < 2) throw new Error('Excel-filen måste ha minst 2 sheets');

        // Auto-detect sheets
        let bjorkIdx = 0, oppIdx = 1;
        const names = wb.SheetNames.map(n => n.toLowerCase().trim());
        const bjorkMatch = names.findIndex(n => n.includes('björklöven') || n.includes('bjorkloven') || n.includes('bjork'));
        const oppMatch = names.findIndex(n => n.toLowerCase().includes(info.opponent.toLowerCase()));

        if (bjorkMatch >= 0 && oppMatch >= 0 && bjorkMatch !== oppMatch) { bjorkIdx = bjorkMatch; oppIdx = oppMatch; }
        else if (bjorkMatch >= 0) { bjorkIdx = bjorkMatch; oppIdx = bjorkMatch === 0 ? 1 : 0; }
        else if (oppMatch >= 0) { oppIdx = oppMatch; bjorkIdx = oppMatch === 0 ? 1 : 0; }

        console.log(`  [ETL] Sheet ${bjorkIdx} (${wb.SheetNames[bjorkIdx]}) = Björklöven, Sheet ${oppIdx} (${wb.SheetNames[oppIdx]}) = ${info.opponent}`);

        const bjork = parseSheet(wb.Sheets[wb.SheetNames[bjorkIdx]]);
        const opp = parseSheet(wb.Sheets[wb.SheetNames[oppIdx]]);
        const bjorkTotals = teamTotals(bjork.skaters, bjork.goalies);
        const oppTotals = teamTotals(opp.skaters, opp.goalies);

        const matchData = {
            id: info.matchId, date: info.date, opponent: info.opponent,
            result: {
                bjorkloven: bjork.skaters.reduce((s, x) => s + x.goals, 0),
                opponent: opp.skaters.reduce((s, x) => s + x.goals, 0)
            },
            bjorkloven: { goalies: bjork.goalies, skaters: bjork.skaters, totals: bjorkTotals, lines: groupLines(bjork.skaters) },
            opponentTeam: { goalies: opp.goalies, skaters: opp.skaters, totals: oppTotals, lines: groupLines(opp.skaters) },
            meta: { arena: '', round: '', overtime: false }
        };

        saveMatch(matchData, fileName);
        console.log(`[ETL] ✓ Imported: ${info.opponent} (${info.date}) — Björklöven ${matchData.result.bjorkloven}-${matchData.result.opponent}`);
        return matchData;
    } catch (e) {
        console.error(`[ETL] ✗ Error processing ${fileName}: ${e.message}`);
        return null;
    }
}

// ===== FILE WATCHER =====
function startWatcher(dir) {
    const watchDir = path.resolve(dir);
    if (!fs.existsSync(watchDir)) fs.mkdirSync(watchDir, { recursive: true });

    console.log(`[ETL] Watching directory: ${watchDir}`);

    // Import existing files first
    const existing = fs.readdirSync(watchDir).filter(f => /\.xlsx?$/i.test(f));
    if (existing.length) {
        console.log(`[ETL] Found ${existing.length} existing file(s), importing...`);
        existing.forEach(f => importFile(path.join(watchDir, f)));
    }

    // Watch for new files
    const watcher = chokidar.watch(path.join(watchDir, '*.xlsx'), {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 }
    });

    watcher.on('add', (filePath) => {
        console.log(`[ETL] New file detected: ${path.basename(filePath)}`);
        importFile(filePath);
    });

    watcher.on('change', (filePath) => {
        console.log(`[ETL] File updated: ${path.basename(filePath)}`);
        importFile(filePath);
    });

    return watcher;
}

module.exports = { importFile, startWatcher, parseFileName };
