const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_API_URL = 'https://loven-stats-api-324947473206.europe-west1.run.app';

const isLocal = RAW_API_URL.startsWith('http://localhost');
export const API_URL = isLocal ? RAW_API_URL : DEFAULT_API_URL;

/** Matchfilmerna ligger i en egen, publik bucket (loven-stats-backend/film). */
export const FILM_URL = 'https://storage.googleapis.com/granskaren-d51a1-matchfilm/film';
