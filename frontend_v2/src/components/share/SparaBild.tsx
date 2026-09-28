import { useState } from 'react';
import type { RefObject } from 'react';
import { delaEllerSpara } from './dela';

/**
 * Sparar ett kort precis som det ser ut på skärmen.
 *
 * Delningskorten är egna, förenklade bilder. Den här tar i stället det man
 * ser — valt mått, markerade lag, alla rader — så att det går att lägga i
 * ett forum utan att beskära skärmdumpar. Längst ned får bilden en rad med
 * sajtens namn och dagens datum; den visas bara medan bilden tas.
 *
 * Biblioteket laddas först vid tryck, så det kostar inget för den som
 * aldrig sparar.
 */
export function SparaBild({ mal, filnamn, titel }: {
  mal: RefObject<HTMLElement | null>;
  filnamn: string;
  titel: string;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const spara = async () => {
    const el = mal.current;
    if (!el || busy) return;
    setBusy(true);
    setStatus(null);
    el.classList.add('tar-bild');
    try {
      const { domToBlob } = await import('modern-screenshot');
      const bakgrund = getComputedStyle(document.body).backgroundColor || '#07110d';
      const blob = await domToBlob(el, {
        scale: 2,
        backgroundColor: bakgrund,
        // Knappar och "dra för att läsa av" hör inte hemma i en bild.
        filter: n => !(n instanceof HTMLElement && n.classList.contains('ej-i-bild')),
      });
      if (!blob) throw new Error('Kunde inte skapa bilden.');
      const svar = await delaEllerSpara(blob, filnamn, titel);
      setStatus(svar === 'delat' ? 'Delat.' : svar === 'sparat' ? 'Bilden är sparad.' : null);
    } catch (e) {
      setStatus((e as Error).message || 'Kunde inte skapa bilden.');
    } finally {
      el.classList.remove('tar-bild');
      setBusy(false);
    }
  };

  return (
    <div className="spara-bild ej-i-bild">
      <button type="button" className="spara-bild-knapp" onClick={spara} disabled={busy}>
        {busy ? 'Skapar bild…' : 'Spara som bild'}
      </button>
      {status && <span className="spara-bild-status">{status}</span>}
    </div>
  );
}

/** Raden längst ned i bilden. Dold utom medan bilden tas. */
export function BildSignatur() {
  const idag = new Date().toLocaleDateString('sv-SE', { day: 'numeric', month: 'long', year: 'numeric' });
  return <p className="bild-signatur">sida377.se · {idag}</p>;
}
