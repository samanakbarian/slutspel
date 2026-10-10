# Löven Stats Hub — frontend

Webbplatsen [sida377.se](https://sida377.se): statistik om IF Björklöven i SHL.
Data och API ligger i `samanakbarian/loven-stats-backend`, och överlämningen
med läget och vad som är på gång står i dess `docs/NASTA_STEG.md`.

- `frontend_v2/` — Vite, React 19 och TypeScript. Netlify bygger och
  publicerar vid varje push till `main` (se `netlify.toml`).
- `docs/SWEHOCKEY_DATA_COVERAGE_MATRIX.md` — vilka data Swehockey har.

Hela systemet — skörden, API:t, filmerna och schemat — beskrivs i backendens
`docs/SYSTEM.md`, kraven i `docs/ICKE_FUNKTIONELLA_KRAV.md`.

## Koden

- `src/pages/` — en fil per vy: Matcher, Matchrapport, Statistik (Laget,
  Spelare, Utveckling), Spelare, Trupp, Nyheter, X-flöde, Metod.
- `src/components/` — kort som delas mellan vyerna. `charts/` är diagrammen,
  handritad SVG utan bibliotek. `film/` är filmkorten: `FilmKort` (stillbild,
  Spela, Spara, Dela, helskärm), `MatchFilm` och `SasongsFilm`.
- `src/lib/` — beräkningar och text utan React.
- `src/config/api.ts` — API:ts adress och filmernas bucket.
- `scripts/sitemap.mjs` — sitemap vid bygget.

Ett kort som kan krascha ligger i `<Guard>`, så att resten av vyn står kvar.
Filmkorten visar ingenting förrän filmens JSON finns i bucketen.

## Lokalt

```
cd frontend_v2 && npm ci && npm run dev
```

Före push: `npx tsc -b && npx eslint src && npx vite build`. Lint har tio
äldre fel i `Statistics.tsx` och ett i `Matchrapport.tsx`; inga nya ska
tillkomma. `npm run build` skriver om `public/sitemap.xml` — den ska inte
committas, Netlify gör den vid bygget.

Ändringar provas i 390 px med Playwright mot `npx vite preview` innan de
pushas, och visuella ändringar visas som skärmbilder först.
