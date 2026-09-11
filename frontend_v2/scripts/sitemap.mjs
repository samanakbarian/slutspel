/**
 * Skriver sitemap.xml före bygget.
 *
 * De sju statiska sidorna är basen. Matchrapporterna läggs till från API:t,
 * och det är de som betyder något: under säsongen söker folk på "björklöven
 * djurgården resultat", inte på "björklöven statistik". Utan dem är den mest
 * sökta delen av sajten osynlig för Google.
 *
 * Rapporterna måste hämtas per säsong. /api/v1/statistics utan parameter
 * svarar med den aktiva säsongen, och just nu är det SHL 26/27 där ingen
 * match är spelad — alltså noll rapporter. De spelade matcherna ligger kvar
 * i de gamla säsongerna och deras sidor fungerar fortfarande, så kartan
 * går igenom varje säsong som har lagdata.
 *
 * Misslyckas hämtningen skrivs basen ändå. Ett bygge får aldrig falla för att
 * ett API är nere — då står hela sajten still för en kartas skull.
 */
import fs from 'node:fs/promises';

/**
 * Byggloggen på Netlify är inte åtkomlig härifrån, så varje steg skrivs också
 * in i kartan som en kommentar. Går hämtningen fel räcker en curl mot
 * sitemap.xml för att se varför, i stället för att gissa.
 */
const logg = [];
const skriv = (rad) => { logg.push(rad); console.log(`  ${rad}`); };

const BAS = 'https://sida377.se';
const STANDARD_API = 'https://loven-stats-api-324947473206.europe-west1.run.app';

/**
 * VITE_API_URL i Netlify pekar på en tjänst som inte finns längre
 * (loven-api…europe-north1, svarar 404). Appen märker det inte, för
 * src/config/api.ts har en hårdkodad vakt mot just den adressen — men det här
 * skriptet läste variabeln rakt av och fick 404 på varje anrop.
 *
 * I stället för att spegla vakten provas adresserna tills en svarar. Då
 * spelar det ingen roll vilken död adress variabeln råkar innehålla
 * härnäst; en karta som byggs på ett API som inte svarar är ändå värdelös.
 */
const KANDIDATER = [...new Set([process.env.VITE_API_URL, STANDARD_API].filter(Boolean))];

const STATISKA = [
  ['/', 'daily', '1.0'],
  ['/matcher', 'daily', '0.9'],
  ['/statistik', 'daily', '0.9'],
  ['/trupp', 'weekly', '0.7'],
  ['/nyheter', 'hourly', '0.8'],
  ['/x', 'hourly', '0.5'],
  ['/om', 'monthly', '0.3'],
  ['/metod', 'monthly', '0.4'],
];

const KARTA = new URL('../public/sitemap.xml', import.meta.url);

let API = '';

const hamta = async (vag) => {
  for (const bas of API ? [API] : KANDIDATER) {
    let svar;
    try {
      svar = await fetch(`${bas}${vag}`, { signal: AbortSignal.timeout(60000) });
    } catch (e) {
      skriv(`${bas} nåddes inte (${e.message})`);
      continue;
    }
    if (!svar.ok) {
      skriv(`${bas}${vag} svarade ${svar.status}`);
      continue;
    }
    if (!API) skriv(`API: ${bas}`);
    API = bas;
    return svar.json();
  }
  throw new Error(`ingen adress svarade på ${vag}`);
};

/** Säsongsnycklar med lagdata, nyaste först. Faller tillbaka på den aktiva. */
async function sasonger() {
  try {
    const data = await hamta('/api/v1/seasons');
    const nycklar = (data.seasons || [])
      .filter(s => s.has_team_data && s.key)
      .map(s => s.key);
    if (nycklar.length) return nycklar;
  } catch (e) {
    skriv(`kunde inte lista säsonger (${e.message}) — provar den aktiva`);
  }
  return [''];
}

async function matcher() {
  const rader = new Map();
  for (const key of await sasonger()) {
    try {
      const data = await hamta(`/api/v1/statistics${key ? `?season=${encodeURIComponent(key)}` : ''}`);
      // Bara spelade matcher med game_id har en rapport att visa. En adress i
      // kartan som svarar "rapport saknas" är sämre än ingen adress alls.
      let n = 0;
      for (const g of data.games || []) {
        if (!g.game_id || !/\d+\s*-\s*\d+/.test(g.result || '')) continue;
        rader.set(String(g.game_id), [
          `/matcher/${g.game_id}`, 'monthly', '0.6', String(g.match_date || '').slice(0, 10),
        ]);
        n++;
      }
      skriv(`${key || 'aktiv säsong'}: ${n} matchrapporter`);
    } catch (e) {
      skriv(`${key || 'aktiv säsong'}: kunde inte hämta matcher (${e.message})`);
    }
  }
  return [...rader.values()].sort((a, b) => (b[3] || '').localeCompare(a[3] || ''));
}

const rapporter = await matcher();

// Ett bygge där API:t inte svarar får inte radera femtiotvå fungerande
// adresser ur kartan. Google tolkar en sida som försvinner ur den som ett
// besked, och en tillfällig blipp under ett bygge är inget besked. Den gamla
// filen ligger kvar i repot och är bättre än basen.
if (!rapporter.length) {
  const gammal = await fs.readFile(KARTA, 'utf-8').catch(() => '');
  const antal = (gammal.match(/<url>/g) || []).length;
  if (antal > STATISKA.length) {
    skriv(`inga rapporter hämtade — behåller de ${antal} adresser som redan låg i kartan`);
    // Loggblocket byts ut, inte staplas — annars växer kartan en kommentar
    // per misslyckat bygge.
    await fs.writeFile(KARTA, gammal.replace(
      /(<!-- Genererad[^]*?-->)[^]*?(?=<urlset)/,
      `$1\n<!--\n  ${new Date().toISOString()}\n  ${logg.join('\n  ')}\n-->\n`));
    process.exit(0);
  }
}

const alla = [...STATISKA, ...rapporter];
skriv(`sitemap.xml: ${alla.length} adresser`);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Genererad av scripts/sitemap.mjs vid bygget. Redigera inte för hand. -->
<!--
  ${new Date().toISOString()}
  ${logg.join('\n  ')}
-->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${alla.map(([vag, takt, vikt, datum]) =>
  `  <url><loc>${BAS}${vag}</loc>${datum ? `<lastmod>${datum}</lastmod>` : ''}` +
  `<changefreq>${takt}</changefreq><priority>${vikt}</priority></url>`).join('\n')}
</urlset>
`;
await fs.writeFile(KARTA, xml);
