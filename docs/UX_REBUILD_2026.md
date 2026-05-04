# UX Rebuild 2026 - Lovenlaget

Senast uppdaterad: 2026-05-04  
Status: Styrande UX-spec for redesign

## Produktkansla

Produkten ska kannas som:
- sportredaktions-app
- Football Manager
- borsskarm for Bjorkloven

Inte:
- kommunal BI
- vit SaaS-dashboard
- Excel i webbformat

## North Star (10 sekundersregeln)

Nar anvandaren oppnar mobilen ska den direkt fa svar pa:
1. Vad ar viktigast just nu?
2. Vad betyder det for Loven?
3. Vad bor jag halla koll pa narmast?

Allt centralt pa startsidan ska vara lasbart pa 10 sekunder.

## Visuell riktning

Bakgrund:
- nastan svart
- morkgron
- arenamorker

Kort:
- morka kort
- tunn statuskant per lage

Statusfarger:
- gron: stabilt/lage under kontroll
- gult: bevaka/risk byggs upp
- rod: kritiskt/lucka nu
- isbla: neutral statistik

Typografi:
- stora feta rubriker
- korta meningar
- hog sifferdensitet
- minimal brodtext

Ton:
- supporterdriven
- intensiv
- analytisk
- inte corporate

## Informationsarkitektur (mobil forst)

Bottennavigation:
- Laget
- Trupp
- Rykten
- Ekonomi
- Mer

Regel:
- inga djupa menytrad pa forsta nivan
- inga "14 menyer"

## Startsida: Laget

Ordning uppifran och ner:
1. Topbar: "Lovenlaget", sasong, live/freshness
2. Readiness Snapshot: score + kort dom
3. Kritisk Just Nu: 3 tydliga signaler
4. Senaste Impact: senaste ryktet/nyheten med "det betyder"
5. Truppbygget: positionslage (gron/gul/rod)
6. Ekonomikollen: riskniva + nasta nyckelfraga

Startsidan ska prioritera signaler over detaljer.

## Tre analysnivaer

## Niva 1 - Panikniva
"Vad ar viktigast just nu?"  
Visas direkt utan scroll eller med minimal scroll.

## Niva 2 - Vad betyder det
Varje handelse ska ha:
- Nyhet
- Impactniva
- Det betyder
- Nasta fraga

## Niva 3 - Djupanalys
Drilldown ska kunna visa:
- fore/efter
- rollpaverkan
- tappad produktion
- kontraktslage
- jamforbar spelartyp
- ekonomisk effekt
- riskbedomning

## Sprakmodell i UI

Undvik:
- langa neutrala formuleringar
- myndighetston

Anvand:
- korta domar
- tydlig konsekvens
- supporter + analys

Exempelton:
- "Det har gor ont."
- "Bra breddvarvning, men inte spets."
- "Det har flyttar nalen direkt."

## Kortstandarder

## Impact Card (rykte/nyhet)
Maskelement:
- tag (Rykte/Nyhet/Bekraftat)
- rubrik
- impact (Lag/Medel/Hog)
- status (bekraftat/obekraftat)
- plus/minus-punkter
- "Det betyder"

## Trupplucka-kort
Maskelement:
- positionsyta
- statusfarg
- vad som saknas
- riskkonsekvens
- tydlig atgardsrad

## Ekonomikort
Maskelement:
- riskniva
- kostnadstryck
- intaktssida
- SHL-effekt
- "Nyckelfragan"

## Live-kansla och freshness

Varje relevant vy ska visa:
- senast uppdaterad tid
- antal nya signaler sedan senaste period
- senaste plus/senaste risk

Om data ar gammal:
- tydlig stale-indikator
- ingen tyst fail

## Interaktionsprinciper

- Startyta: snabba signaler, inga tunga tabeller
- Klick: alltid till "varfor"
- Djup: forst efter aktivt val
- Mobil forst, desktop sekundart

## Komponentprioritet for redesign

MVP-komponenter:
1. TopbarStatus
2. ReadinessCard
3. CriticalNowCard
4. ImpactCard
5. SquadStatusCard
6. EconomyRiskCard
7. FreshnessBar
8. BottomNav

## Namn och paketering

Primart namn:
- Lovenläget

Arbetsregel:
- i UI och copy prioriteras "Lovenlaget"
- tekniska benamningar som "Stats Hub" anvands internt

## Definition of Done (UX)

En vy ar inte klar forran:
1. den svarar pa en konkret fraga
2. den har tydlig status/freshness
3. den kan forstas pa 10 sekunder i mobil
4. den oversatter data till konsekvens
5. den har tydlig vag till djupanalys

## Galler nu

Denna spec ersatter tidigare vag UX-riktning i frontend 2.0-specen dar konflikt finns.
`FRONTEND_2.0_SPECS.md` far anvandas som komplement for teknikdetaljer, men denna fil styr produktupplevelsen.
