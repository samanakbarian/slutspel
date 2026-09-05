type Props = {
  seasonName: string;
  /** Säsong att erbjuda som alternativ, när en spelad säsong finns att visa i stället. */
  fallback?: { key: string; name: string } | null;
  onSelectFallback?: (key: string) => void;
};

/**
 * Visas när vald säsong ännu inte har några spelade matcher.
 *
 * Tidigare bytte vyn tyst till en annan säsong i det här läget, vilket gjorde
 * att rubriken sa en sak och siffrorna kom från en annan. Nu står det i klartext
 * vad som gäller, och byte av säsong är användarens eget val.
 */
export function EmptySeason({ seasonName, fallback, onSelectFallback }: Props) {
  return (
    <section className="empty-season">
      <p className="empty-season-kicker">Inga matcher spelade än</p>
      <h2 className="empty-season-title">{seasonName} har inte börjat</h2>
      <p className="empty-season-text">
        Tabell, poängliga och form fylls på så snart den första matchen är spelad.
      </p>
      {fallback && onSelectFallback && (
        <button type="button" className="empty-season-btn" onClick={() => onSelectFallback(fallback.key)}>
          Visa {fallback.name} i stället
        </button>
      )}
    </section>
  );
}
