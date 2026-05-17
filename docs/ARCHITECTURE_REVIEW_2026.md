# Arkitekturgranskning & Datamodell — Maj 2026

Senast uppdaterad: 2026-05-18

## Sammanfattning

Målarkitekturen står fast. Sedan senaste granskningen har **Swehockey-datalagret** fyllts, API:et utökats med avancerad statistik, och frontenden berikats med interaktiva visualiseringar.

Senaste förändringar:

- **raw_sports fullständigt ifyllt:** 5 tabeller med komplett spelar-, målvakts-, schema-, tabell- och per-match-eventdata
- **Analytics API:** Ny `/api/v1/analytics` med 10 beräknade analysmoduler (timeline, splits, H2H, PP/PK, etc.)
- **Frontend Analytics:** Ny "Analys"-tab med Recharts-baserade visualiseringar (poängkurva, periodstaplar, scatter, radar)
- **Data Integrity:** SHL-kontaminering rensad, standings omberäknade, all data verifierad mot källa

**Känd arkitekturlucka:** Multi-season-stöd saknas. Alla season-IDs (18266/19979) är hardkodade i API och loader. Se separat plan: `MULTI_SEASON_PLAN.md`.

Detta dokument är styrande målbild. Faktisk implementation och status finns i:

- [ARCHITECTURE_IMPLEMENTATION_2026_05.md](file:///c:/Users/saman/loven-stats-backend/docs/ARCHITECTURE_IMPLEMENTATION_2026_05.md)
- [DATA_WAREHOUSE_DESIGN.md](file:///c:/Users/saman/loven-stats-backend/docs/DATA_WAREHOUSE_DESIGN.md)

## Målarkitektur

```text
DATAKÄLLOR
  ├─ Sportradar (live events)
  ├─ Swehockey (scraper → stats, schema, events)   ← AKTIV
  ├─ EliteProspects (kontrakt)
  ├─ Web Scrapers (nyheter)
  └─ Manuell Baseline (silly season)
        │
        ▼
INGESTION / ORCHESTRATION
  ├─ Cloud Scheduler (varannan timme)
  ├─ Cloud Run Jobs / Cloud Functions
  ├─ Pub/Sub
  └─ GitHub Actions / dbt Cloud
        │
        ▼
GCS RAW DATA LAKE
  ├─ raw/sportradar/
  ├─ raw/eliteprospects/
  ├─ raw/content/
  └─ raw/manual/
        │
        ▼
BIGQUERY
  ├─ raw_sports              Swehockey-data (5 tabeller, ~1400 rader)
  ├─ raw_sportradar          Sportradar matchdata (200 summaries)
  ├─ raw_content             Skrapade artiklar
  ├─ loven_staging           dbt views (Sportradar)
  ├─ loven_staging_marts     dim_matches, dim_teams, dim_seasons
  ├─ loven_marts             facts + dims (dbt)
  ├─ loven_ai                xG, sentiment, impact, scouting
  └─ loven_serving           API-optimerade tabeller/vyer
        │
        ▼
SERVING / CACHE
  ├─ Firestore (snabba produktvyer) — ej implementerat
  ├─ Redis/Memorystore (senare)
  └─ Materialized views / precomputed cards
        │
        ▼
CLOUD RUN API (FastAPI)
  ├─ /api/v1/statistics      Tabell, spelare, målvakter, matcher
  ├─ /api/v1/analytics       Avancerade analyser (10 moduler)   ← NY
  ├─ /api/v1/lovenlaget      Lövenläget-snapshot
  ├─ /api/silly-season       Silly Season-data
  └─ /api/v1/x-feed          X/Twitter-feed
        │
        ▼
FRONTEND (React/Vite/TypeScript → Netlify)
  ├─ /statistik              5 tabbar: Översikt, Poäng, Målvakter, Matcher, Analys
  ├─ /laget                  Lövenläget-dashboard
  ├─ /silly-season           Transferfönster
  └─ /ekonomi                Klubbekonomi

OBSERVABILITY (parallellt)
  ├─ Cloud Logging
  ├─ Cloud Monitoring
  ├─ Error Reporting
  ├─ dbt tests
  └─ ingestion/data quality logs
```

## BigQuery — Aktuellt datainnehåll (2026-05-18)

### raw_sports (Swehockey — aktiv datakälla)

| Tabell | Rader | Kolumner | Beskrivning |
|--------|-------|----------|-------------|
| `swehockey_player_stats` | 50 | 15 | Spelarstatistik (inkl. position, PPG, tröjnr) |
| `swehockey_goalie_stats` | 29 | 19 | Målvakter (inkl. SO, W, L, V%) |
| `swehockey_schedule` | 366 | 14 | Alla HA-matcher (inkl. period_results, venue, spectators) |
| `swehockey_standings` | 14 | 12 | Beräknad tabellställning |
| `swehockey_game_events` | 972 | 17 | Per-match mål + utvisningar (52 BJK-matcher) |

Alla tabeller har `season_group_id` för säsongsfiltrering. Aktuella IDs:
- **18266** = HockeyAllsvenskan 2025/26 grundserie
- **19979** = HockeyAllsvenskan 2025/26 slutspel

### loven_staging_marts (Sportradar via dbt)

| Tabell | Rader | Beskrivning |
|--------|-------|-------------|
| `dim_matches` | 199 | Matcher med strukturerade period_scores |
| `dim_teams` | 14 | HA-lag med Sportradar-IDs |
| `dim_seasons` | 1 | "Allsvenskan 25/26" |

### raw_sportradar

| Tabell | Rader | Beskrivning |
|--------|-------|-------------|
| `summaries` | 200 | Rå Sportradar JSON (nested sport_event + status) |

## API-endpoints — aktiva

| Endpoint | Källa | Caching | Beskrivning |
|----------|-------|---------|-------------|
| `/api/v1/statistics` | raw_sports.* | Ingen | Tabell, spelare, målvakter, matcher |
| `/api/v1/analytics` | raw_sports.* | Ingen | 10 analysmoduler (beräknas vid request) |
| `/api/v1/lovenlaget` | Heuristik + raw_content | GCS | Lövenläget-snapshot |
| `/api/silly-season` | GCS + baseline | GCS | Silly Season-data |
| `/api/v1/x-feed` | GCS-cache | 30min | X/Twitter-integration |

## Implementationsstatus mot specifikationen

### Prioriterade tabeller

1. `fact_event_players` — klar (dbt-modell skapad)
2. `fact_roster_status` — klar (dbt-modell skapad)
3. `fact_match_lineup` — klar (dbt-modell skapad)
4. `fact_content_items` — klar (dbt-modell skapad)
5. `fact_goalie_game_stats` — klar (dbt-modell skapad)
6. `fact_team_standings_snapshot` — klar (dbt-modell skapad)
7. `fact_shot_features` — klar (dbt-modell skapad)
8. `fact_team_financials` — klar (dbt-modell skapad)
9. `fact_attendance` — klar (dbt-modell skapad)

Not: "klar" betyder modell definierad i dbt. Datatillförsel beror på upstream-källor.

### API-princip (inte mini-BI)

Serving-lager etablerat med:

- `serving_silly_season_feed`
- `serving_roster_overview`
- `serving_match_summary`
- `serving_team_economy_dashboard`

Kvar: koppla API-endpoints fullt ut mot `serving_*` i stället för ad hoc raw_sports-queries.

### Data quality

Grundläggande tester tillagda (`not_null`, `unique`, `accepted_values`) i `marts/core` och `serving`.

Kvar: relations- och freshness-tester per källa samt driftlarm.

## Kvarvarande gap

1. **Multi-season-stöd** ⚠️ PRIORITERAT
   - Season-IDs hardkodade i API och scraper
   - Ingen säsongsväljare i frontend
   - Se plan: `MULTI_SEASON_PLAN.md`

2. Orchestration-härdning
   - Scheduler-kedja för hela flödet behöver färdigställas och valideras.

3. Råtabeller och ingestion
   - `raw_roster.*`, `raw_financials.*` behöver fyllas.
   - `raw_sports.*` ✅ komplett för HA 25/26.

4. Cache-lager
   - Firestore/Redis ej implementerat i produktflödet ännu.

5. Observability
   - Samlat `etl_run_log`/`api_request_log` och tydliga data quality-signaler saknas ännu.

## Nästa arbetsordning

1. **Implementera multi-season-stöd** (se MULTI_SEASON_PLAN.md)
2. Kör `dbt run` + `dbt test` i CI/dbt Cloud för nya modeller.
3. Flytta API-läsningar till `serving_*`.
4. Lägg in freshness- och relationships-tester.
5. Inför cache- och observability-lager.
