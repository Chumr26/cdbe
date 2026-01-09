import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

function getStorageKey(locationKey: string) {
  return `scroll:${locationKey}`;
}

export default function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();

  // Save scroll position for the current history entry when we leave it.
  useEffect(() => {
    return () => {
      try {
        const key = getStorageKey(location.key);
        const pos = { x: window.scrollX, y: window.scrollY };
        sessionStorage.setItem(key, JSON.stringify(pos));
      } catch {
        // Ignore storage errors (private mode, quota, etc.)
      }
    };
  }, [location.key]);

  // Restore on back/forward; otherwise scroll to top.
  useEffect(() => {
    if (navigationType === 'POP') {
      try {
        const raw = sessionStorage.getItem(getStorageKey(location.key));
        if (raw) {
          const pos = JSON.parse(raw) as { x?: number; y?: number };
          window.scrollTo(pos.x ?? 0, pos.y ?? 0);
          return;
        }
      } catch {
        // Fall through to scroll-to-top.
      }
    }

    window.scrollTo(0, 0);
  }, [location.key, navigationType]);

  return null;
}
