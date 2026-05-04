# 🧭 Produktroadmap 2026 — Löven Stats Hub

*Senast uppdaterad: 2026-05-04*

## Roadmap-princip
Tekniska milstolpar ska översättas till fan-nytta. Exempel:
- `fact_match_events` => Matchens puls, farliga lägen, AI-periodrapport.
- `/api/v1/roster` => Truppbygget, SHL Readiness, rollhål.
- Silly season scraper => Vad betyder ryktet?, tappad produktion, fit score.

## Fas 1 — Maj–Juni 2026 (Grundläggning)
**Produktmål:** första versionen av Truppbygget.

### Prioriterat
- Artikeltyper: tapp, nyförvärv, förlängning, rykte, ekonomi, organisation, skada, kontrakt.
- Spelar-impact-schema (spelare, position, status, impactnivå, tappad produktion/istid, rollpåverkan).
- Impact Cards v1 + “Vad betyder detta?”-tolkning.
- Auto-refresh var 5:e minut.
- Truppstatus light.
- SHL Readiness Score v0.
- Visualisering av truppluckor: 🔴 kritisk, 🟡 bevaka, 🟢 starkt.

### Löven Intelligence Layer (datalager)
Planerade marts:
- `mart_roster_status`
- `mart_player_impact`
- `mart_team_readiness`
- `mart_silly_season_impact`
- `mart_economy_scenarios`

## Fas 2 — Juni–Augusti 2026 (Frontend 2.0)
**Produktmål:** bygga startsidan **Dagens Lövenläge**.

### Startsida
- Hero + Snabba statuskort (Readiness, Truppstatus, Silly Season, Ekonomirisk).
- Dagens Lövenläge i 3–5 bullets.
- Truppbygget, Silly Season Radar, Ekonomikollen light, nästa viktiga datum.

### Komponenter (designsystem v0)
`AppShell`, `TopHero`, `DailyBriefing`, `InsightCard`, `ScoreRing`, `StatusBadge`, `ImpactCard`, `RosterGapCard`, `EconomyRiskCard`, `SponsorStrip`, `BottomNav`, `SectionHeader`.

### UX-princip
Mobil först. UI ska kännas som mörk sportstudio + supporterprodukt, inte admin-dashboard.

## Fas 3 — September 2026 (SHL Go-Live)
**Produktmål:** Matchcenter som förklarar matchens puls.

- Momentumindikator
- AI-periodrapport
- Farliga lägen-vy (inkl. xG paketerat begripligt)
- Matchens tre nycklar
- Efter match: “Det här avgjorde”

## Fas 4 — Oktober 2026+
**Produktmål:** analysplattform för historik, projektioner och ekonomiscenarier.

- AI-scouting reports
- Historik & Tidsmaskin
- Supporter Pulse / sentiment
- Ekonomiscenarier

## Rekommenderad byggordning (nästa 1–2 veckor)
1. Ny startsida: Dagens Lövenläge
2. `InsightCard`
3. `ImpactCard`
4. Artikeltyp-klassificering
5. “Vad betyder detta?” för silly season
6. Truppstatus light
7. SHL Readiness Score v0
8. Auto-refresh


## Fas 5 — Etablerad SHL-klubb och långsiktig konkurrenskraft
**Produktmål:** utveckla produkten från etableringskontrollrum till kontrollrum för långsiktig sportslig och ekonomisk konkurrenskraft.

### Nya huvudfrågor
- Hur konkurrenskraftigt är laget jämfört med SHL-snittet och SHL-toppen?
- Vad krävs för att nå och stanna i slutspel?
- Vilka spelare driver utvecklingen, nu och på 2–3 års sikt?
- Får klubben ut rätt effekt av spelarbudgeten?
- Är truppen byggd hållbart över flera säsonger?

### Nya produktmoduler
- **Competitive Index**: mål framåt/bakåt, special teams, farliga lägen/xG, budgeteffektivitet, truppålder, kontraktsstabilitet.
- **Playoff Push**: sannolikhet för play-in/kvartsfinal/semifinal/final baserat på tabelläge, form och återstående schema.
- **Value for Money**: poäng/mål/xG i relation till budgetnivå och tabellplacering relativt resurser.
- **Squad Lifecycle**: peak-age, veteranrisk, utvecklingsspelare, utgående kontrakt, generationsväxling.
- **Talent Pipeline**: juniorer, utlånade, prospects och lokala spelare som kan bli framtida A-lagskärna.
- **Dynasty Builder**: gap till topp-6/titelutmaning och vilka investeringar som ger störst effekt.

### UI-justering efter etablering
Startsidan byter huvudfråga från **"Är vi redo för SHL?"** till **"Tar vi nästa steg?"** och prioriterar tabelläge, slutspelschans, form, Competitive Index och ekonomisk hållbarhet.
