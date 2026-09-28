import { useEffect, useRef, useState } from 'react';
import { CARD_SIZE, STORY_HEIGHT, cardBlob, cardFontsReady, drawStory } from './matchCard';

type Format = 'kvadrat' | 'story';

/**
 * Ett delbart kort med förhandsvisning, formatval och knapp.
 *
 * `navigator.share` med fil är vägen på telefonen — den lämnar över till
 * systemets delningsmeny, så bilden kan gå direkt till en story eller ett
 * meddelande. Saknas den laddas PNG:n ned i stället.
 *
 * `draw` ritar alltid det kvadratiska kortet. Storyn är samma kort mitt i en
 * stående bild, så de två formaten kan inte visa olika saker.
 */
export function Delningsbild({
  draw, filnamn, titel, beskrivning, nyckel, rubrik = '',
}: {
  draw: (ctx: CanvasRenderingContext2D) => void;
  filnamn: string;
  titel: string;
  beskrivning: string;
  /** Står ovanför kortet i storyformatet. */
  rubrik?: string;
  /** Ändras när innehållet ändras, så kortet ritas om. */
  nyckel: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [format, setFormat] = useState<Format>('kvadrat');
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hojd = format === 'story' ? STORY_HEIGHT : CARD_SIZE;

  useEffect(() => {
    let live = true;
    const paint = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx || !live) return;
      if (format === 'story') drawStory(ctx, draw, rubrik);
      else draw(ctx);
    };
    paint();
    // Ritas kortet innan snitten laddat mäts fel bredder. Andra målningen
    // rättar det.
    cardFontsReady().then(paint);
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nyckel, format]);

  const share = async () => {
    const canvas = canvasRef.current;
    if (!canvas || busy) return;
    setBusy(true);
    setStatus(null);
    const namn = format === 'story' ? filnamn.replace(/\.png$/, '-story.png') : filnamn;
    try {
      const blob = await cardBlob(canvas);
      const file = new File([blob], namn, { type: 'image/png' });
      const nav = navigator as Navigator & {
        canShare?: (d: ShareData) => boolean;
        share?: (d: ShareData) => Promise<void>;
      };
      if (nav.share && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: titel });
          setStatus('Delat.');
          return;
        } catch (e) {
          // Avbrott är inte ett fel — användaren stängde delningsmenyn.
          if ((e as Error).name === 'AbortError') { setStatus(null); return; }
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = namn;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 10000);
      setStatus('Bilden är sparad.');
    } catch (e) {
      setStatus((e as Error).message || 'Kunde inte skapa bilden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="share-format" role="group" aria-label="Format">
        {(['kvadrat', 'story'] as const).map(f => (
          <button key={f} type="button" className={format === f ? 'is-on' : ''}
                  aria-pressed={format === f} onClick={() => setFormat(f)}>
            {f === 'kvadrat' ? 'Kvadrat' : 'Story'}
          </button>
        ))}
      </div>
      <div className={`share-wrap${format === 'story' ? ' share-wrap-story' : ''}`}>
        <canvas
          ref={canvasRef}
          width={CARD_SIZE}
          height={hojd}
          className="share-canvas"
          role="img"
          aria-label={beskrivning}
        />
      </div>
      <button className="share-btn" onClick={share} disabled={busy}>
        {busy ? 'Skapar bild…' : 'Dela som bild'}
      </button>
      {status && <p className="mr-note">{status}</p>}
    </>
  );
}
