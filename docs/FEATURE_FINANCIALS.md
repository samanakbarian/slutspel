# Ekonomisk Intelligens - PoC Spec

*Senast uppdaterad: 2026-05-04*  
*Status: Aktiv PoC i `slutspel`*  
*Viktigt: Detta är en demonstrations- och valideringsyta, inte den slutliga produktionslösningen.*

---

## Syfte

Ekonomifliken i `slutspel` är byggd som en snabb PoC för att validera att Björklöven-data från bokslut och årsredovisningar kan:

- struktureras per bokslutsperiod
- visas begripligt för vanliga supportrar
- kompletteras med analys, trend och prognos
- senare flyttas in i det riktiga systemet

PoC:n är uttryckligen till för att testa UX, informationsstruktur och datamodell innan implementation i den permanenta backend- och frontendarkitekturen.

---

## Vad som finns nu

Nuvarande implementation i `slutspel` innehaller:

- lokal financials-kalla i [data/financials/bjorkloven_financials_raw.json](/abs/path/c:/Users/saman/slutspel/data/financials/bjorkloven_financials_raw.json:1)
- förberäknad AI-analys i [data/financials/bjorkloven_financials_ai.json](/abs/path/c:/Users/saman/slutspel/data/financials/bjorkloven_financials_ai.json:1)
- frontendvy i [financial-intelligence.js](/abs/path/c:/Users/saman/slutspel/financial-intelligence.js:1)
- styling i [financial-intelligence.css](/abs/path/c:/Users/saman/slutspel/financial-intelligence.css:1)

PoC:n visar idag:

- flera bokslutsperioder över tid
- A-lag vs koncern
- KPI-kort
- SHL-gap / elitlicensindikator
- trendlinjer
- enkla scenarier
- regelbaserad analys
- kompakt förberäknad AI-kommentar per period

---

## Viktig arkitekturgrans

Detta ar inte den slutliga finansarkitekturen.

I PoC-laget galler:

- datan ligger i statiska JSON-filer i frontend-repot
- analysen laddas direkt i browsern
- AI-kommentaren ar forberaknad och statisk for att undvika dyra runtime-anrop
- deploy sker via GitHub Pages / Netlify som en del av PoC-sajten

I den framtida riktiga losningen ska finansdelen i stallet:

- bo i `loven-stats-backend`
- ha verifierad ingestion av arsredovisningsdata
- lagras i riktig datamodell / warehouse
- exponeras via API
- konsumeras av framtida frontend, inte som lokal JSON i `slutspel`

---

## Varfor statisk AI i PoC:n

Tidigare testades runtime-anrop till Gemini via Netlify Function. Det visade att:

- kostnaden per besokare riskerar att bli for hog
- ekonomifliken blir mer kanslig for externa fel
- publika sidor inte bor vara beroende av ett AI-anrop for grundfunktionalitet

Darfor ar nuvarande PoC medvetet byggd med:

- regelbaserad analys som alltid fungerar
- forberaknad AI-analys som statisk JSON

Detta gor PoC:n:

- billig att drifta
- snabb att ladda
- enkel att deploya
- enkel att demonstrera

---

## Datakallor i PoC:n

Nuvarande PoC-data bygger pa en mix av:

- officiella bokslutskommunikeer fran `bjorkloven.com`
- officiella arsredovisningar / PDF-underlag for vissa ar
- publika bolagsuppgifter dar det varit relevant som komplettering

PoC-filen ar fortfarande ett manuellt kuraterat dataset. Den ska inte ses som slutlig source of truth for framtida produktion.

---

## Begransningar

Det har ar medvetna begransningar i PoC:n:

- ingen automatisk ingestion i produktionskedja
- ingen BigQuery/dbt-koppling for financials an
- ingen riktig API-modell for financials
- AI-analysen ar forberaknad, inte live
- vissa aldre ar har lagre detaljniva an nyare perioder
- dataverifiering ar starkare for vissa perioder an andra

---

## Rekommenderad nasta fas

Nar ekonomifunktionen ska flyttas fran PoC till riktigt system ar rekommenderad riktning:

1. Definiera officiellt financial schema i `loven-stats-backend`.
2. Flytta finansiell kallsanning fran statisk frontend-JSON till backendlagring.
3. Bygg verifierad ingestion per bokslutsperiod.
4. Exponera financials via API.
5. Flytta analyslogik till backend eller batchgenererat analyslager.
6. Lata framtida frontend konsumera samma data som ovriga systemet.

---

## Beslut som ar viktiga att bevara

Foljande beslut fran PoC:n bor tas med in i framtida implementation:

- A-lag och koncern maste hallas isar i datamodellen
- flera bokslutsperioder maste vara forstaklassmedborgare
- SHL/HA-kapitalgap ar en central produktinsikt
- analys far inte vara beroende av dyr runtime-AI for varje sidvisning
- manuell verifiering av finansiella siffror ar nodvandig innan publicering

---

## Sammanfattning

Ekonomifliken i `slutspel` ar en fungerande PoC som bevisar produktidén.  
Den ar avsiktligt enkel i arkitektur: statisk data, statisk AI, snabb deploy.

Det riktiga systemet ska senare byggas i `loven-stats-backend` och ersatta denna PoC, inte duplicera den.
