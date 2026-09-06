import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Text-TV-läget, delat mellan vyerna.
 *
 * Sidnumren är inte påhittade och får inte blandas ihop. SVT Text lägger
 * SHL-tabellen på 358, spelschemat på 359 och poängligan på 365; 377 är
 * målservicen där resultaten tickar in medan matcherna pågår. Varje vy bär
 * sitt eget nummer — det är den detaljen som skiljer en hyllning från en
 * kostym.
 *
 * Disciplinen är hela poängen: åtta färger, ett rutnät, en typstorlek. Men
 * versaler och fast teckenbredd går inte att bedöma från en skärmbild, de
 * måste levas med. Därför en växel per vy som minns sitt val.
 */

export const SIDA = {
  tabell: '358',
  spelschema: '359',
  poangliga: '365',
  live: '377',
} as const;

/** Kommer namnet igen: efternamnet plus initialen, som på Text-TV. */
export function ttNamn(name: string | undefined): string {
  const rensat = String(name || '').replace(/[*†‡]+/g, '').trim();
  if (!rensat) return '';
  const [efter, fore] = rensat.includes(',')
    ? rensat.split(',').map(d => d.trim())
    : [rensat.split(' ').slice(-1)[0], rensat.split(' ').slice(0, -1).join(' ')];
  const initial = fore ? ` ${fore[0]}` : '';
  return `${efter}${initial}`.toUpperCase();
}

/**
 * Lagnamnet kortat som Text-TV kortade det.
 *
 * Bolagsformen bär ingen information i en tabell — "Kalmar HC" är Kalmar.
 * Ordet stryks bara när något återstår, så AIK förblir AIK och inte tomt.
 */
const FORM = /^(if|ik|hc|bk|sk|hk|hf|is|aik|hockey)$/i;

export function ttLag(name: string | undefined): string {
  const delar = String(name || '').trim().split(/\s+/);
  const kvar = delar.filter(d => !FORM.test(d));
  return (kvar.length > 0 ? kvar : delar).join(' ').toUpperCase();
}

/** Valet minns sig själv: en växel man måste hitta varje gång går inte att leva med. */
export function useTextTv(nyckel: string): [boolean, () => void] {
  const lagring = `lovenlaget:texttv:${nyckel}`;
  const [pa, setPa] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(lagring) === '1') setPa(true);
    } catch {
      // Privat läge och blockerade kakor kastar här. Av duger som standard.
    }
  }, [lagring]);

  const vaxla = () => {
    setPa(nuvarande => {
      const nytt = !nuvarande;
      try { localStorage.setItem(lagring, nytt ? '1' : '0'); } catch { /* se ovan */ }
      return nytt;
    });
  };

  return [pa, vaxla];
}

export function TextTvVaxel({ sida, pa, onClick }: { sida: string; pa: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`tab-vaxel${pa ? ' tab-vaxel-pa' : ''}`}
      onClick={onClick}
      aria-pressed={pa}
      title={`Visa som SVT Text sida ${sida}`}
    >
      {sida}
    </button>
  );
}

/** Sidhuvudet i cyan, precis som Text-TV inleder varje sida. */
export function TextTvSida({
  sida, rubrik, info, children,
}: {
  sida: string;
  rubrik: string;
  info?: string;
  children: ReactNode;
}) {
  return (
    <div className="tt-sida">
      <div className="tt-topp">
        <span>{rubrik}</span>
        <span>{sida}{info ? `  ${info.toUpperCase()}` : ''}</span>
      </div>
      <div className="tt-scroll">
        <div className="tt-rutnat">{children}</div>
      </div>
    </div>
  );
}
