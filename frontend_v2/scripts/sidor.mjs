/**
 * Skriver en egen index.html per adress i sitemapen, efter bygget.
 *
 * Appen sätter titel, beskrivning och canonical i webbläsaren. Den som läser
 * sidan utan att köra JavaScript — Google i första vändan, länkförhandsvisare
 * alltid — såg därför startsidans taggar på varje adress, med canonical mot
 * startsidan. För Google var alla matchrapporter kopior av startsidan som
 * själva sa att startsidan var originalet, och Search Console listade dem som
 * "Upptäckt – inte indexerad". Nu får varje adress en fil med sina egna
 * taggar. Netlify serverar en fil som finns före omskrivningen till
 * index.html, och appen startar som vanligt.
 *
 * Texterna är desamma som src/lib/sidhuvud.ts och Matchrapport.tsx sätter,
 * så att sidan inte byter titel när appen startat. Ändras de där ska de
 * ändras här.
 */
import fs from 'node:fs/promises';

const BAS = 'https://sida377.se';
const DIST = new URL('../dist/', import.meta.url);

const SIDOR = {
  '/matcher': ['Matcher och resultat · Björklöven — Sida 377',
    'Björklövens matcher i SHL 2026/27: spelprogram, resultat och matchrapporter, hämtat från Swehockey Stats.'],
  '/statistik': ['Statistik och poängliga · Björklöven — Sida 377',
    'Poängliga, målvaktsstatistik och lagets siffror för IF Björklöven i SHL 2026/27.'],
  '/trupp': ['Truppen · Björklöven — Sida 377',
    'Björklövens trupp i SHL 2026/27, med position, nummer och säsongens siffror per spelare.'],
  '/nyheter': ['Nyheter · Björklöven — Sida 377',
    'Aktuella nyheter om IF Björklöven, samlade från klubben och svensk hockeymedia.'],
  '/x': ['Snacket på X · Björklöven — Sida 377', 'Vad som skrivs om Björklöven på X just nu.'],
  '/om': ['Om Sida 377', 'Vad Sida 377 är, var siffrorna kommer ifrån och hur de räknas.'],
};

const MANADER = ['januari', 'februari', 'mars', 'april', 'maj', 'juni', 'juli', 'augusti',
  'september', 'oktober', 'november', 'december'];
const datumText = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  return m ? `${Number(m[3])} ${MANADER[Number(m[2]) - 1]} ${m[1]}` : '';
};

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function medTaggar(html, vag, titel, text) {
  const url = `${BAS}${vag}`;
  const sattMeta = (h, attr, namn, varde) => h.replace(
    new RegExp(`(<meta ${attr}="${namn}" content=")[^"]*(")`), `$1${esc(varde)}$2`);
  let h = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(titel)}</title>`);
  h = h.replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`);
  h = sattMeta(h, 'name', 'description', text);
  h = sattMeta(h, 'property', 'og:url', url);
  h = sattMeta(h, 'property', 'og:title', titel);
  h = sattMeta(h, 'property', 'og:description', text);
  h = sattMeta(h, 'name', 'twitter:title', titel);
  h = sattMeta(h, 'name', 'twitter:description', text);
  return h;
}

const mall = await fs.readFile(new URL('index.html', DIST), 'utf-8');
const matcher = JSON.parse(
  await fs.readFile(new URL('./.matcher.json', import.meta.url), 'utf-8').catch(() => '[]'),
);

const sidor = Object.entries(SIDOR).map(([vag, [titel, text]]) => ({ vag, titel, text }));
for (const m of matcher) {
  if (!m.hemma || !m.borta) continue;
  const siffror = String(m.resultat || '').replace(/\s*-\s*/, '–').trim();
  const rubrik = [`${m.hemma} – ${m.borta}`, siffror].filter(Boolean).join(' ');
  const datum = datumText(m.datum);
  sidor.push({
    vag: m.vag,
    titel: `${rubrik} · Matchrapport — Sida 377`,
    text: `Matchrapport ${rubrik}${datum ? `, ${datum}` : ''}. `
      + 'Mål, utvisningar, målvakter och spelarnas siffror, händelse för händelse.',
  });
}

// Platta filer, /matcher/123.html: Netlify serverar dem på /matcher/123 utan
// omdirigering. En mapp med index.html kan i stället skickas vidare till
// /matcher/123/, och då pekar canonical på en adress som omdirigerar.
for (const s of sidor) {
  const fil = new URL(`.${s.vag}.html`, DIST);
  await fs.mkdir(new URL('.', fil), { recursive: true });
  await fs.writeFile(fil, medTaggar(mall, s.vag, s.titel, s.text));
}
console.log(`  sidor: ${sidor.length} adresser med egna taggar`);
