# Roadmap Product 2026 - Gemensam Malbild

Senast uppdaterad: 2026-05-04
Galler for: `slutspel` (PoC + frontend) och `loven-stats-backend` (data + API + drift)

## Varfor denna roadmap

Detta dokument ersatter tidigare splittrade produktspår med en gemensam leveransplan.
Målet ar att vi ska jobba mot samma resultat, med tydlig repo-fordelning och tydliga beslutspunkter.

## North Star 2026/27

Bygg ett gratis, datadrivet kontrollrum for Bjorkloven-fans som vecka for vecka forklarar:
1. vad som har hant
2. varfor det spelar roll
3. hur det paverkar SHL-etableringen sportsligt och ekonomiskt

## Gemensamma mal till SHL-start (september 2026)

1. Silly Season med tillforlitlig live-feed, impact och tydlig kallsparbarhet.
2. Matchcenter med stabil matchdata och begriplig periodanalys.
3. Ekonomikollen med verifierad, flerarsdata och tydliga riskindikatorer.
4. En gemensam API-kontraktsyta som bade old frontend och frontend v2 kan konsumera.

## Produktprinciper (galler bada repor)

- Fan-forsta: varje vy ska svara pa "sa vad betyder det har for Lovens SHL-chans?"
- Data-forst: inga centrala siffror far vara hardkodade i UI.
- Kallsparbarhet: alla kritiska datapunkter ska kunna sparas till kalla/tid.
- Robust drift: stale data ska visas tydligt i UI, aldrig tyst fail.
- PoC-disciplin: `slutspel` validerar UX och hypoteser, `loven-stats-backend` blir produktionskallan.

## UX-styrning (bindande)

UX-riktningen for redesign styrs av:
- `docs/UX_REBUILD_2026.md`

Om den konflikterar med aldre beskrivningar i `FRONTEND_2.0_SPECS.md` galler `UX_REBUILD_2026.md`.

Operativ byggordning for frontend v2:
- `docs/UX_BUILD_BACKLOG_2026.md`

## Leveransfaser

## Fas 0 - Synk och kontrakt (nu)
Mål: Enas om vad som byggs, i vilken ordning, och var ansvaret ligger.

Exit-kriterier:
- Gemensam roadmap i bada repor (detta dokument + backend-roadmap) ar synkade.
- Gemensam API-skiss for `silly`, `matches`, `roster`, `financials` ar beslutad.
- "Definition of Done" ar dokumenterad per modul.

## Fas 1 - Datagrund och stabilisering (maj-juni 2026)
Mål: Saker datafloden och ta bort kritiska driftluckor.

Prioriterade resultat:
- Silly: stabil ingest, metadata for last refresh, fallback i UI, statusindikatorer.
- Roster: forsta riktiga endpoint och cache-strategi.
- Matchdata: grundtabeller + API-bas for matchlista och matchdetalj.
- Financials: verifierad flerarsmodell i backend (minst 3 perioder), tydlig QA-status.

Definition of Done:
- Inga manuella UI-floden kravs for att hamta ny data.
- Stale/failed data markeras explicit i frontend.
- Basendpointar returnerar konsekvent schema och versionerad `meta`.

## Fas 2 - Fan-upplevelse v1 (juni-augusti 2026)
Mål: Leverera sammanhangen upplevelse for supporters.

Prioriterade resultat:
- "Dagens Lovenlage" med 3-5 tydliga bullets.
- Silly impactkort: tapp, nyforvarv, forlängning och roll-gap.
- Matchcenter v1: periodpuls, nyckelhändelser, eftermatchsammanfattning.
- Ekonomikollen v1: trend, riskradar, SHL-gap, scenario light.

Definition of Done:
- Minst en tydlig fan-insikt per modul (silly, match, ekonomi).
- Mobil-forst design ar fungerande pa vanliga viewport-storlekar.
- Frontend visar datakvalitet och senast uppdaterad tid.

## Fas 3 - SHL Go-Live (september 2026)
Mål: Produktionsredo for kontinuerlig anvandning under sasong.

Prioriterade resultat:
- SHL-sasong ingest + uppdateringsintervall under match.
- Matchcenter live utan kritiska datastopp.
- Operativ overvakning: fel, sen data, schemafel.
- Public release-process med rollback-rutin.

Definition of Done:
- Kritiska endpoints har monitoring + larm.
- Frontend har fallback-beteenden dokumenterade och testade.
- Tydlig incidentrutin finns i backend.

## Fas 4 - Konkurrenskraft och analys (oktober 2026+)
Mål: Ga fran etableringskontrollrum till langsiktig konkurrenskraftsplattform.

Prioriterade resultat:
- Competitive Index och playoff-relaterade indikatorer.
- Value-for-money mellan sportslig effekt och ekonomiska resurser.
- Talent pipeline och trupp-livscykel over flera ar.
- Djupare AI-stod i backend, men kostnadskontrollerat och auditbart.

## Repoansvar (skarpt)

`slutspel`:
- UX, visualisering, hypotesvalidering, statisk PoC-publicering.
- Featureflikar, komponenter, states, fallback-upplevelse.
- Ska inte vara source of truth for central data pa sikt.

`loven-stats-backend`:
- Ingestion, QA, lagring, datakontrakt, API, scheduler, monitoring.
- Kallspårbarhet, datakvalitet, versionshantering av schema.
- Ska vara source of truth for produktionsdata.

## 90-dagars plan (konkret)

1. Vecka 1-2:
- Faststall API-kontrakt v1 for `silly`, `matches`, `roster`, `financials`.
- Definiera gemensam "freshness policy" (ex. stale efter 6h/24h per modul).

2. Vecka 3-6:
- Bygg/haarda backend-endpointar for roster + financials.
- Koppla frontend till endpoints med tydliga loading/error/stale-states.

3. Vecka 7-10:
- Leverera Dagens Lovenlage + Matchcenter v1 + Ekonomikollen v1.
- Lagg in instrumentering for kvalitet och anvandning.

4. Vecka 11-12:
- SHL go-live hardening: monitoring, incidentplaybook, release-checklist.

## Beslutsregler

- Om PoC och backend kolliderar: backend-kontrakt vinner.
- Om feature inte forklarar "varfor det spelar roll": den pausas.
- Om data inte ar verifierad: visa tydligt att den ar preliminar.
- Om AI-funktion kostar for mycket i runtime: flytta till forberaknad/offline.

## Mätetal vi styr efter

- Freshness: andel vyer med uppdaterad data inom policy.
- Tillit: andel nyckeltal med kallreferens och verifieringsstatus.
- Stabilitet: frontendfel per 1k sidvisningar.
- Nytta: andel anvandare som interagerar med minst en insiktsmodul per session.

## Direkt nasta arbetsbacklog (start nu)

1. Gemensamt API-kontrakt dokumenterat i backend-docs.
2. Stale-data indikator i Silly, Match och Ekonomi.
3. Financials flyttas stegvis fran statisk PoC-kalla till backend endpoint.
4. Dagens Lovenlage byggs pa samma kontrakt, inte separat dataspår.

## Genomfort (2026-05-04)

- Ny app-shell i `frontend_v2` enligt UX-spec:
  - topbar med freshness
  - mobil bottom nav (`Laget | Trupp | Rykten | Ekonomi | Mer`)
- Startsidan "Laget" ar kopplad till backend endpoint `GET /api/v1/lovenlaget`.
- Avvikelse med parallell drift (legacy + v2) ar dokumenterad i `SYSTEM_DOCUMENTATION.md` under arkitekturavvikelser.
