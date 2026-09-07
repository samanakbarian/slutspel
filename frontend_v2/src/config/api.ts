const RAW_API_URL = import.meta.env.VITE_API_URL || '';
const DEFAULT_API_URL = 'https://loven-stats-api-324947473206.europe-west1.run.app';

const isLocal = RAW_API_URL.startsWith('http://localhost');
export const API_URL = isLocal ? RAW_API_URL : DEFAULT_API_URL;
