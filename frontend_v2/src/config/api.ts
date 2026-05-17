const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_API_URL = 'https://loven-stats-api-324947473206.europe-west1.run.app';

export const API_URL = (!RAW_API_URL
  || RAW_API_URL.includes('localhost')
  || RAW_API_URL.includes('loven-api-324947473206.europe-north1.run.app'))
  ? DEFAULT_API_URL
  : RAW_API_URL;

