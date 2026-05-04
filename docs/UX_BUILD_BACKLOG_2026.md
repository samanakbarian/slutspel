# UX Build Backlog 2026 - Frontend V2

Senast uppdaterad: 2026-05-04  
Scope: `slutspel/frontend_v2/`  
Styrs av: `docs/UX_REBUILD_2026.md`

## Mal

Ga fran nuvarande frontendstruktur till en mobil-forst upplevelse enligt "Lovenlaget":
- panikniva forst
- "vad betyder det?" i varje signal
- djupanalys pa klick

## Byggordning (MVP -> v1)

## Block A - App Shell och navigation (MVP)
Prioritet: P0

Leverabler:
- ny mobil bottom nav: `Laget | Trupp | Rykten | Ekonomi | Mer`
- enkel topbar med titel, sasong, freshness
- enhetlig page container och kortgrid

Definition of Done:
- nav funkar pa mobil och desktop
- max 5 toppnivaer i navigationen
- freshness visas globalt

## Block B - Laget (startsida, panikniva forst)
Prioritet: P0

Leverabler:
- `ReadinessCard` (score + kort dom)
- `CriticalNowCard` (3 viktigaste signaler)
- `LatestImpactCard` (nyhet/rykte + "det betyder")
- `SquadStatusCard` (MV/Backar/Center/FW med statusfarg)
- `EconomyRiskCard` (riskniva + nyckelfraga)

Definition of Done:
- sidan kan lasas pa 10 sekunder i mobil
- forsta viewporten visar viktigaste signalerna
- varje kort svarar pa "vad betyder det?"

## Block C - Rykten med impacttolkning
Prioritet: P0

Leverabler:
- lista med `ImpactCard` per rykte/nyhet
- tydlig impactniva (lag/medel/hog)
- status (bekraftat/obekraftat)
- plus/minus och konsekvenstext

Definition of Done:
- varje item har `Nyhet`, `Impact`, `Det betyder`, `Nasta fraga`
- sortering pa vikt (inte bara tid)

## Block D - Trupp med lucklogik
Prioritet: P1

Leverabler:
- positionsvyer med statusfarg
- kort for kritiska luckor och belastningsrisk
- tydlig atgardsrad per lucka

Definition of Done:
- anvandare ser direkt var lagbygget ar tunt
- inga tabeller kravs for grundinsikt

## Block E - Ekonomi med riskradar och scenarier
Prioritet: P1

Leverabler:
- riskradar i sammanfattad form
- trendkort med SHL-gap
- scenario light (pressad/bas/optimistisk)

Definition of Done:
- ekonomioversikt forstas utan att lasa lang text
- tydlig markering av datakvalitet/freshness

## Block F - Djupanalys-lager (drilldown)
Prioritet: P2

Leverabler:
- drilldownpaneler for:
  - fore/efter
  - rollpaverkan
  - tappad produktion
  - kontraktslage
  - ekonomisk paverkan
- lanka fran startsignal -> relevant djupkort

Definition of Done:
- inga djupdetaljer pa startsidan
- djup finns pa 1 klick fran signal

## Designsystem (minimum)

Komponenter som maste finnas tidigt:
1. `TopbarStatus`
2. `BottomNav`
3. `StatusPill`
4. `SignalCard`
5. `ImpactCard`
6. `FreshnessBar`
7. `RiskBadge`

Tokenriktning:
- bakgrund: nastan svart / morkgron
- status: gron/gul/rod
- neutral statistik: isbla
- hog kontrast i rubriker och siffror

## Datakontrakt som krav pa backend

Frontend v2 blockerar pa:
1. `freshness_status`
2. `source_updated_at`
3. `schema_version`
4. konsekvent `meta` i alla primara endpoints

Utan detta: visa fallback/stale, inte tyst fail.

## Sprintupplagg (6 veckor)

Vecka 1-2:
- Block A + Block B

Vecka 3-4:
- Block C + Block D

Vecka 5:
- Block E

Vecka 6:
- Block F + polish + hardening

## Acceptansmatning for UX-rebuild

- 80% av testanvandare kan svara pa "vad ar viktigast just nu?" inom 10 sek
- 0 kritiska UI-fel i huvudfloden Laget/Trupp/Rykten/Ekonomi
- alla huvudvyer visar freshness och datastatus
- inga huvudsiffror hardkodade i UI
