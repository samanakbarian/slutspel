/**
 * Lämnar en bild till telefonens delningsmeny, eller laddar ned den.
 *
 * `navigator.share` med fil är vägen på telefonen: bilden kan gå direkt
 * till ett meddelande, en story eller bildbiblioteket. Saknas den, som i de
 * flesta datorwebbläsare, laddas PNG:n ned i stället.
 */
export async function delaEllerSpara(blob: Blob, namn: string, titel: string): Promise<'delat' | 'sparat' | null> {
  const file = new File([blob], namn, { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (d: ShareData) => boolean;
    share?: (d: ShareData) => Promise<void>;
  };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: titel });
      return 'delat';
    } catch (e) {
      // Avbrott är inte ett fel — användaren stängde delningsmenyn.
      if ((e as Error).name === 'AbortError') return null;
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = namn;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
  return 'sparat';
}
