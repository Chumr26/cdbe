const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const resolveAssetUrl = (url?: string | null): string => {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;

  let origin = '';
  try {
    const baseUrl = new URL(API_BASE_URL, window.location.origin);
    origin = baseUrl.origin;
  } catch {
    origin = '';
  }

  const normalized = url.startsWith('/') ? url : `/${url}`;
  return origin ? `${origin}${normalized}` : normalized;
};
