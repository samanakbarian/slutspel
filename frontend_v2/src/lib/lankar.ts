/**
 * Adresser inom sajten som flera vyer bygger.
 *
 * Spelarsidan nås från poängligan, truppen och matchrapporten. Namnet står i
 * Swehockeys form, "Efternamn, Förnamn", eftersom det är den form poängligan
 * redan länkar med — två stavningar av samma spelare vore två adresser till
 * samma sida.
 */

export const spelarsida = (namn: string, sasong?: string | null) =>
  `/statistik/spelare/${encodeURIComponent(namn)}${sasong ? `?season=${encodeURIComponent(sasong)}` : ''}`;

type Sasong = { key: string; has_team_data?: boolean | null };

/**
 * Säsongen ett matchdatum hör till, som nyckel för spelarsidan.
 *
 * Matchrapporten vet inte vilken säsong den tillhör, men datumet gör det:
 * en säsong spelas från hösten till våren. Nyckeln slutar på årtalen
 * ("_2526"), och av de säsongerna med lagdata finns bara en per år — det år
 * laget gick upp flyttade det från HockeyAllsvenskan till SHL.
 *
 * Tom sträng betyder den aktiva säsongen, som spelarsidan väljer själv utan
 * parameter. null betyder att säsongen inte gick att avgöra, och då ska
 * namnen inte länkas: en länk till fel säsong visar en annan spelares år
 * eller ingenting alls.
 */
export function sasongForDatum(datum: string | null | undefined, sasonger: Sasong[], aktiv: string): string | null {
  const m = String(datum || '').match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  const ar = Number(m[1]);
  const start = Number(m[2]) >= 7 ? ar : ar - 1;
  const slut = `_${String(start % 100).padStart(2, '0')}${String((start + 1) % 100).padStart(2, '0')}`;
  const traffar = sasonger.filter(s => s.has_team_data === true && s.key.endsWith(slut));
  if (traffar.length !== 1) return null;
  return traffar[0].key === aktiv ? '' : traffar[0].key;
}
