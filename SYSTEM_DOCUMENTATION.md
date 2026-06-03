# ðŸ“š LÃ¶ven Stats Hub â€” Systemdokumentation & Master Plan

*Senast uppdaterad: 2026-05-18 (inkl. tvÃ¥lÃ¤gesvision: etablering + lÃ¥ngsiktig konkurrenskraft)*  
*Detta dokument utgÃ¶r den officiella tekniska dokumentationen fÃ¶r systemet samt "Master Planen" fÃ¶r hela LÃ¶ven Stats Hub.*

---

## 1. Vision & AffÃ¤rsmodell

- **KÃ¤rnsyfte:** Att bygga Sveriges smartaste och snyggaste community-plattform fÃ¶r IF BjÃ¶rklÃ¶vens supportrar.
- **AnvÃ¤ndarlÃ¶fte:** Alltid 100 % gratis fÃ¶r fansen.
- **Kontext:** BjÃ¶rklÃ¶ven vann HockeyAllsvenskan 25/26 och spelar i SHL frÃ¥n sÃ¤songen 26/27.
- **Monetisering (pÃ¥ sikt):** 
  - "Native" sponsring frÃ¥n lokala UmeÃ¥-fÃ¶retag (snyggt integrerat i Dark Mode-UI:t).
  - B2B-licensiering av datadrivna widgets till lokalmedia (ex. VK).
  - Relevanta affiliate-lÃ¤nkar (t.ex. boka bord pÃ¥ O'Learys infÃ¶r match).

---


## 1.1 Produktvision Ã¶ver tid

Produkten har nu tvÃ¥ explicita visionslÃ¤gen:

- **Fas A â€” Uppflyttning och etablering**: fokus pÃ¥ SHL-readiness, truppbehov och ekonomisk etablering.
- **Fas B â€” LÃ¥ngsiktig konkurrenskraft**: fokus pÃ¥ slutspelschans, sportslig utveckling, budgeteffektivitet, talangpipeline och flerÃ¥rig hÃ¥llbarhet.

Detta dokumenteras i:
- `docs/PRODUCT_DIRECTION_2026.md` (produktdefinition + lÃ¥ngsiktig vision)
- `docs/ROADMAP_PRODUCT_2026.md` (inklusive **Fas 5** fÃ¶r etablerad SHL-klubb)

## 1.2 Roadmap-synk mellan repos

Roadmapen i `slutspel/docs/ROADMAP_PRODUCT_2026.md` och
`loven-stats-backend/docs/ROADMAP.md` ska beskriva samma malbild, faser och prioriteringsordning.
Om de driver isar galler senaste synkade version daterad 2026-05-04 tills ny synk ar gjord.

## 1.3 UX-riktning (frontend)

Styrande UX-spec for ombyggnad av produktupplevelsen:
- `docs/UX_REBUILD_2026.md`

`FRONTEND_2.0_SPECS.md` ar fortsatt relevant for teknik och implementation,
men UX-principer, tonalitet, informationshierarki och mobilflode styrs av `UX_REBUILD_2026.md`.

## 1.4 Dokumenterade arkitekturavvikelser (frontend)

### ADV-2026-05-04-03: Frontend v2 byggs parallellt med legacy-siten

- Beslut: ny produktupplevelse implementeras i `frontend_v2` innan full cutover till GCP-hosting.
- Avvikelse: tidigare lage var en blandning av legacy-UI i root och v2 som separat yta utan ny IA.
- Motiv: snabb produktvalidering av "Lovenlaget" och mobil first-struktur utan att bryta nuvarande publik yta.
- Teknik:
  - ny app-shell i `frontend_v2` (topbar, freshness, bottom nav)
  - startsida "Laget" kopplad till `GET /api/v1/lovenlaget`
- Risk: tillfallig dubbel forvaltningskostnad (legacy + v2).
- Plan for normalisering: v2 blir primar front nar GCP-hosting och endpointkontrakt ar hardade; legacy fryses och avvecklas kontrollerat.

## 2. Repositories

| Repo | InnehÃ¥ll | URL |
|------|---------|-----|
| `slutspel` | Frontend (old + v2), systemdokumentation | [github.com/samanakbarian/slutspel](https://github.com/samanakbarian/slutspel) |
| `loven-stats-backend` | API, scrapers, Cloud Functions, dbt, docs | [github.com/samanakbarian/loven-stats-backend](https://github.com/samanakbarian/loven-stats-backend) |

### Repoansvar for financials just nu

- `slutspel` innehaller den nuvarande ekonomi-PoC:n: statiska financial JSON-filer, visualisering och forberaknad AI-kommentar.
- `loven-stats-backend` ar den framtida permanenta platsen for ingestion, lagring, verifiering, API och produktionssatt financial-logik.

Det betyder att dagens ekonomiflik i `slutspel` ska behandlas som en valideringsyta, inte som slutlig systemdesign.

---

## 3. Ã–vergripande Arkitektur

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                         DATAKÃ„LLOR                                   â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ Sportradar   â”‚ EliteProsp.  â”‚ Web Scrapers â”‚ Manuell Baseline       â”‚
â”‚ (live events)â”‚ (kontrakt)   â”‚ (nyheter)    â”‚ (silly season)         â”‚
â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
       â”‚              â”‚              â”‚              â”‚
       â–¼              â–¼              â–¼              â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                    GCS DATA LAKE (raw JSON)                          â”‚
â”‚  raw/sportradar/  raw/eliteprospects/  raw/silly_season/  raw/...  â”‚
â”‚  Bucket: loven-stats-raw-data-prod                                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
                               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                        BIGQUERY                                      â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”         â”‚
â”‚  â”‚ raw_sportradar â”‚  â”‚ raw_content    â”‚  â”‚ raw_elite...   â”‚ DATASETSâ”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
â”‚          â”‚                   â”‚                   â”‚                   â”‚
â”‚          â–¼                   â–¼                   â–¼                   â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚  â”‚              loven_staging (dbt views)                    â”‚       â”‚
â”‚  â”‚  stg_sr_matches, stg_sr_events, stg_articles, ...       â”‚       â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â”‚                             â”‚                                       â”‚
â”‚                             â–¼                                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚  â”‚         loven_marts (dbt tables, star schema)            â”‚       â”‚
â”‚  â”‚  fact_match_events, fact_player_game_stats,              â”‚       â”‚
â”‚  â”‚  dim_matches, dim_players, dim_teams, dim_contracts, ... â”‚       â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â”‚                             â”‚                                       â”‚
â”‚                             â–¼                                       â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚  â”‚              loven_ai (BigQuery ML + Gemini)             â”‚       â”‚
â”‚  â”‚  xg_model, ai_article_sentiment, ai_player_impact       â”‚       â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
                               â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                      CLOUD RUN (FastAPI)                             â”‚
â”‚  /api/silly-season  /api/v1/matches  /api/v1/roster  /api/v1/...   â”‚
â”‚  URL: https://loven-stats-api-324947473206.europe-west1.run.app    â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                               â”‚
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â–¼                     â–¼
         â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
         â”‚  Frontend (old)  â”‚  â”‚  Frontend 2.0    â”‚
         â”‚  Netlify         â”‚  â”‚  React/Vite/TS   â”‚
         â”‚  Vanilla JS      â”‚  â”‚  Firebase Hostingâ”‚
         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Teknologier

| Lager | Teknologi | Plats |
|-------|-----------|-------|
| **Orkestrering** | Cloud Scheduler + Cloud Workflows | GCP |
| **Extract** | Python Cloud Functions | `functions/` |
| **Data Lake** | Google Cloud Storage (GCS) | `loven-stats-raw-data-prod` |
| **Data Warehouse** | BigQuery | `granskaren-d51a1` |
| **Transformation** | dbt (dbt-bigquery) | `dbt/` |
| **AI/ML** | BigQuery ML + Gemini (Vertex AI) | BigQuery |
| **API** | FastAPI (Python) pÃ¥ Cloud Run | `api/` |
| **Frontend** | React/Vite/TypeScript + Zustand | `slutspel/frontend_v2/` |
| **Styling** | Vanilla CSS med Design Tokens | Dark Mode, glassmorphism |

---

## 4. DatakÃ¤llor

| KÃ¤lla | Typ | Status | Data |
|-------|-----|--------|------|
| **Sportradar** | REST API | âœ… Trial-nyckel | Live-matcher, resultat, tabeller, trupper |
| **EliteProspects** | REST API | â³ BehÃ¶ver nyckel | Spelarprofiler, kontrakt, lÃ¶ner, karriÃ¤rhistorik |
| **Web Scrapers** | Cloud Functions | âœ… Live (var 30 min) | Nyheter frÃ¥n BjÃ¶rklÃ¶ven.com, Expressen, HockeySverige, EP |
| **Manuell Baseline** | JSON i GCS | âœ… | Silly Season-data, kÃ¤nda kontrakt |

### Sportradar-detaljer

| ID | VÃ¤rde |
|----|-------|
| Competition (HA) | `sr:competition:416` |
| Season (HA 25/26) | `sr:season:131137` |
| BjÃ¶rklÃ¶ven Team ID | `sr:competitor:3747` |
| API-nyckel | Env var `SPORTRADAR_API_KEY` |
| Trial-begrÃ¤nsning | 1 req/sek, 1000 req/30 dagar |

---

## 5. GCP-infrastruktur

| Resurs | Typ | Detaljer |
|--------|-----|---------|
| **Projekt** | GCP | `granskaren-d51a1` |
| **Region** | | `europe-west1` |
| **GCS Bucket** | Storage | `loven-stats-raw-data-prod` |
| **loven-stats-api** | Cloud Run | FastAPI, Python 3.11, allow-unauthenticated |
| **silly-season-scraper** | Cloud Functions Gen2 | 1024Mi, 300s timeout, Python 3.11 |
| **sportradar-ingest** | Cloud Functions Gen2 | Python 3.11 (schemalagd) |
| **Cloud Scheduler** | Cron | `*/30 * * * *` (scraper) |

### API-endpoints (Live)

| Endpoint | Beskrivning |
|----------|-------------|
| `GET /api/silly-season` | Silly Season-feed (mergad scraper + baseline) |
| `GET /api/v1/roster` | Trupp (planerad) |
| `GET /api/v1/matches` | Matcher (planerad) |
| `GET /api/v1/standings` | Tabell (planerad) |

### Driftnoter 2026-05-17

- Frontend v2 anvander nu central API-konfig (`frontend_v2/src/config/api.ts`) med skydd mot fel host i prod.
- `useCurrentState` har fallback till legacy `current-state` endpoint om primar API svarar 404.
- Ekonomisidan laser finansiell JSON fran statiska assets pa samma doman:
  - `/data/financials/bjorkloven_financials_raw.json`
  - `/data/financials/bjorkloven_financials_ai.json`
- Lagesidan:
  - tabellblocket ar borttaget
  - ny modul `Lovenpulsen 24h` visas (eller fallback-text om `last_24h` saknas).

---

## 6. Implementationslogg

### 6.1. Silly Season Scraper & Feed (Maj 2026) âœ…
- Scraper i Cloud Functions hÃ¤mtar nyheter frÃ¥n 4 kÃ¤llor var 30:e minut
- Gemini AI klassificerar artiklar (BEKRÃ„FTAT_NYFÃ–RVÃ„RV, BEKRÃ„FTAD_FÃ–RLUST, etc.)
- Konservativ keyword-baserad fallback i API (titelmatchning, ej body)
- GCS-filer namnges med `%Y%m%d_%H%M%S`, sorteras pÃ¥ `blob.updated` timestamp
- Frontend (old + v2) visar live-data

### 6.2. Data Warehouse & dbt (Maj 2026) âœ…
- 6 BigQuery-datasets skapade (`raw_sportradar`, `raw_eliteprospects`, `raw_content`, `loven_staging`, `loven_marts`, `loven_ai`)
- StjÃ¤rnschema designat i `docs/DATA_WAREHOUSE_DESIGN.md`
- StÃ¶djer: Basic stats â†’ Corsi/Fenwick â†’ xG â†’ AI (Gemini)
- Multi-source: Sportradar + EliteProspects + Scrapers
- Multi-league: SHL + HA + J20
- Player ID Crosswalk lÃ¶ser matchning Sportradar â†” EP
- dbt-projekt med Python 3.12 venv (`slutspel/dbt/`)
  - 3 staging-modeller: `stg_sr_matches`, `stg_sr_events`, `stg_sr_standings`
  - 3 mart-modeller: `dim_matches` (199 matcher), `dim_teams` (14 lag), `dim_seasons`
  - 6/6 modeller PASS, 6/6 tester PASS
- RÃ¥data laddad: 200 summaries + 1 timeline + standings â†’ BigQuery

### 6.3. Frontend 2.0 (PÃ¥gÃ¥ende)
- React/Vite/TypeScript med Zustand state management
- Sidor klara: Silly Season (live), Matchcenter (mock), Roster (mock)
- Sidor ej klara: Dashboard, Standings, History
- Se `slutspel/FRONTEND_2.0_SPECS.md` fÃ¶r fullstÃ¤ndig kravspec

### 6.4. Roster-integration & SHL Readiness (Maj 2026) âœ…
- Byggt om spelarmotorn i backend fÃ¶r att berÃ¤kna spelarstatistik helt dynamiskt utifrÃ¥n den fulla truppen via matchhÃ¤ndelser (`swehockey_game_events`).
- Utvecklat en robust token-baserad namnmatchare med unicode-rensning fÃ¶r full kompatibilitet med trasiga tecken i Swehockey-databasen.
- Filtrerat bort alla bekrÃ¤ftade fÃ¶rluster (t.ex. Liam Dower-Nilsson) frÃ¥n SHL-framtidsprojekteringar.
- Skapat en expertbaserad override-mekanism fÃ¶r nyfÃ¶rvÃ¤rv (t.ex. Lucas Wallmark, Topi NiemelÃ¤) fÃ¶r korrekt SHL Readiness-klassificering.



### 6.5. Produktionsincident: tom Statistik/Analys + roster-avvikelser (2026-05-18) ✅

**Symptom i prod**
- Statistik-fliken visade tom oversikt/grundserie/matcher.
- Analys-fliken visade tomma moduler (sasong, impacts, splits, prediktioner).
- Roster-status driftade (ex. Mustonen stod inte som forlangd i vissa vyer).

**Rotorsaker**
- Backend-revision i Cloud Run laggade efter pushad kod (deploy drift).
- Team-matchning i statistik byggde for mycket pa text/token-matchning (kansligt for teckenkodning/namnformat).
- Frontend-cache (`sessionStorage`) kunde ateranvanda ett tidigare "ok men tomt" analytics-svar.
- Sasongsupplosning i statistik-UI gav forvirrande fallback-beteende nar aktiv sasong saknade komplett data.

**Genomforda fixar**
- Backend (`loven-stats-backend`):
  - Forstarkt matchning i `/api/v1/statistics` med `team_id`-baserad filtrering som primar signal.
  - Hardare normalisering av lagstrangar (unicode/mojibake-hantering) som fallback.
  - Fallback-berakning av `record` fran matcher om standings saknas.
  - Uppdaterad baseline for silly/roster:
    - Philip Hemyr tillagd i roster.
    - Joel Mustonen satt till `FORLANGD` med kontrakt t.o.m. 2027.
- Frontend (`slutspel/frontend_v2`):
  - Sasongsväljaren dold igen i statistik-vyn.
  - Statistik-sidan har robust fallback till sasong med faktisk data.
  - Analytics-cache hardad:
    - ny cache-nyckelversion
    - cache ignoreras om payload ar "ok men tom"
    - `no-store` vid analytics-fetch.

**Operativ atgard**
- Manuell redeploy av `loven-stats-api` till Cloud Run (revision `loven-stats-api-00068-crq`) och verifikation mot live-endpoints.

**Verifierat utfall efter fix**
- `/api/v1/statistics`: `team_games` > 0, `record` ifylld, `team_standing` finns.
- `/api/v1/analytics`: `timeline`, `form`, `h2h` fyllda.
- `/api/silly-season`: Mustonen visas som `FORLANGD`.

**Preventiva guardrails framover**
- Infor release-checklista med live-smoke-test av:
  - `/api/v1/statistics`
  - `/api/v1/analytics`
  - `/api/silly-season`
- Larma pa "tom men status=ok" (ex. `team_games == 0` eller `timeline.length == 0`).
- Prioritera stabila nycklar (`team_id`) over textmatchning i alla pipeline-led.

---

## 7. Referensdokumentation

| Dokument | Plats | Beskrivning |
|----------|-------|-------------|
| Systemdokumentation | `SYSTEM_DOCUMENTATION.md` (bÃ¥da repos) | Detta dokument |
| Data Warehouse Design | `loven-stats-backend/docs/DATA_WAREHOUSE_DESIGN.md` | FullstÃ¤ndigt stjÃ¤rnschema |
| Roadmap | `loven-stats-backend/docs/ROADMAP.md` | Fasad plan med milstolpar |
| AffÃ¤rsmodell | `loven-stats-backend/docs/BUSINESS_MODEL.md` | Monetisering & intÃ¤ktsstrÃ¶mmar |
| Frontend 2.0 Spec | `slutspel/FRONTEND_2.0_SPECS.md` | UX/UI-krav och teknisk stack |
| Produktdefinition 2026/27 | `docs/PRODUCT_DIRECTION_2026.md` | Etablering + lÃ¥ngsiktig produktvision |
| Produktroadmap 2026 | `docs/ROADMAP_PRODUCT_2026.md` | Fan-centrisk roadmap, inkl. Fas 5 |




## 7.1 Swehockey Coverage (komplement)

Detaljerad kartläggning finns i `docs/SWEHOCKEY_DATA_COVERAGE_MATRIX.md`.

Nuvarande live-källor i pipeline:
- spelarstatistik
- målvaktsstatistik
- tabell
- schema/matchresultat
- game events
- säsongskonfiguration

Prioriterad utbyggnad:
1. special teams per lag (PP/PK)
2. komplett matchmetadata (arena/publik/periodresultat/tid)
3. fler historiska säsonger (HA + SHL)
4. utökad disciplin/eventklassning
