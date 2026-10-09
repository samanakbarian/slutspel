import { FILM_URL } from '../../config/api';
import { FilmKort } from './FilmKort';
import type { FilmMeta } from './FilmKort';

/**
 * Matchfilmen: matchen på fyrtio sekunder, som en Text-TV-sida.
 *
 * Filmen renderas av backend efter varje skörd (loven-stats-backend/film) och
 * ligger i en publik bucket.
 */
type Meta = FilmMeta & { home_team: string; away_team: string; result: string };

export function MatchFilm({ gameId }: { gameId: string }) {
  return (
    <FilmKort<Meta>
      bas={`${FILM_URL}/${encodeURIComponent(gameId)}`}
      etikett="matchfilmen"
      kicker={m => `Matchen på ${Math.round(m.duration)} sekunder`}
      filnamn={m => `sida377-${m.home_team}-${m.away_team}.mp4`}
      titel={m => `${m.home_team}–${m.away_team} ${m.result.replace(/\s/g, '')}`}
    />
  );
}
