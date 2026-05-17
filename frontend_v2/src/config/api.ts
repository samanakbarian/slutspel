const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_API_URL = 'https://loven-stats-api-324947473206.europe-west1.run.app';

// Allow localhost for local development, fall back to production for broken/old URLs
const isOldBrokenUrl = RAW_API_URL.includes('loven-api-324947473206.europe-north1.run.app');
const isEmpty = !RAW_API_URL;

export const API_URL = (isEmpty || isOldBrokenUrl)
  ? DEFAULT_API_URL
  : RAW_API_URL;
