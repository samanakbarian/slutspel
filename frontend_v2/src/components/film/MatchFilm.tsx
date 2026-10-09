import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FILM_URL } from '../../config/api';

/**
 * Matchfilmen: matchen på fyrtio sekunder, som en Text-TV-sida.
 *
 * Filmen renderas av backend efter varje skörd (loven-stats-backend/film) och
 * ligger i en publik bucket. Den här komponenten visar den bara om den finns:
 * JSON-filen skrivs sist, så finns den är filmen klar.
 */
type Meta = { game_id: number; generated_at: string; duration: number; home_team: string; away_team: string; result: string };

export function MatchFilm({ gameId }: { gameId: string }) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [delar, setDelar] = useState<'' | 'hamtar' | 'kopierad' | 'fel'>('');
  const [spelar, setSpelar] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${FILM_URL}/${encodeURIComponent(gameId)}.json`, { signal: ctrl.signal, cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then(d => setMeta(d && d.game_id ? d : null))
      .catch(() => setMeta(null));
    return () => ctrl.abort();
  }, [gameId]);

  if (!meta) return null;

  // Versionen i adressen, så en omgjord film inte visas ur cachen.
  const v = encodeURIComponent(meta.generated_at);
  const mp4 = `${FILM_URL}/${gameId}.mp4?v=${v}`;
  const poster = `${FILM_URL}/${gameId}.jpg?v=${v}`;
  const filnamn = `sida377-${meta.home_team}-${meta.away_team}.mp4`.replace(/\s+/g, '-').toLowerCase();

  const hamtaFil = async () => {
    const svar = await fetch(mp4);
    if (!svar.ok) throw new Error(String(svar.status));
    return new File([await svar.blob()], filnamn, { type: 'video/mp4' });
  };

  const spara = async () => {
    // download-attributet fungerar inte mellan domäner, så filen hämtas först.
    try {
      setDelar('hamtar');
      const fil = await hamtaFil();
      const url = URL.createObjectURL(fil);
      const a = document.createElement('a');
      a.href = url;
      a.download = filnamn;
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
        await navigator.share({ files: [fil], title: `${meta.home_team}–${meta.away_team} ${meta.result.replace(/\s/g, '')}` });
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

  // Kompakt i rapporten: en liten stillbild och knapparna. Filmen själv
  // öppnas i helskärm, annars tar den en hel telefonskärm i flödet.
  return (
    <section className="mr-card mf-kort">
      <div className="mf-rad">
        <button type="button" className="mf-tumme" onClick={() => setSpelar(true)} aria-label="Spela matchfilmen">
          <img src={poster} alt="" loading="lazy" />
          <span className="mf-play" aria-hidden="true">▶</span>
        </button>
        <div className="mf-text">
          <p className="mr-kicker">Matchen på {Math.round(meta.duration)} sekunder</p>
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
        <div className="mf-helskarm" role="dialog" aria-label="Matchfilmen" onClick={() => setSpelar(false)}>
          <video className="mf-video" src={mp4} poster={poster} controls autoPlay playsInline onClick={e => e.stopPropagation()} />
          <button type="button" className="mf-stang" onClick={() => setSpelar(false)} aria-label="Stäng">✕</button>
        </div>,
        document.body,
      )}
    </section>
  );
}
