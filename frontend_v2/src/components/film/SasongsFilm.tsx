import { FILM_URL } from '../../config/api';
import { FilmKort } from './FilmKort';
import type { FilmMeta } from './FilmKort';

/**
 * Säsongsfilmen: tabellen omgång för omgång, Lövens placering och en
 * åttabitarsduell mot seriesnittet. Görs om av backend efter varje spelad
 * omgång, en film per säsong.
 */
type Meta = FilmMeta & { season: string; serie: string; rounds: number };

export function SasongsFilm({ sasong }: { sasong: string }) {
  return (
    <FilmKort<Meta>
      bas={`${FILM_URL}/sasong/${encodeURIComponent(sasong)}`}
      etikett="säsongsfilmen"
      kicker={m => `Säsongen på ${Math.round(m.duration)} sekunder`}
      filnamn={m => `sida377-${m.season}-${m.rounds}-omgangar.mp4`}
      titel={m => `Björklöven ${m.serie}, efter ${m.rounds} omgångar`}
    />
  );
}
