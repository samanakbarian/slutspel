/** Matchfilmen visas bara med ?film=1 i adressen tills den är provad på riktiga telefoner. */
export function filmPaslagen(): boolean {
  try {
    return new URLSearchParams(window.location.search).get('film') === '1';
  } catch {
    return false;
  }
}
