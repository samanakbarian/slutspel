import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Så räknar vi: formlerna bakom måtten.
 *
 * Sidan finns för att måtten står på flera ställen — PDO i både Laget och
 * Utveckling, percentiler i både Spelare och på varje profil — och en
 * förklaring som upprepas glider isär. Här står den en gång, och noterna
 * länkar hit med ankare.
 *
 * Håll posterna korta. Formeln är det sidan finns för; texten ska bara säga
 * vad talet betyder och var det tar slut. Första versionen var tre gånger så
 * lång och läste som en lärobok.
 */

function Matt({
  id, namn, formel, betyder, saknar,
}: {
  id: string;
  namn: string;
  formel: string;
  betyder: React.ReactNode;
  saknar: string;
}) {
  return (
    <div className="md-matt" id={id}>
      <h3 className="md-namn">{namn}</h3>
      <p className="md-formel">{formel}</p>
      <p className="mc-text">{betyder}</p>
      <p className="mc-note"><b>Fångar inte:</b> {saknar}</p>
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
      <section className="mc-card">
        <p className="mc-kicker">Metod</p>
        <h2 className="mc-title">Så räknar vi</h2>
        <p className="mc-text" style={{ marginTop: 6 }}>
          Siffrorna kommer från Swehockey Stats. En del står där som de är, andra
          räknas fram här — och då ska det gå att se hur.
        </p>
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Laget</p>

        <Matt
          id="skottandel"
          namn="Skottandel"
          formel="skott för ÷ (skott för + skott emot)"
          betyder={<>Hur stor del av matchens skott laget stod för.</>}
          saknar="Bara skott på mål. Missar och blockerade skott saknas i källan, så det här är inte Corsi och går inte att jämföra med Corsi."
        />

        <Matt
          id="pdo"
          namn="PDO"
          formel="S% + SV%,  där S% = mål ÷ skott för  och  SV% = (skott emot − insläppta) ÷ skott emot"
          betyder={<>
            Hur vänlig pucken varit. Runt 100 är normalläget, och över tid dras
            talet dit igen.
          </>}
          saknar="Skillnaden mellan tur och en genuint bra målvakt."
        />

        <Matt
          id="turindex"
          namn="Turindex (Pythagoras)"
          formel="förväntade poäng = gjorda² ÷ (gjorda² + insläppta²) × matcher × 3"
          betyder={<>
            Tabellpoängen målskillnaden förutsäger, mot vad laget faktiskt fick.
            Ett minustal betyder stora vinster och jämna förluster — extra mål i
            en storseger ger inte en fjärde poäng.
          </>}
          saknar="Vem motståndaren var och när målen föll."
        />

        <Matt
          id="specialteam"
          namn="Special teams-index"
          formel="PP% + PK%,  där PP% = powerplaymål ÷ motståndarnas utvisningar  och  PK% = (egna utvisningar − insläppta powerplaymål) ÷ egna utvisningar"
          betyder={<>Ett tal för båda specialteamen. 100 är neutralnivån.</>}
          saknar="Speltid i överläge. En utvisning som bryts efter tio sekunder väger lika tungt som två hela minuter."
        />

        <Matt
          id="form"
          namn="Formkurvan"
          formel="rullande fönster om 10 matcher"
          betyder={<>
            Varje punkt är de tio senaste matcherna fram till och med den matchen.
          </>}
          saknar="Motståndets styrka. Ett rullande fönster släpar dessutom efter en formvändning."
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Spelarna</p>

        <Matt
          id="plusminus"
          namn="Plus/minus"
          formel="mål för − mål emot på isen, i lika styrka och i numerärt underläge"
          betyder={<>
            Regelbokens tal, samma som i Swehockeys protokoll. Powerplaymål och
            straffar räknas inte.
          </>}
          saknar="Vem som bidrog. Alla fem på isen får samma plus."
        />

        <Matt
          id="onice"
          namn="On-ice ±"
          formel="alla mål för − alla mål emot på isen, oavsett spelform"
          betyder={<>
            Rent målsaldo för tiden på isen, powerplay inräknat. En spelare med
            mycket powerplaytid ser bättre ut här än i plus/minus.
          </>}
          saknar="Jämförbarhet med det officiella plus/minus. De svarar på olika frågor och står därför bredvid varandra."
        />

        <Matt
          id="percentiler"
          namn="Percentiler"
          formel="andel av serien med minst 10 matcher som ligger under spelarens värde"
          betyder={<>85 betyder bättre än 85 % av serien i det måttet.</>}
          saknar="Position. En back jämförs med forwards."
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Målvakterna</p>

        <Matt
          id="raddningsprocent"
          namn="Räddningsprocent (Rp%)"
          formel="räddningar ÷ skott mot × 100"
          betyder={<>Hur stor del av skotten målvakten räddade.</>}
          saknar="Skottkvalitet. Ett skott från blålinjen väger lika tungt som ett friläge."
        />

        <Matt
          id="gaa"
          namn="GAA"
          formel="insläppta mål × 60 ÷ spelade minuter"
          betyder={<>Insläppta mål per hel match, oavsett hur länge målvakten stod.</>}
          saknar="Laget framför. Ett defensivt starkt lag ger bättre GAA utan bättre målvakt."
        />

        <Matt
          id="malraddade"
          namn="Mål räddade (GSAA)"
          formel="räddningar − skott mot × seriens räddningsprocent"
          betyder={<>
            Mål räddade utöver vad en genomsnittlig målvakt i serien gjort på
            samma skott. Seriens snitt vägs över alla skott, och bara målvakter
            med minst tio matcher räknas in.
          </>}
          saknar="Skottkvalitet. Snittet gäller den aktuella serien, så tal från olika serier går inte att jämföra."
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Prognoserna</p>

        <Matt
          id="elo"
          namn="Elo"
          formel="R ← R + 20 × (utfall − förväntat),  förväntat hemma = 1 ÷ (1 + 10^((R borta − (R hemma + 40)) ÷ 400))"
          betyder={<>
            Styrketal som börjar på 1500 och flyttas efter varje match, viktat mot
            motståndets styrka. Hemmaplan är värd 40 punkter, och en vinst efter
            förlängning räknas som 0,65 i stället för 1,0.
          </>}
          saknar="Truppen. Alla lag nollställs till 1500 varje säsong, så värvningar och skador finns inte i talet."
        />

        <Matt
          id="slutplacering"
          namn="Simulerad slutplacering"
          formel="5 000 simuleringar av matcherna som återstår; varje lags styrketal dras per simulering ur en normalfördelning kring dess Elo, sigma 55"
          betyder={<>
            Resten av säsongen spelas 5 000 gånger. Det färgade fältet i stapeln är
            var laget hamnar i åtta av tio. Sigma 55 är kalibrerat mot HA 25/26:
            11,2 av 14 slutresultat hamnade inom p10–p90, mot 9,8 utan — och 11,2
            är vad ett åttioprocentigt intervall ska ge.
          </>}
          saknar="Allt Elo inte ser. Det här är inte en förutsägelse, utan hur utfallen fördelar sig om resten liknar det som spelats."
        />
      </section>
    </div>
  );
}
