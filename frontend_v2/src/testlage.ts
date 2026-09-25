/**
 * Testläget: sajten byggd för acceptanstest utan eget API.
 *
 * Alla anrop mot /api/v1 besvaras ur en inspelad ögonblicksbild som ligger
 * bredvid sidan, data/<nyckel>.json. Nyckeln är sökvägen och frågan, så
 * samma anrop ger samma fil som när den spelades in. Byggs bara in med
 * VITE_TESTLAGE=1; produktionsbygget innehåller den inte.
 */
export function dataNyckel(url: string): string | null {
  const m = url.match(/\/api\/v1\/([^#]*)/);
  if (!m) return null;
  return decodeURIComponent(m[1])
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[?&]refresh=[^&]*/g, '')
    .replace(/[?&]ts=[^&]*/g, '')
    .replace(/[^a-zA-Z0-9._=-]+/g, '_')
    .replace(/_+$/, '');
}

export function installeraTestlage(): void {
  const vanlig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const nyckel = dataNyckel(url);
    if (nyckel === null) return vanlig(input, init);
    return vanlig(`./data/${nyckel}.json`).then(r =>
      r.ok ? r : new Response(JSON.stringify({ status: 'error', error: 'Saknas i testdatan' }), {
        status: 404, headers: { 'Content-Type': 'application/json' },
      }));
  };
}
