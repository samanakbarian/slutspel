import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Så räknar vi: formlerna bakom måtten.
 *
 * Sidan finns för att måtten står på flera ställen — PDO i både Laget och
 * Utveckling, percentiler i både Spelare och på varje profil — och en
 * förklaring som upprepas på tre ställen glider isär. Här står den en gång,
 * och noterna länkar hit med ankare.
 *
 * Varje post säger tre saker: formeln, vad den betyder, och vad den INTE
 * fångar. Det sista är det viktigaste. Ett mått utan sina begränsningar läses
 * som en sanning.
 *
 * Regeln som följer av att sidan finns: kan ett tal inte skrivas ner här utan
 * att läsaren ser att det är påhittat, hör det inte hemma på sajten.
 */

function Matt({
  id, namn, formel, betyder, saknar,
}: {
  id: string;
  namn: string;
  formel: string;
  betyder: React.ReactNode;
  saknar: React.ReactNode;
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
          Alla siffror på sajten kommer från <b>Swehockey Stats</b>. En del står
          där som de är — mål, matcher, utvisningar. Andra räknas fram här, och
          då ska det gå att se hur.
        </p>
        <p className="mc-text" style={{ marginTop: 10 }}>
          Varje mått nedan står med sin formel, vad den betyder och vad den inte
          fångar. Det sista är inte blygsamhet: ett mått utan sina gränser läses
          som en sanning, och de flesta av de här måtten svarar på en smalare
          fråga än de ser ut att göra.
        </p>
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Laget</p>

        <Matt
          id="skottandel"
          namn="Skottandel"
          formel="skott för ÷ (skott för + skott emot)"
          betyder={<>
            Hur stor del av matchens skott laget stod för. Över 50 % betyder att
            laget sköt mer än motståndarna.
          </>}
          saknar={<>
            Bara <i>skott på mål</i>. Missar och blockerade skott finns inte i
            Swehockeys underlag, så det här är inte Corsi och går inte att
            jämföra med Corsi-tal från andra sajter. Ett lag som leder stort och
            släpper initiativet får också en sämre andel utan att ha spelat
            sämre.
          </>}
        />

        <Matt
          id="pdo"
          namn="PDO"
          formel="S% + SV%,  där S% = mål ÷ skott för  och  SV% = (skott emot − insläppta) ÷ skott emot"
          betyder={<>
            Hur vänlig pucken varit. Runt 100 är normalläget. Klart över betyder
            att laget gjort mål på ovanligt få skott, att målvakterna räddat
            ovanligt mycket, eller båda — och över tid dras talet mot 100 igen.
            Säsongens PDO räknas ur totalerna, inte som ett snitt av matchernas:
            en match med få skott ska inte väga lika tungt som en med många.
          </>}
          saknar={<>
            Skiljer inte på tur och skicklighet. En riktigt bra målvakt håller
            uppe SV% år efter år utan att det är tur. PDO räknas här i alla
            spelformer, inte bara fem mot fem, så ett lag med mycket powerplay
            får ett högre tal.
          </>}
        />

        <Matt
          id="turindex"
          namn="Turindex (Pythagoras)"
          formel="förväntade poäng = gjorda² ÷ (gjorda² + insläppta²) × matcher × 3"
          betyder={<>
            Hur många tabellpoäng målskillnaden förutsäger, jämfört med vad laget
            faktiskt fick. Varje match delar ut tre poäng — tre till vinnaren i
            ordinarie tid, två plus ett efter förlängning — så alla matcher väger
            lika. Ett minustal betyder att laget vann stort och förlorade jämnt:
            de extra målen i storsegrarna höjer målskillnaden utan att ge något i
            tabellen.
          </>}
          saknar={<>
            Vet ingenting om vem motståndaren var eller när målen föll. Formeln
            kommer från baseboll och är anpassad efter svensk poängräkning, inte
            härledd ur den. Tomma mål räknas som vilka mål som helst.
          </>}
        />

        <Matt
          id="specialteam"
          namn="Special teams-index"
          formel="PP% + PK%,  där PP% = powerplaymål ÷ motståndarnas utvisningar  och  PK% = (egna utvisningar − insläppta powerplaymål) ÷ egna utvisningar"
          betyder={<>
            Ett tal för båda specialteamen. 100 är neutralnivån — då är laget lika
            bra på att göra mål i överläge som på att förhindra dem i underläge.
          </>}
          saknar={<>
            Räknar utvisningar, inte speltid i överläge. En utvisning som bryts av
            ett mål efter tio sekunder väger lika tungt som två hela minuter. Mål
            i fem mot tre skiljs inte från fem mot fyra.
          </>}
        />

        <Matt
          id="form"
          namn="Formkurvan"
          formel="rullande fönster om 10 matcher"
          betyder={<>
            Varje punkt är summan av de tio senaste matcherna fram till och med
            den matchen. De nio första punkterna bygger på färre matcher än tio,
            eftersom det inte finns fler bakåt.
          </>}
          saknar={<>
            Ett rullande fönster släpar efter: en formvändning syns först när den
            pågått några matcher. Motståndets styrka vägs inte in, så en lätt
            period ser ut som en formtopp.
          </>}
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Spelarna</p>

        <Matt
          id="plusminus"
          namn="Plus/minus"
          formel="mål för − mål emot medan spelaren var på isen, i lika styrka och i numerärt underläge"
          betyder={<>
            Regelbokens plus/minus, samma tal som står i Swehockeys protokoll.
            Powerplaymål ger inget plus åt laget som hade övertaget och inget
            minus åt det som var i underläge. Straffslag och avgörandet i
            straffläggningen räknas inte alls.
          </>}
          saknar={<>
            Säger inget om hur mycket spelaren bidrog till målet — alla fem på
            isen får samma plus. En spelare i en stark femma ser bättre ut än en
            lika bra spelare i en svag.
          </>}
        />

        <Matt
          id="onice"
          namn="On-ice ±"
          formel="alla mål för − alla mål emot medan spelaren var på isen, oavsett spelform"
          betyder={<>
            Ett rent målsaldo för tiden på isen. Till skillnad från plus/minus
            räknas powerplaymål med, så en spelare som spelar mycket powerplay
            ser bättre ut här.
          </>}
          saknar={<>
            Är inte jämförbart med Swehockeys officiella plus/minus och ska inte
            läsas som en rättelse av det. De två talen står bredvid varandra
            därför att de svarar på olika frågor.
          </>}
        />

        <Matt
          id="percentiler"
          namn="Percentiler"
          formel="andelen spelare i serien med minst 10 matcher som ligger under spelarens värde"
          betyder={<>
            85 betyder att spelaren är bättre än 85 % av serien i det måttet.
            Gränsen på tio matcher finns för att en spelare med två matcher och
            tre poäng annars hamnar i toppen.
          </>}
          saknar={<>
            Jämför mot hela serien, inte mot spelare i samma position. En back med
            hög percentil i poäng jämförs med forwards. Percentilen säger var i
            fältet spelaren ligger, inte hur stort avståndet är.
          </>}
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Målvakterna</p>

        <Matt
          id="raddningsprocent"
          namn="Räddningsprocent (Rp%)"
          formel="räddningar ÷ skott mot × 100"
          betyder={<>Hur stor del av skotten målvakten räddade.</>}
          saknar={<>
            Alla skott väger lika. Ett skott från blålinjen räknas som en
            friklägeschans. Utan skottkvalitet går det inte att säga hur svåra
            skotten var.
          </>}
        />

        <Matt
          id="gaa"
          namn="GAA"
          formel="insläppta mål × 60 ÷ spelade minuter"
          betyder={<>Insläppta mål per hel match, oavsett hur länge målvakten stod.</>}
          saknar={<>
            Beror lika mycket på laget framför som på målvakten. En målvakt i ett
            defensivt starkt lag får ett bättre GAA utan att vara bättre.
          </>}
        />

        <Matt
          id="malraddade"
          namn="Mål räddade (GSAA)"
          formel="räddningar − skott mot × seriens räddningsprocent"
          betyder={<>
            Hur många fler mål målvakten räddat än en genomsnittlig målvakt i
            samma serie hade gjort på samma skott. Seriens snitt räknas ur serien
            själv, vägt över alla skott i stället för som ett medelvärde av
            procenttal, och bara målvakter med minst tio matcher räknas in.
            Ungefär tre poäng i tabellen per räddat mål över en säsong.
          </>}
          saknar={<>
            Samma sak som räddningsprocenten: skottkvalitet saknas. Snittet
            gäller den aktuella serien, så tal från olika serier eller säsonger
            går inte att jämföra rakt av.
          </>}
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Prognoserna</p>

        <Matt
          id="elo"
          namn="Elo"
          formel="R ← R + 20 × (utfall − förväntat),  förväntat hemma = 1 ÷ (1 + 10^((R borta − (R hemma + 40)) ÷ 400))"
          betyder={<>
            Ett styrketal som börjar på 1500 för alla lag och flyttas efter varje
            spelad match. Vinner ett lag mot ett starkare lag flyttas talet mer än
            om det vinner mot ett svagare. Hemmaplan är värd 40 punkter. En vinst
            efter förlängning räknas som 0,65 i stället för 1,0, eftersom den
            säger mindre om styrkeskillnaden.
          </>}
          saknar={<>
            Ser bara resultat, aldrig spelet — och aldrig truppen. Alla lag
            startar på 1500 varje säsong, så värvningar, avhopp och skador finns
            inte i talet. Före tio spelade matcher säger det nästan ingenting.
          </>}
        />

        <Matt
          id="slutplacering"
          namn="Simulerad slutplacering"
          formel="5 000 simuleringar av matcherna som återstår; per simulering dras varje lags styrketal ur en normalfördelning kring dess Elo, med standardavvikelse 55"
          betyder={<>
            Resten av säsongen spelas 5 000 gånger. Utfallet i varje match dras ur
            lagens styrketal, och hur ofta matcher går till förlängning hämtas ur
            säsongen själv. Vinst ger tre poäng, vinst efter förlängning två och
            förlust efter förlängning en. Det färgade fältet i stapeln är där
            laget hamnar i åtta av tio simuleringar.
            <br /><br />
            Spridningen på 55 är inte vald på känsla utan kalibrerad mot
            HockeyAllsvenskan 2025/26 vid fyra tidpunkter: utan den hamnade 9,8 av
            14 slutresultat inom p10–p90, med den 11,2 — vilket är vad ett
            åttioprocentigt intervall ska ge.
          </>}
          saknar={<>
            Bygger på Elo och ärver allt Elo inte ser: trupp, skador, form i
            enskilda matcher. Simuleringen är inte en förutsägelse av vad som
            kommer att hända, utan av hur utfallen fördelar sig om resten av
            säsongen liknar det som redan spelats.
          </>}
        />
      </section>

      <section className="mc-card">
        <p className="mc-kicker">Det som inte står här</p>
        <p className="mc-text">
          Sajten räknar fram fler tal än de som visas. En del av dem visas inte
          därför att de bygger på konstanter som valts på känsla i stället för
          att härledas ur data — sannolikheter som egentligen bara är en rak
          linje på tabellplaceringen, eller intervall som är lika breda för alla
          lag oavsett vad som är känt om dem.
        </p>
        <p className="mc-text" style={{ marginTop: 10 }}>
          Regeln är den här: <b>kan ett tal inte skrivas ner på den här sidan
          utan att du ser att det är påhittat, hör det inte hemma på sajten.</b>
          {' '}Ett mått som ser ut som en modell men inte är det är sämre än inget
          mått alls.
        </p>
      </section>
    </div>
  );
}
