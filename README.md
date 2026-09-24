# Löven Stats Hub — frontend

Webbplatsen [sida377.se](https://sida377.se): statistik om IF Björklöven i SHL.
Data och API ligger i `samanakbarian/loven-stats-backend`, och överlämningen
med läget och vad som är på gång står i dess `docs/NASTA_STEG.md`.

- `frontend_v2/` — Vite, React 19 och TypeScript. Netlify bygger och
  publicerar vid varje push till `main` (se `netlify.toml`).
- `docs/SWEHOCKEY_DATA_COVERAGE_MATRIX.md` — vilka data Swehockey har.

## Lokalt

```
cd frontend_v2 && npm ci && npm run dev
```

Före push: `npx tsc -b && npx eslint src && npx vite build`.
