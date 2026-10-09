import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * En film ur filmbucketen som ett kompakt kort: stillbild, Spela, Spara och
 * Dela. Filmen själv öppnas i helskärm.
 *
 * `bas` är adressen utan filändelse; där ligger .json, .mp4 och .jpg.
 * JSON-filen skrivs sist av backend, så finns den är filmen klar. Finns den
 * inte visas ingenting.
 */
export type FilmMeta = { generated_at: string; duration: number } & Record<string, unknown>;

export function FilmKort<M extends FilmMeta>({ bas, kicker, filnamn, titel, etikett }: {
  bas: string;
  kicker: (m: M) => string;
  filnamn: (m: M) => string;
  titel: (m: M) => string;
  etikett: string;
}) {
  const [meta, setMeta] = useState<M | null>(null);
  const [delar, setDelar] = useState<'' | 'hamtar' | 'kopierad' | 'fel'>('');
  const [spelar, setSpelar] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${bas}.json`, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setMeta(d && d.generated_at ? d : null))
      .catch(() => setMeta(null));
    return () => ctrl.abort();
  }, [bas]);

  if (!meta) return null;

  // Versionen i adressen, så en omgjord film inte visas ur cachen.
  const v = encodeURIComponent(meta.generated_at);
  const mp4 = `${bas}.mp4?v=${v}`;
  const poster = `${bas}.jpg?v=${v}`;
  const namn = filnamn(meta).replace(/\s+/g, '-').toLowerCase();

  const hamtaFil = async () => {
    const svar = await fetch(mp4);
    if (!svar.ok) throw new Error(String(svar.status));
    return new File([await svar.blob()], namn, { type: 'video/mp4' });
  };

  const spara = async () => {
    // download-attributet fungerar inte mellan domäner, så filen hämtas först.
    try {
      setDelar('hamtar');
      const fil = await hamtaFil();
      const url = URL.createObjectURL(fil);
      const a = document.createElement('a');
      a.href = url;
      a.download = namn;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
      setDelar('');
    } catch {
      setDelar('fel');
    }
  };

  const dela = async () => {
    try {
      setDelar('hamtar');
      const fil = await hamtaFil();
      if (navigator.canShare?.({ files: [fil] })) {
        await navigator.share({ files: [fil], title: titel(meta) });
        setDelar('');
        return;
      }
      // Ingen delning av filer, som på de flesta datorer: dela länken i stället.
      if (navigator.share) {
        await navigator.share({ url: mp4.split('?')[0], title: 'Sida 377' });
        setDelar('');
        return;
      }
      await navigator.clipboard.writeText(mp4.split('?')[0]);
      setDelar('kopierad');
    } catch (e) {
      // Avbruten delning är inget fel.
      setDelar((e as Error)?.name === 'AbortError' ? '' : 'fel');
    }
  };

  // Kompakt i flödet: en liten stillbild och knapparna. Filmen själv
  // öppnas i helskärm, annars tar den en hel telefonskärm.
  return (
    <section className="mr-card mf-kort">
      <div className="mf-rad">
        <button type="button" className="mf-tumme" onClick={() => setSpelar(true)} aria-label={`Spela ${etikett}`}>
          <img src={poster} alt="" loading="lazy" />
          <span className="mf-play" aria-hidden="true">▶</span>
        </button>
        <div className="mf-text">
          <p className="mr-kicker">{kicker(meta)}</p>
          <div className="mf-knappar">
            <button type="button" className="mf-knapp" onClick={() => setSpelar(true)}>Spela</button>
            <button type="button" className="mf-knapp mf-knapp-svag" onClick={spara} disabled={delar === 'hamtar'}>Spara</button>
            <button type="button" className="mf-knapp mf-knapp-svag" onClick={dela} disabled={delar === 'hamtar'}>Dela</button>
          </div>
          {delar === 'hamtar' && <p className="mr-note">Hämtar filmen…</p>}
          {delar === 'kopierad' && <p className="mr-note">Länken är kopierad.</p>}
          {delar === 'fel' && <p className="mr-note">Det gick inte just nu. Försök igen.</p>}
        </div>
      </div>
      {/* Direkt i body: sidans kort har transform för inanimationen, och då
          blir position: fixed relativ till kortet i stället för skärmen. */}
      {spelar && createPortal(
        <div className="mf-helskarm" role="dialog" aria-label={etikett} onClick={() => setSpelar(false)}>
          <video className="mf-video" src={mp4} poster={poster} controls autoPlay playsInline onClick={e => e.stopPropagation()} />
          <button type="button" className="mf-stang" onClick={() => setSpelar(false)} aria-label="Stäng">✕</button>
        </div>,
        document.body,
      )}
    </section>
  );
}
