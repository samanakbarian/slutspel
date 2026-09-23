import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Metod: formlerna bakom måtten.
 *
 * Sidan finns för att måtten står på flera ställen — PDO i både Laget och
 * Utveckling, percentiler i både Spelare och på varje profil — och en
 * förklaring som upprepas glider isär. Här står den en gång, och noterna
 * länkar hit med ankare.
 *
 * En rad per mått. Formeln är vad man kom hit för; raden under finns bara om
 * formeln kan missförstås. Två tidigare versioner hade ett stycke om vad
 * varje mått inte fångar och läste som en lärobok.
 */

function Matt({ id, namn, formel, rad }: {
  id: string;
  namn: string;
  formel: string;
  rad?: string;
}) {
  return (
    <div className="md-matt" id={id}>
      <h3 className="md-namn">{namn}</h3>
      <p className="md-formel">{formel}</p>
      {rad && <p className="mc-note">{rad}</p>}
    </div>
  );
}

export function MetodSida() {
  const { hash } = useLocation();

  // Noterna länkar hit med ankare (/metod#turindex). Utan det här hamnar man
  // på sidans topp och får leta — och poängen med länken var att slippa det.
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash]);

  return (
    <div className="page animate-fade-up">
      {/* Ingen rubrikruta. Man kommer hit från en Formel-länk i en not och vet
          redan vad sidan är; en titel plus en inledande mening var två skärmar
          att skrolla förbi för att nå formeln man kom för. */}
      <section className="mc-card">
        <p className="mc-kicker">Metod · Laget</p>

        <Matt
          id="skottandel"
          namn="Skottandel"
          formel="skott för ÷ (skott för + skott emot)"
          rad="Skott på mål, inte skottförsök."
        />
        <Matt
          id="pdo"
          namn="PDO"
          formel="S% + SV%,  där S% = mål ÷ skott för  och  SV% = (skott emot − insläppta) ÷ skott emot"
          rad="Runt 100 är normalläget. Avvikelser brukar jämna ut sig."
        />
        <Matt
          id="turindex"
          namn="Turindex (Pythagoras)"
          formel="gjorda² ÷ (gjorda² + insläppta²) × matcher × 3"
          rad="Tabellpoängen målskillnaden förutsäger. Minustal betyder stora vinster och jämna förluster."
        />
        <Matt
          id="specialteam"
          namn="Special teams-index"
          formel="PP% + PK%"
          rad="Powerplaylägen enligt Swehockeys lagstatistik. 100 är ett snittlag."
        />
        <Matt
          id="form"
          namn="Formkurvan"
          formel="rullande fönster om 10 matcher"
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Spelarna</p>

        <Matt
          id="plusminus"
          namn="Plus/minus"
          formel="mål för − mål emot på isen, i lika styrka och i numerärt underläge"
          rad="Samma tal som i Swehockeys protokoll. Powerplaymål och straffar räknas inte."
        />
        <Matt
          id="onice"
          namn="On-ice ±"
          formel="alla mål för − alla mål emot på isen, oavsett spelform"
          rad="Powerplay inräknat, så talet skiljer sig från plus/minus."
        />
        <Matt
          id="percentiler"
          namn="Percentiler"
          formel="andel spelare på samma position med lägre värde per match"
          rad="85 = bättre än 85 %. Kräver fyra av tio omgångar."
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Målvakterna</p>

        <Matt
          id="raddningsprocent"
          namn="Räddningsprocent (Rp%)"
          formel="räddningar ÷ skott mot × 100"
          rad="Alla skott väger lika. Skottkvalitet finns inte i källan."
        />
        <Matt
          id="gaa"
          namn="GAA"
          formel="insläppta mål × 60 ÷ spelade minuter"
          rad="Beror lika mycket på laget framför som på målvakten."
        />
        <Matt
          id="malraddade"
          namn="Mål räddade (GSAA)"
          formel="räddningar − skott mot × seriens räddningsprocent"
          rad="Seriens snitt vägs över alla skott, målvakter med minst tio matcher."
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Prognoserna</p>

        <Matt
          id="elo"
          namn="Elo"
          formel="R ← R + 20 × (utfall − förväntat),  förväntat hemma = 1 ÷ (1 + 10^((R borta − (R hemma + 40)) ÷ 400))"
          rad="Startar på 1500 varje säsong. Bygger på resultat, så värvningar syns inte."
        />
      </section>
    </div>
  );
}
