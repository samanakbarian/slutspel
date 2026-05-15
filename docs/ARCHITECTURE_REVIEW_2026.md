# Arkitekturgranskning & Datamodell — Maj 2026

Senast uppdaterad: 2026-05-11

## Sammanfattning

Målarkitekturen står fast. Vi har nu gått från plan till första implementation i backend:

- dbt-lager för `staging`, `marts/core` och `serving` är etablerat
- kritiska fact-tabeller enligt prioriteringslistan är skapade som modeller
- serving-vyer för API finns på plats

Detta dokument är styrande målbild. Faktisk implementation och status finns i:

- [ARCHITECTURE_IMPLEMENTATION_2026_05.md](/abs/path/c:/Users/saman/loven-stats-backend/docs/ARCHITECTURE_IMPLEMENTATION_2026_05.md)
- [DATA_WAREHOUSE_DESIGN.md](/abs/path/c:/Users/saman/loven-stats-backend/docs/DATA_WAREHOUSE_DESIGN.md)

## Målarkitektur

```text
DATAKÄLLOR
  ├─ Sportradar (live events)
  ├─ EliteProspects (kontrakt)
  ├─ Web Scrapers (nyheter)
  └─ Manuell Baseline (silly season)
        │
        ▼
INGESTION / ORCHESTRATION
  ├─ Cloud Scheduler
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
  ├─ raw_*              källnära/external
  ├─ loven_staging      dbt views
  ├─ loven_marts        facts + dims
  ├─ loven_ai           xG, sentiment, impact, scouting
  └─ loven_serving      API-optimerade tabeller/vyer
        │
        ▼
SERVING / CACHE
  ├─ Firestore (snabba produktvyer)
  ├─ Redis/Memorystore (senare)
  └─ Materialized views / precomputed cards
        │
        ▼
CLOUD RUN API (FastAPI/Express)
  ├─ /api/silly-season
  ├─ /api/v1/lovenlaget
  ├─ /api/v1/matches
  ├─ /api/v1/roster
  └─ /api/v1/insights
        │
        ▼
FRONTEND
  └─ Firebase Hosting / React / Vite / TypeScript

OBSERVABILITY (parallellt)
  ├─ Cloud Logging
  ├─ Cloud Monitoring
  ├─ Error Reporting
  ├─ dbt tests
  └─ ingestion/data quality logs
```

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

Not: “klar” här betyder modell definierad i dbt. Datatillförsel och full produktionskörning beror på att motsvarande råtabeller fylls kontinuerligt.

### API-princip (inte mini-BI)

Serving-lager etablerat med:

- `serving_silly_season_feed`
- `serving_roster_overview`
- `serving_match_summary`
- `serving_team_economy_dashboard`

Kvar: koppla API-endpoints fullt ut mot `serving_*` i stället för äldre ad hoc-logik.

### Data quality

Grundläggande tester tillagda (`not_null`, `unique`, `accepted_values`) i `marts/core` och `serving`.

Kvar: relations- och freshness-tester per källa samt driftlarm.

## Kvarvarande gap

1. Orchestration-härdning
- Scheduler-kedja för hela flödet behöver färdigställas och valideras.

2. Råtabeller och ingestion
- `raw_sports.*`, `raw_roster.*`, `raw_financials.*` behöver vara komplett fyllda och versionshanterade.

3. Cache-lager
- Firestore/Redis ej implementerat i produktflödet ännu.

4. Observability
- Samlat `etl_run_log`/`api_request_log` och tydliga data quality-signaler saknas ännu.

## Nästa arbetsordning

1. Aktivera och verifiera råtabeller i BigQuery.
2. Kör `dbt run` + `dbt test` i CI/dbt Cloud för nya modeller.
3. Flytta API-läsningar till `serving_*`.
4. Lägg in freshness- och relationships-tester.
5. Inför cache- och observability-lager.
