# Implementationsinstruktioner — Avancerad Analys (Fas 3-4)

> **Målgrupp:** AI-modeller eller utvecklare som ska fortsätta bygga analysdelen.  
> **Förutsättning:** Fas 1 och 2 är klara. Analytics-endpointen och game events finns i produktion.  
> **Läs detta dokument i sin helhet innan du börjar koda.**

---

## KONTEXT — Vad som redan finns

### Repor
- **Frontend:** `c:\Users\saman\slutspel` (GitHub: `samanakbarian/slutspel`, branch: `main`)
- **Backend:** `c:\Users\saman\loven-stats-backend` (GitHub: `samanakbarian/loven-stats-backend`, branch: `master`)

### Produktion
- **Frontend:** https://viskauppigen.netlify.app (auto-deploy vid push till `main`)
- **Backend API:** https://loven-stats-api-324947473206.europe-west1.run.app
- **GCP projekt:** `granskaren-d51a1`
- **BigQuery dataset:** `raw_sports`

### Befintliga API-endpoints
```
GET /api/v1/statistics    → Spelarstatistik, målvakter, standings, matcher
GET /api/v1/analytics     → Analysmoduler inkl SHL-projektion (se nedan)
GET /api/v1/lovenlaget    → Lövenläget-snapshot
GET /api/silly-season     → Silly Season-data
```

### Befintligt `/api/v1/analytics`-svar (JSON-struktur)
```json
{
  "status": "ok",
  "modules": {
    "timeline":       [{"date":"2025-09-19", "opponent":"...", "result":"W", "cumPts":3, "gf":4, "ga":1, "isHome":true, ...}],
    "splits":         {"home": {"gp":26, "w":18, "l":5, ...}, "away": {"gp":26, "w":23, ...}},
    "periods":        [{"period":1, "label":"P1", "gf":52, "ga":26}, ...],
    "h2h":            [{"opponent":"Kalmar HC", "gp":4, "w":3, "l":1, "gf":12, "ga":6, "pts":9}, ...],
    "form":           [{"matchNum":1, "pts":3, "gf_avg":4.0, "ga_avg":1.0, "window":1}, ...],
    "streaks":        {"longest_win": {"type":"W","length":9,...}, "longest_loss":{...}, "current":{...}},
    "player_impact":  [{"name":"Dower Nilsson, Liam", "position":"RW", "p_per_gp":1.12, "vs_league":{"ppg_diff":0.5}, ...}],
    "goalie_radar":   [{"name":"Eriksson Ek, Olle", "sv_pct":92.08, "percentiles":{"sv_pct":87, "gaa":93, "win_pct":80}}, ...],
    "special_teams":  {"pp_pct":23.0, "pk_pct":88.8, "pp_goals":12, "pk_goals_against":8, ...},
    "attendance":     {"avg":4558, "max":6200, "min":2800, ...},
    "age_curve":      {"skaters":[...], "goalies":[...]},
    "shl_projected_table": {
      "season":"SHL 2026/27 (preseason)",
      "data_quality":"ok",
      "table":[
        {
          "projected_rank":11,
          "projected_rank_p10":9,
          "projected_rank_p50":11,
          "projected_rank_p90":14,
          "team":"IF Björklöven",
          "projected_points":68,
          "projected_points_p10":60,
          "projected_points_p50":68,
          "projected_points_p90":76,
          "top6_chance_pct":28,
          "playout_risk_pct":42
        }
      ]
    }
  }
}
```

### SHL-projektion: datakvalitet och dynamik

- `modules.shl_projected_table` är preseason-prognos och räknas om vid varje API-kall (med endpoint-cache).
- Prognosen uppdateras dynamiskt när:
  - SHL-källdata i `raw_sports.swehockey_*` uppdateras.
  - `SILLY_SEASON_BASELINE` uppdateras (nyförvärv, förluster, utgående kontrakt).
- Ingen statisk fallback-tabell används längre.
  - Om SHL-källa saknas returneras `data_quality: "missing_shl_source"` och `table: []`.
- Frontend-visning:
  - SHL-fliken i Analytics visas endast för säsongsnyckeln `shl_2627`.
  - För HA-säsong (`ha_2526`) är SHL-fliken dold.
