import type { BandMatch } from './Sasongsbandet';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export type Lage = 'efter' | 'dag' | 'fore';


export function lageFor(senaste: BandMatch | undefined, nasta: BandMatch | undefined, nu = new Date()): Lage {
  const idag = iso(nu);
  if (nasta && nasta.date.slice(0, 10) === idag) return 'dag';
  const igar = new Date(nu); igar.setDate(igar.getDate() - 1);
  if (senaste && senaste.date.slice(0, 10) >= iso(igar)) return 'efter';
  return 'fore';
}
