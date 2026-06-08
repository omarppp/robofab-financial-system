import { useState, useEffect } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Subscribes to a single system asset document in Firestore.
 * Collection: systemAssets/{key}
 * Returns the imageDataUrl string, or null if not set.
 * Fails silently on permission errors (e.g. unauthenticated on login page).
 */
export function useSystemAsset(key) {
  const [dataUrl, setDataUrl] = useState(null);

  useEffect(() => {
    if (!key) return;
    let cancelled = false;

    const unsub = onSnapshot(
      doc(db, 'systemAssets', key),
      (snap) => {
        if (cancelled) return;
        setDataUrl(snap.exists() ? (snap.data().imageDataUrl || null) : null);
      },
      () => {
        // Silently ignore errors (e.g. unauthenticated, rules denied)
        if (!cancelled) setDataUrl(null);
      }
    );

    return () => {
      cancelled = true;
      unsub();
    };
  }, [key]);

  return dataUrl;
}