- Laguppsättning i projektion:
  - Baseras på senaste SHL-standings för styrkenivå.
  - Mappas till kommande SHL 26/27-lagset (Björklöven in, MODO och Leksand ut).

### Befintliga frontend-filer
```
frontend_v2/src/pages/Statistics.tsx          ← Huvudsida med 5 tabbar
frontend_v2/src/components/AnalyticsTabs.tsx  ← Analyskomponent med 3 sub-tabbar
```

### BigQuery-tabeller i `raw_sports`
```
swehockey_player_stats    (50 rader, 15 kolumner)  — position, jersey_number, goals, assists, points, avg_ppg, pim, plus_minus
swehockey_goalie_stats    (29 rader, 19 kolumner)  — shutouts, wins, losses, win_pct, saves, gaa, save_pct
swehockey_schedule        (366 rader, 14 kolumner)  — alla HA-matcher med period_results, venue, spectators
swehockey_standings       (14 rader, 12 kolumner)   — beräknad tabellställning
swehockey_game_events     (972 rader, 17 kolumner)  — mål (med assister, PP/SH) och utvisningar (typ, minuter)
```

---

## UPPGIFT 1: Multi-Season-stöd

### Vad
Gör så att hela kedjan (API → frontend) stödjer flera säsonger. Idag är allt hardkodat till säsongen 2025/26.

### Steg-för-steg

**Steg 1.1 — Skapa konfigurationstabell i BigQuery**

