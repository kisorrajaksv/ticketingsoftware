// Central API and Socket configuration for local development and live production
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').trim();
export const API_BASE = rawApiUrl.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
export const SOCKET_URL = API_BASE;

export default {
  API_BASE,
  SOCKET_URL
};

