# Multi-Season-stöd — Implementationsplan

Skapad: 2026-05-18

## Bakgrund

Alla season-IDs (18266, 19979) är idag hardkodade i tre lager: scraper, API och frontend.
När HA 26/27 startar (september 2026) behöver vi kunna:

1. Lägga till en ny säsongs data utan att förlora gammal
2. Byta vilken säsong som visas i frontenden
3. Ha en "aktiv/default"-säsong som väljs automatiskt

## Nuläge — Hardkodade säsongs-IDs

```
Fil                                         Rad(er)    Vad
─────────────────────────────────────────────────────────────────
scrapers/swehockey/bq_loader.py             30-31      TOURNAMENT_REGULAR = 18266
                                                       TOURNAMENT_PLAYOFF = 19979
scrapers/swehockey/reload_full.py           14-15      Samma konstanter
api/main.py (statistics)                    88         HA_REGULAR = 18266, HA_PLAYOFF = 19979
api/main.py (analytics)                     215-216    WHERE season_group_id = 18266
frontend_v2/src/pages/Statistics.tsx         —          "HockeyAllsvenskan 2025/26" (text)
```

## Proposed Changes

### 1. BigQuery: Ny `seasons`-konfigurationstabell

#### [NEW] `raw_sports.swehockey_seasons`

| Kolumn | Typ | Exempel |
|--------|-----|---------|
| `season_key` | STRING PK | `ha_2526` |
| `season_name` | STRING | `HockeyAllsvenskan 2025/26` |
| `league` | STRING | `HA` |
| `regular_season_id` | INTEGER | `18266` |
| `playoff_id` | INTEGER | `19979` |
| `start_date` | DATE | `2025-09-19` |
| `end_date` | DATE | `2026-03-15` |
| `is_active` | BOOLEAN | `true` |

> [!TIP]
> Sätts manuellt via en enkel JSON-fil eller SQL INSERT. Behöver inte automatiseras — säsonger byts 1-2 gånger/år.

Ny säsong registreras genom att:
1. Lägga till en rad i tabellen med nya Swehockey season_group_ids
2. Sätta `is_active = true` på den nya, `false` på den gamla

---

### 2. Scraper/Loader: Parametriserad season-config

#### [MODIFY] `scrapers/swehockey/bq_loader.py`

```diff
- TOURNAMENT_REGULAR = 18266
- TOURNAMENT_PLAYOFF = 19979
+ # Hämta aktiv säsong från BQ
+ def get_active_season():
+     client = bigquery.Client(project=PROJECT_ID)
+     row = next(client.query(
+         "SELECT * FROM `{}.raw_sports.swehockey_seasons` WHERE is_active = TRUE LIMIT 1"
+     ).result())
+     return {"regular": row["regular_season_id"], "playoff": row["playoff_id"], "key": row["season_key"]}
```

Alternativt: läsa från en lokal `seasons.json`-fil som versionshanteras i git.

---

### 3. Backend API: Query-parameter `?season=`

#### [MODIFY] `api/main.py`

```python
@app.get("/api/v1/statistics")
def get_statistics(season: str = None):
    # Om season ej angiven → hämta aktiv säsong från BQ
    # Om angiven → slå upp season_key → regular_id, playoff_id
    active = lookup_season(season)  # → {regular: 18266, playoff: 19979, name: "..."}
    
    # Ersätt alla hardkodade IDs
    HA_REGULAR = active["regular"]
    HA_PLAYOFF = active["playoff"]
    ...

@app.get("/api/v1/analytics")
def get_analytics(season: str = None):
    active = lookup_season(season)
    # Alla queries filterar med active["regular"]
    ...
```

#### [NEW] Intern helper: `lookup_season()`

```python
# Cache BQ-anropet (säsonger ändras sällan)
_season_cache = {}

def lookup_season(season_key=None):
    if season_key and season_key in _season_cache:
        return _season_cache[season_key]
    
    bq = bigquery.Client(project=BQ_PROJECT_ID)
    if season_key:
        query = f"SELECT * FROM `{bq.project}.raw_sports.swehockey_seasons` WHERE season_key = '{season_key}'"
    else:
        query = f"SELECT * FROM `{bq.project}.raw_sports.swehockey_seasons` WHERE is_active = TRUE LIMIT 1"
    
    row = next(bq.query(query).result())
    result = {
        "key": row["season_key"],
        "name": row["season_name"],
        "regular": row["regular_season_id"],
        "playoff": row["playoff_id"],
    }
    _season_cache[result["key"]] = result
    return result
```