Kör detta SQL i BigQuery Console (https://console.cloud.google.com/bigquery?project=granskaren-d51a1):

```sql
CREATE TABLE `granskaren-d51a1.raw_sports.swehockey_seasons` (
  season_key STRING NOT NULL,
  season_name STRING NOT NULL,
  league STRING NOT NULL,
  regular_season_id INT64 NOT NULL,
  playoff_id INT64,
  start_date DATE,
  end_date DATE,
  is_active BOOL DEFAULT TRUE
);

INSERT INTO `granskaren-d51a1.raw_sports.swehockey_seasons` VALUES
  ('ha_2526', 'HockeyAllsvenskan 2025/26', 'HA', 18266, 19979, '2025-09-19', '2026-03-15', TRUE);
```

**Steg 1.2 — Ny helper i API:et**

Öppna filen `c:\Users\saman\loven-stats-backend\api\main.py`.

Lägg till denna funktion **före** `@app.get("/api/v1/statistics")` (runt rad 55):

```python
# ── Season lookup ──
_season_cache = {}

def lookup_season(season_key=None):
    """Lookup season config from BQ. Caches results."""
    cache_key = season_key or "__active__"
    if cache_key in _season_cache:
        return _season_cache[cache_key]
    
    bq = bigquery.Client(project=BQ_PROJECT_ID or None)
    proj = bq.project
    if season_key:
        sql = f"SELECT * FROM `{proj}.raw_sports.swehockey_seasons` WHERE season_key = @key"
        job_config = bigquery.QueryJobConfig(query_parameters=[
            bigquery.ScalarQueryParameter("key", "STRING", season_key)
        ])
    else:
        sql = f"SELECT * FROM `{proj}.raw_sports.swehockey_seasons` WHERE is_active = TRUE LIMIT 1"
        job_config = None
    
    rows = list(bq.query(sql, job_config=job_config).result())
    if not rows:
        # Fallback to hardcoded
        return {"key": "ha_2526", "name": "HockeyAllsvenskan 2025/26", "regular": 18266, "playoff": 19979}
    
    r = dict(rows[0].items())
    result = {
        "key": r["season_key"],
        "name": r["season_name"],
        "regular": r["regular_season_id"],
        "playoff": r.get("playoff_id"),
    }
    _season_cache[cache_key] = result
    return result
```

**Steg 1.3 — Ny endpoint: GET /api/v1/seasons**

Lägg till denna endpoint i `main.py`, direkt efter `lookup_season()`:

```python
@app.get("/api/v1/seasons")
def get_seasons():
    bq = bigquery.Client(project=BQ_PROJECT_ID or None)
    rows = [dict(r.items()) for r in bq.query(
        f"SELECT * FROM `{bq.project}.raw_sports.swehockey_seasons` ORDER BY start_date DESC"
    ).result()]
    active = next((r["season_key"] for r in rows if r.get("is_active")), None)
    return {
        "seasons": [{"key": r["season_key"], "name": r["season_name"], "is_active": r.get("is_active", False)} for r in rows],
        "active": active,
    }
```

**Steg 1.4 — Parametrisera `/api/v1/statistics`**

Hitta raden `def get_statistics():` och ändra signaturen:

```python
@app.get("/api/v1/statistics")
def get_statistics(season: str = None):
```

Hitta raderna med `HA_REGULAR = 18266` och `HA_PLAYOFF = 19979` (runt rad 88). Ersätt:

```python
        # Lookup season
        active = lookup_season(season)
        HA_REGULAR = active["regular"]
        HA_PLAYOFF = active["playoff"] or active["regular"]
```

Hitta raden med `"season": "HockeyAllsvenskan 2025/26"` och ändra till:

```python
            "season": active["name"],
```

**Steg 1.5 — Parametrisera `/api/v1/analytics`**

Hitta raden `def get_analytics():` och ändra signaturen:

```python
@app.get("/api/v1/analytics")
def get_analytics(season: str = None):
```

Inuti funktionen, efter `proj = bq.project`, lägg till:

```python
        active = lookup_season(season)
        REGULAR_ID = active["regular"]
```

Ersätt de två raderna med `WHERE season_group_id = 18266`:

```python
        players = q(f"SELECT * FROM `{proj}.raw_sports.swehockey_player_stats` WHERE season_group_id = {REGULAR_ID}")
        goalies = q(f"SELECT * FROM `{proj}.raw_sports.swehockey_goalie_stats` WHERE season_group_id = {REGULAR_ID}")
```

**Steg 1.6 — Frontend: Säsongsväljare**

Öppna `frontend_v2/src/pages/Statistics.tsx`.

Lägg till ny state i komponenten (efter `const [tab, setTab]`):

```typescript
const [seasons, setSeasons] = useState<{key: string; name: string; is_active: boolean}[]>([]);
const [selectedSeason, setSelectedSeason] = useState<string>('');
```

Lägg till useEffect som hämtar säsonger (efter befintlig useEffect):

```typescript
useEffect(() => {
  fetch(`${API_URL}/api/v1/seasons`)
    .then(r => r.json())
    .then(d => {
      if (d.seasons) setSeasons(d.seasons);
      if (d.active) setSelectedSeason(d.active);
    })
    .catch(() => {});
}, []);
```

Ändra befintlig data-fetch att inkludera season:

```typescript
// I befintlig useEffect, ändra URL:en:
fetch(`${API_URL}/api/v1/statistics${selectedSeason ? `?season=${selectedSeason}` : ''}`)
```

Gör selectedSeason till dependency i useEffect:

```typescript
}, [selectedSeason]);  // Lägg till selectedSeason här
```

Lägg till dropdown i headern (bredvid datumstämpeln i `<header>`):

```tsx
{seasons.length > 1 && (
  <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}
    style={{ background: 'rgba(15,23,42,0.8)', color: '#e2e8f0', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 6, padding: '4px 8px', fontSize: 12 }}>
    {seasons.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
  </select>
)}
```

Skicka season som prop till AnalyticsTabs:

```tsx
{tab === 'analys' && <Card kicker="Avancerad analys — Björklöven"><AnalyticsTabs season={selectedSeason} /></Card>}
```

Öppna `frontend_v2/src/components/AnalyticsTabs.tsx` och ändra:

```typescript
// Ändra export:
export default function AnalyticsTabs({ season }: { season?: string }) {

// Ändra fetch URL:
fetch(`${API_URL}/api/v1/analytics${season ? `?season=${season}` : ''}`)
```

**Steg 1.7 — Deploy**

```bash
# Backend
cd c:\Users\saman\loven-stats-backend
gcloud run deploy loven-stats-api --source=api --region=europe-west1 --project=granskaren-d51a1 --allow-unauthenticated

# Frontend (auto-deploy via git push)
cd c:\Users\saman\slutspel
git add -A && git commit -m "feat: multi-season support" && git push origin main
```

**Steg 1.8 — Verifiering**

1. Öppna https://loven-stats-api-324947473206.europe-west1.run.app/api/v1/seasons — ska returnera `{"seasons": [...], "active": "ha_2526"}`
2. Öppna https://loven-stats-api-324947473206.europe-west1.run.app/api/v1/statistics?season=ha_2526 — ska returnera 25/26-data
3. Öppna https://viskauppigen.netlify.app/statistik — dropdown ska INTE visas (bara 1 säsong)

---

## UPPGIFT 2: Utöka Period-analys med Sportradar-data

### Vad
Vi har 199 matcher i `loven_staging_marts.dim_matches` med strukturerade `period_scores` från Sportradar. Dessa har mer exakt perioddata (inkl OT/straffar) än Swehockey. Slå ihop dessa för bättre periodanalys.

### Steg-för-steg

**Steg 2.1** — I `/api/v1/analytics` i `main.py`, efter de befintliga BQ-queries, lägg till:

```python
# Also load Sportradar period data if available
try:
    sr_matches = q(f"""
        SELECT match_date, home_team_name, away_team_name, home_score, away_score, period_scores
        FROM `{proj}.loven_staging_marts.dim_matches`
        WHERE home_team_name LIKE '%jorkloven%' OR away_team_name LIKE '%jorkloven%'
    """)
except Exception:
    sr_matches = []
```

**Steg 2.2** — Använd Sportradar-perioddata som primärkälla (den har bättre struktur). Om den finns, beräkna period_stats från `period_scores` istället för att parsa text.

---

## UPPGIFT 3: Utvisningsanalys (Penalty Breakdown)

### Vad
Vi har 384 utvisningar i `swehockey_game_events`. Bygg en visualisering som visar:
- Vanligaste utvisningstyper (High Sticking, Tripping, etc.)
- Utvisningar per period
- Mest utvisade spelare

### Backend-ändring

I `main.py`, inuti `get_analytics()`, lägg till ny modul efter `special_teams`:

```python
# ── Penalty Breakdown ──
bjk_penalties = [e for e in events if e.get("event_type") == "penalty" and (e.get("team_code") or "").upper() in BJK_CODES]

# By type
penalty_types = {}
for p in bjk_penalties:
    t = p.get("detail", "Okänd") or "Okänd"
    penalty_types[t] = penalty_types.get(t, 0) + 1
penalty_by_type = sorted([{"type": k, "count": v} for k, v in penalty_types.items()], key=lambda x: -x["count"])

# By period
penalty_by_period = {1: 0, 2: 0, 3: 0}
for p in bjk_penalties:
    pd = p.get("period", 0)
    if pd in penalty_by_period:
        penalty_by_period[pd] += 1

# Most penalized players
penalty_players = {}
for p in bjk_penalties:
    name = p.get("player_name", "")
    mins = p.get("penalty_minutes", 0)
    if name:
        if name not in penalty_players:
            penalty_players[name] = {"name": name, "count": 0, "minutes": 0}
        penalty_players[name]["count"] += 1
        penalty_players[name]["minutes"] += mins
most_penalized = sorted(penalty_players.values(), key=lambda x: -x["minutes"])[:10]
```

Lägg till i returvärdet:

```python
"penalty_breakdown": {
    "by_type": penalty_by_type,
    "by_period": [{"period": p, "count": c} for p, c in sorted(penalty_by_period.items())],
    "most_penalized": most_penalized,
},
```

### Frontend-ändring

I `AnalyticsTabs.tsx`, lägg till i `SeasonTab` (efter attendance-cards):

```tsx
{/* Penalty Breakdown */}
<div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
  <div style={{ fontSize: 13, fontWeight: 700, color: RED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
    Utvisningsanalys
  </div>
  <ResponsiveContainer width="100%" height={200}>
    <BarChart data={m.penalty_breakdown?.by_type?.slice(0, 8)} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
      <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
      <XAxis dataKey="type" tick={{ fontSize: 9, fill: chartTheme.text }} angle={-30} textAnchor="end" height={50} />
      <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
      <Tooltip content={<ChartTooltip />} />
      <Bar dataKey="count" name="Antal" radius={[4, 4, 0, 0]} fill={RED} fillOpacity={0.7} />
    </BarChart>
  </ResponsiveContainer>
</div>
```

**OBS:** Du måste uppdatera TypeScript-typerna i `AnalyticsTabs.tsx` för att inkludera `penalty_breakdown` i `AnalyticsData`.

---

## UPPGIFT 4: Publiktrend-diagram

### Vad
Visa en linjediagram med publiken per hemmamatch över säsongen.

### Backend-ändring

I `get_analytics()`, ersätt den nuvarande `attendance`-modulen med en utökad version:

```python
# ── Attendance with trend ──
home_games = [g for g in bjk_games if is_bjk(g.get("home_team", ""))]
attendance_trend = []
for g in home_games:
    spec = g.get("spectators")
    if spec:
        attendance_trend.append({
            "date": g.get("match_date", ""),
            "opponent": g.get("away_team", ""),
            "spectators": spec,
            "venue": g.get("venue", ""),
        })

specs = [a["spectators"] for a in attendance_trend]
attendance = {
    "avg": round(sum(specs) / max(len(specs), 1)) if specs else 0,
    "max": max(specs) if specs else 0,
    "min": min(specs) if specs else 0,
    "total": sum(specs) if specs else 0,
    "home_games": len(home_games),
    "trend": attendance_trend,  # NY
}
```

### Frontend-ändring

Lägg till i `SeasonTab` efter attendance-cards:

```tsx
{m.attendance?.trend?.length > 0 && (
  <div style={{ background: chartTheme.bg, borderRadius: 12, padding: '16px 16px 8px' }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: PURPLE, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
      Publiktrend — Hemmamatcher
    </div>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={m.attendance.trend} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
        <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.text }} tickFormatter={(v: string) => v.slice(5)} />
        <YAxis tick={{ fontSize: 10, fill: chartTheme.text }} />
        <Tooltip content={<ChartTooltip />} />
        <Area type="monotone" dataKey="spectators" stroke={PURPLE} fill={PURPLE} fillOpacity={0.15} strokeWidth={2} name="Publik" />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)}
```

---

## UPPGIFT 5: Målvakts-jämförelse (sida vid sida)

### Vad
Visa en jämförelsetabell mellan Eriksson Ek och Tuohimaa, sida vid sida med progress bars.

### Enbart frontend-ändring

Data finns redan i `goalie_radar`-modulen. I `PlayersTab` i `AnalyticsTabs.tsx`, lägg till efter radar-charterna:

```tsx
{goalies.length >= 2 && (
  <div style={{ background: chartTheme.bg, borderRadius: 12, padding: 16 }}>
    <div style={{ fontSize: 13, fontWeight: 700, color: GREEN, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
      Målvaktsjämförelse
    </div>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          <th style={{ textAlign: 'left', color: chartTheme.text, padding: 6 }}>Metrik</th>
          {goalies.slice(0, 2).map(g => (
            <th key={g.name} style={{ textAlign: 'center', color: '#e2e8f0', padding: 6 }}>{g.name.split(',')[0]}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {[
          { label: 'SV%', key: 'sv_pct', better: 'high' },
          { label: 'GAA', key: 'gaa', better: 'low' },
          { label: 'V%', key: 'win_pct', better: 'high' },
          { label: 'SO', key: 'shutouts', better: 'high' },
          { label: 'GP', key: 'gp', better: 'high' },
          { label: 'SVS/GP', key: 'saves_per_gp', better: 'high' },
        ].map(metric => {
          const vals = goalies.slice(0, 2).map(g => (g as any)[metric.key] ?? 0);
          const best = metric.better === 'high' ? Math.max(...vals) : Math.min(...vals);
          return (
            <tr key={metric.label} style={{ borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
              <td style={{ padding: 6, color: chartTheme.text }}>{metric.label}</td>
              {vals.map((v, i) => (
                <td key={i} style={{ textAlign: 'center', padding: 6, fontWeight: v === best ? 700 : 400, color: v === best ? GREEN : '#e2e8f0' }}>
                  {typeof v === 'number' ? (v % 1 === 0 ? v : v.toFixed(2)) : v}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}
```

---

## DEPLOY-CHECKLISTA

Efter varje ändring:

1. **Backend:**
   ```bash
   cd c:\Users\saman\loven-stats-backend
   gcloud run deploy loven-stats-api --source=api --region=europe-west1 --project=granskaren-d51a1 --allow-unauthenticated
   ```

2. **Frontend:**
   ```bash
   cd c:\Users\saman\slutspel\frontend_v2
   npm run build   # Verifiera att det bygger utan fel
   cd ..
   git add -A && git commit -m "feat: <beskrivning>" && git push origin main
   # Netlify deployer automatiskt
   ```

3. **Verifiera:**
   - API: https://loven-stats-api-324947473206.europe-west1.run.app/api/v1/analytics
   - Frontend: https://viskauppigen.netlify.app/statistik → Analys-tab

## VIKTIGA REGLER

1. **Ändra aldrig BQ-data utan backup.** Kör alltid `SELECT COUNT(*)` innan `DELETE`.
2. **Testa lokalt först.** Kör `npm run build` innan push.
3. **Behåll befintlig kod.** Lägg till — ta inte bort kommentarer eller funktioner som fungerar.
4. **Charting-bibliotek:** Recharts redan installerat. Importera från `'recharts'`.
5. **Färgpalett:** Använd konstanterna `GREEN (#22c55e)`, `RED (#ef4444)`, `AMBER (#f59e0b)`, `TEAL (#14b8a6)`, `BLUE (#3b82f6)`, `PURPLE (#a855f7)`.
6. **Stil:** Alla chart-containers ska ha `background: chartTheme.bg`, `borderRadius: 12`, `padding: '16px 16px 8px'`.

---

## IMPLEMENTERADE AVANCERADE MODULER (Säkerställd SHL-övergång & Roster-integration)

Under maj 2026 implementerades följande avancerade logik i backend (`api/main.py`) för att fullända sportchefs-vyn:

### 1. Full Roster & Dynamic Player Stats Engine
- **Problem:** BigQuerys `swehockey_player_stats`-tabell visade sig endast innehålla ligans topp-25 poängplockare, vilket resulterade i att de flesta av Björklövens spelare saknades.
- **Lösning:** Backend skannar nu hela den aktiva Silly Season-truppen (`SILLY_SEASON_BASELINE["roster"]`) samt nyförvärv och förluster. För spelare utanför topp-25 beräknas stats (mål, assist, poäng) dynamiskt genom att summera alla registrerade matchhändelser från `swehockey_game_events`.

### 2. Robust Token-baserad Namnmatchning
- **Problem:** Skillnader i namnformat (Efternamn, Förnamn i BQ vs Förnamn Efternamn i Silly), trasig teckenkodning (t.ex. `\ufffd` istället för svenska bokstäver), samt trailing penalty-etiketter (`Pos`, `Abuse`, etc.) förhindrade matchning.
- **Lösning:** Implementerade en avancerad namnmatchare (`match_player`) som rensar unicode-ersättningar, normaliserar svenska tecken (`ö` -> `o`, etc.), strippar utvisnings-suffix och utför en token-överlapps-jämförelse oavsett namnordning.

### 3. Exkludering av Bekräftade Förluster
- **Problem:** Spelare som officiellt lämnar truppen (t.ex. Liam Dower-Nilsson till Frölunda, Olle Eriksson Ek till Jokerit) visades fortfarande i framtidsprojekteringen.
- **Lösning:** Systemet korskör nu spelare mot listan över bekräftade förluster (`confirmed_departures`) med hjälp av den robusta namnmatcharen, och exkluderar dem med 100 % precision från alla SHL Transition-beräkningar.

### 4. Nyförvärvs-Overrides (Tuning av SHL Readiness)
- **Problem:** Nyförvärv från andra ligor (t.ex. Lucas Wallmark från Schweiz/NL, Topi Niemelä från Malmö/SHL) har ingen historik i Allsvenskan förra säsongen och fick felaktigt 0.00 PPG samt flaggades som "Kvalitetsrisk" (Röd).
- **Lösning:** Implementerat en expertbaserad override-mekanism (`signings_overrides`) som mappar nyförvärv till deras verkliga klass:
  - **Lucas Wallmark:** Sätts till **0.85 proj. SHL PPG** (Grön - `SHL-Elit`).
  - **Topi Niemelä:** Sätts till **0.35 proj. SHL PPG** (Gul - `SHL-Bredd`).
  - Nyförvärv markeras med en snygg `🆕`-emoji direkt i namnfältet så att sportchefen direkt ser varför siffrorna skiljer sig.

### 5. Stenhård Ligasegregering
- **Problem:** SHL-lag läckte in i simulerings- och slutspelstabellerna för HockeyAllsvenskan.
- **Lösning:** Alla BQ-frågor i analytics-funktionen är nu strikt parametriserade med `season_group_id` och filtrerar enbart på den allsvenska grundserien (`ha_2526`), vilket säkerställer 100 % renlighet.
