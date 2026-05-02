# 🎨 Frontend 2.0: Arkitektur & Kravspecifikation

Nu när Löven tagit steget upp i SHL och vår backend-infrastruktur (GCP) är på plats, är det dags att planera för **Frontend 2.0**. Den nuvarande koden (byggd specifikt för en finalserie i HockeyAllsvenskan) behöver struktureras om till en skalbar plattform som kan hantera live-matcher, Silly Season, historisk data och avancerad analys från BigQuery.

Detta dokument fungerar som en utredning och kravspecifikation för hur vi bör strukturera den nya webbappen.

## ⚠️ User Review Required

Läs igenom de föreslagna vyerna och teknikvalen nedan. Detta är en skiss på hur vi maximerar appens potential för SHL-säsongen. 
- **Saknar du någon specifik vy?**
- **Ska vi använda React + Vite?**
- **Ska vi köra Vanilla CSS (rekommenderas för extrem designflexibilitet) eller vill du explicit använda TailwindCSS?**

## 🏗️ Föreslagen Webbplatsstruktur (Sitemap)

När appen växer behöver vi riktig routing (`react-router-dom`) och en tydlig sidmeny.

### 1. 🏠 Dashboard (Hem)
- **Syfte:** Översiktsvy när användaren landar.
- **Innehåll:** Nästa match, senaste nyheten (Silly Season), snabb titt på tabellen och en "Live nu"-indikator om en match spelas via Sportradar.

### 2. 🏒 Matchcenter (Sportradar Integration)
- **Syfte:** Hjärtat för pågående och avslutade matcher.
- **Innehåll:**
  - Liveuppdaterad resultattavla (Play-by-play från Sportradar).
  - Skottkartor och Heatmaps.
  - Vår unika **"Kedja mot Kedja"**-analys.

### 3. 🔄 Silly Season Hub
- **Syfte:** Vår nyskapade dynamiska byggsten.
- **Innehåll:**
  - Realtidsflödet från webbskraporna (GCS -> Cloud Run).
  - Ryktesbarometern.
  - Interaktiva "Truppbygget" (Rinken).

### 4. 📊 Advanced Analytics & Scouting (BigQuery + EliteProspects)
- **Syfte:** Djuplodande analys av spelare och trender.
- **Innehåll:**
  - Historisk spelarstatistik hämtad från BigQuery.
  - Integration mot EliteProspects API för att se agenturer, kontraktshistorik och spelarsidor.
  - "Löven-index": En egenutvecklad algoritm för att mäta spelarpåverkan.

## 💻 Teknisk Stack & Arkitektur

För att undvika spaghettikod när appen växer föreslår jag en modernisering av frontend-stacken:

- **Ramverk:** React via **Vite** (för extremt snabba byggtider och modern modulhantering).
- **Språk:** Javascript eller **TypeScript** (TypeScript rekommenderas starkt när vi hanterar komplexa API-svar från Sportradar och EliteProspects).
- **Routing:** `react-router-dom` för att bygga en äkta Single Page Application med flera vyer.
- **State Management:** `Zustand` eller Reacts inbyggda Context för att hantera t.ex. live-data globalt utan "prop drilling".
- **Styling:** **Vanilla CSS** med CSS-variabler (Design Tokens) för att skapa ett helt unikt, premium och dynamiskt UI (Glassmorphism, mörkt tema, neon-accenter).

## 🎨 Design & UX (The "Wow" Factor)

SHL-nivå kräver SHL-design. Vi kommer frångå statiska tabeller och implementera:
- **Rich Aesthetics:** Ett mörkt premium-tema (Dark Mode by default) med dynamiska färgaccenter (t.ex. grön/gul) baserat på sidans kontext.
- **Micro-animationer:** Snygga och snabba övergångar (t.ex. med Framer Motion) när man byter från Matchcenter till Silly Season.
- **Responsivitet:** Måste fungera helt felfritt i mobilen, eftersom 80% av fans kollar hockey-stats från soffan med mobilen i handen.

---

## ❓ Open Questions

1. **Övergångsfasen:** Vill du att vi initierar den nya Vite-plattformen i ett helt nytt repo, eller ska vi skriva över `slutspel`-mappen steg för steg?
2. **TypeScript:** Känner du dig bekväm med att vi inför TypeScript för att säkra upp datamodellerna för Sportradar-matcherna?
3. **Design:** Vill du behålla den exakta nuvarande "Löven-looken" eller ska vi passa på att göra en total UX-remake för SHL?