#### [NEW] Endpoint: `GET /api/v1/seasons`

Returnerar alla tillgängliga säsonger för frontendval:

```json
{
  "seasons": [
    {"key": "ha_2526", "name": "HockeyAllsvenskan 2025/26", "is_active": true},
    {"key": "ha_2627", "name": "HockeyAllsvenskan 2026/27", "is_active": false}
  ],
  "active": "ha_2526"
}
```

---

### 4. Frontend: Säsongsväljare

#### [MODIFY] `frontend_v2/src/pages/Statistics.tsx`

```diff
+ const [seasons, setSeasons] = useState([]);
+ const [selectedSeason, setSelectedSeason] = useState('');
+
+ useEffect(() => {
+   fetch(`${API_URL}/api/v1/seasons`)
+     .then(r => r.json())
+     .then(d => { setSeasons(d.seasons); setSelectedSeason(d.active); });
+ }, []);

  // I headern, bredvid datumstämpeln:
+ <select value={selectedSeason} onChange={e => setSelectedSeason(e.target.value)}>
+   {seasons.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}
+ </select>

  // Alla API-anrop inkluderar season:
- fetch(`${API_URL}/api/v1/statistics`)
+ fetch(`${API_URL}/api/v1/statistics?season=${selectedSeason}`)
```

> [!IMPORTANT]
> Designmässigt bör väljaren vara diskret — en liten dropdown i headern bredvid datumstämpeln, inte en stor komponent. Default bör alltid vara aktiv säsong.

---

### 5. Data-isolering vid ny säsong

Vid säsongsstart HA 26/27:

1. Hitta nya `season_group_id`-värden på `stats.swehockey.se` (ändras varje säsong)
2. Lägg till ny rad i `swehockey_seasons`: `ha_2627, regular=XXXXX, playoff=YYYYY, is_active=true`
3. Sätt `is_active=false` på `ha_2526`
4. Kör scraper + loader → ny data hamnar med rätt `season_group_id`
5. Gammal data **behålls** i BQ — tillgänglig via `?season=ha_2526`

> [!NOTE]
> Ingen data raderas. Alla säsonger samexisterar i BQ, filtrerade via `season_group_id`.

---

## Beröringspunkter — komplett lista

| # | Fil | Ändring | Komplexitet |
|---|-----|---------|-------------|
| 1 | BQ: `raw_sports.swehockey_seasons` | Ny tabell (5-6 rader SQL) | Låg |
| 2 | `scrapers/swehockey/bq_loader.py` | Hämta season från config | Låg |
| 3 | `scrapers/swehockey/reload_full.py` | Samma | Låg |
| 4 | `api/main.py` — `get_statistics()` | `?season=` param + `lookup_season()` | Medium |
| 5 | `api/main.py` — `get_analytics()` | `?season=` param | Medium |
| 6 | `api/main.py` — `lookup_season()` | Ny helper + cache | Låg |
| 7 | `api/main.py` — `GET /api/v1/seasons` | Ny enkel endpoint | Låg |
| 8 | `frontend_v2/src/pages/Statistics.tsx` | Season-dropdown + param i fetch | Låg |
| 9 | `frontend_v2/src/components/AnalyticsTabs.tsx` | Acceptera `season` prop | Låg |

**Estimerad arbetsinsats:** 2-3 timmar.

## Verification Plan

### Automated Tests
- Verifiera att `/api/v1/seasons` returnerar korrekt JSON
- Verifiera att `/api/v1/statistics?season=ha_2526` returnerar 25/26-data
- Verifiera att `/api/v1/statistics` (utan param) returnerar aktiv säsong
- `npm run build` lyckad

### Manual Verification
- Byta säsong i frontend-dropdown och se att all data ändras
- Verifiera att gammal säsongsdata fortfarande är tillgänglig
