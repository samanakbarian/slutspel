# 🎨 Frontend 2.0: Arkitektur & Kravspecifikation

*Senast uppdaterad: 2026-05-03*

Detta dokument fungerar som en utredning och kravspecifikation för Frontend 2.0, baserat på vår officiella "Master Plan".

> **Kontext:** Björklöven vann HA 25/26 och spelar i SHL från säsongen 26/27.  
> **Backend-dokumentation:** Se `loven-stats-backend/docs/DATA_WAREHOUSE_DESIGN.md` och `docs/ROADMAP.md`.

## 1. Funktionalitet (UX/UI Mål)

Vi bygger Frontend 2.0 iterativt. Följande huvudmoduler ska byggas in:

### A. Silly Season Hub (MVP Fas 1A)
- **Det Smarta Ryktesflödet:** Ett flöde som blandar bekräftade nyheter med skrapade forumrykten, filtrerbart med taggar.
- **Impact-Kort:** Datadrivna nyhetskort. Visar hur mycket istid/poäng laget tappar vid en förlust.
- **Silly Season-Tempen (AI):** En visuell mätare (0–100 %) på varje rykte baserat på AI-sentimentanalys.
- **Trupp-KPI:er & Rinken:** Realtidsräknare för kontrakterade spelare uppe i UI:t och en interaktiv rink.

### B. Matchcenter (MVP Fas 1B - SHL Live)
*Björklöven spelar i SHL 26/27. Matchcenter byggas för live-data från Sportradar SHL (rikare coverage än HA: lineups, djupare spelarstatistik, vinstsannolikheter).*
- **The Live Scoreboard:** Hjärtat under matchdagar. Visar aktuell period, klocka, live-resultat och "On-Ice Situation".
  - *Data-källa:* `Sport Event Summary` / `Live Summaries` via BigQuery.
- **The Play-by-Play Timeline & Box Score:** Tolkar Sportradar-eventdata till ett flöde: 
  - Målsammanfattning (Målskytt, assist, tid).
  - Utvisningssammanfattning (Spelare, typ av förseelse, minuter).
  - Lagstatistik (Skott på mål, teknings-%, PP-effektivitet för matchen).
  - Avancerat: Corsi, Fenwick, xG (Expected Goals) per match.
  - *Data-källa:* `fact_match_events` i BigQuery (se `DATA_WAREHOUSE_DESIGN.md`).

### C. Ligan & Laget
- **SHL Standings & Schedule:**
  - *The Table:* Live-uppdaterad SHL-tabell (Poäng, V, F, ÖTV, ÖTF, Målskillnad). Hämtas via `Season Standings`.
  - *The Schedule:* Ren och snygg kalender med kommande matcher, resultat och TV-kanaler. Hämtas via `Season Summaries` eller `Competitor Summaries`.
- **Player Profiles & Roster Stats:**
  - *Roster List:* Trupplista med tröjnummer och positioner. Hämtas via `Competitor Profile`.
  - *Standard Season Stats:* Mål, Assist, Poäng, +/-, PIM och TOI (Time on Ice). Hämtas via `Seasonal Competitor Statistics`.
  - *Goalie Stats:* SV%, GAA, och Hållna nollor (Shutouts).

### D. Historik & Tidsmaskinen
- **Historisk Tidsmaskin:** Möjlighet att gå tillbaka i tiden via en global date-picker och se truppen/statistiken exakt som den såg ut ett tidigare datum (baserat på dbt Snapshots).

## 2. Webbplatsstruktur (Sitemap)

- **🏠 Dashboard (Hem):** Nästa match, Trupp-KPI:er, senaste nyheten.
- **🔄 Silly Season Hub:** Ryktesflödet och truppbygget.
- **🏒 Matchcenter:** Live Scoreboard, Play-by-play, Box Score, "Kedja mot Kedja".
- **🏆 SHL Tabell & Spelschema:** The Table & The Schedule.
- **👥 Trupp & Spelarprofiler:** Roster List, Player Profiles och Player Stats.
- **📊 Historik & Tidsmaskinen:** Djuplodande analys av tidigare säsonger.

## 3. Teknisk Stack & Arkitektur

- **Ramverk:** React via **Vite**.
- **Språk:** **TypeScript** (absolut nödvändigt för de komplexa datamodellerna från EliteProspects och Sportradar).
- **Routing:** `react-router-dom`.
- **State Management:** `Zustand`.
- **Styling:** **Vanilla CSS** med CSS-variabler (Design Tokens) för Dark Mode, glassmorphism och sponsorytor.
- **Hosting:** Applikationen kommer på sikt hostas på **Firebase Hosting** för att knytas närmare vår GCP-stack.

## 4. Design & UX (The "Wow" Factor)

- **Rich Aesthetics:** Mörkt premium-tema med dynamiska "native" sponsorytor från lokala Umeå-företag.
- **Datadriven UX:** Siffror ska kännas levande (count-ups, färgkodning röd/grön för bra/dåligt impact).
- **Responsivitet:** Mobile-first, eftersom majoriteten kollar via mobilen.

## 5. Avancerad Analytik (via Data Warehouse)

*Frontenden ska kunna visa följande metriker, som beräknas i BigQuery:*

- **Corsi (CF%):** Skottförsök för/mot vid 5v5 — mäter hur mycket ett lag/spelare dominerar.
- **Fenwick (FF%):** Som Corsi men exkluderar blockerade skott.
- **xG (Expected Goals):** AI-beräknad sannolikhet för varje skott baserat på avstånd, vinkel och spelläge.
- **Game Score:** Composit-metrik för spelarens totala match-impact.
- **WAR (Wins Above Replacement):** AI-beräknad — hur mycket bättre än en ersättare.
- **AI Scouting Reports:** Naturlig text genererad av Gemini per spelare.

Se `loven-stats-backend/docs/DATA_WAREHOUSE_DESIGN.md` för fullständigt schema.
