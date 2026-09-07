/**
 * Skriver sitemap.xml före bygget.
 *
 * De sju statiska sidorna är basen. Matchrapporterna läggs till från API:t,
 * och det är de som betyder något: under säsongen söker folk på "björklöven
 * djurgården resultat", inte på "björklöven statistik". Utan dem är den mest
 * sökta delen av sajten osynlig för Google.
 *
 * Misslyckas hämtningen skrivs basen ändå. Ett bygge får aldrig falla för att
 * ett API är nere — då står hela sajten still för en kartas skull.
 */
import fs from 'node:fs/promises';

const BAS = 'https://sida377.se';
const API = process.env.VITE_API_URL
  || 'https://loven-stats-api-324947473206.europe-west1.run.app';

const STATISKA = [
  ['/', 'daily', '1.0'],
  ['/matcher', 'daily', '0.9'],
  ['/statistik', 'daily', '0.9'],
  ['/trupp', 'weekly', '0.7'],
  ['/nyheter', 'hourly', '0.8'],
  ['/x', 'hourly', '0.5'],
  ['/om', 'monthly', '0.3'],
];

async function matcher() {
  try {
    const svar = await fetch(`${API}/api/v1/statistics`, { signal: AbortSignal.timeout(60000) });
    if (!svar.ok) throw new Error(`API svarade ${svar.status}`);
    const data = await svar.json();
    // Bara spelade matcher med game_id har en rapport att visa. En adress i
    // kartan som svarar "rapport saknas" är sämre än ingen adress alls.
    const rader = (data.games || [])
      .filter(g => g.game_id && /\d+\s*-\s*\d+/.test(g.result || ''))
      .map(g => [`/matcher/${g.game_id}`, 'monthly', '0.6', String(g.match_date || '').slice(0, 10)]);
    console.log(`  ${rader.length} matchrapporter från API:t`);
    return rader;
  } catch (e) {
    console.log(`  kunde inte hämta matcher (${e.message}) — skriver bara de statiska`);
    return [];
  }
}

const alla = [...STATISKA, ...await matcher()];
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Genererad av scripts/sitemap.mjs vid bygget. Redigera inte för hand. -->
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${alla.map(([vag, takt, vikt, datum]) =>
  `  <url><loc>${BAS}${vag}</loc>${datum ? `<lastmod>${datum}</lastmod>` : ''}` +
  `<changefreq>${takt}</changefreq><priority>${vikt}</priority></url>`).join('\n')}
</urlset>
`;
await fs.writeFile(new URL('../public/sitemap.xml', import.meta.url), xml);
console.log(`  sitemap.xml: ${alla.length} adresser`);
