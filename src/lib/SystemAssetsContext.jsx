/**
 * SystemAssetsContext
 *
 * Global real-time provider for visual assets stored in Firestore.
 * Collection: systemAssets/{key}
 *
 * Mount <SystemAssetsProvider> once inside AuthenticatedApp so all
 * authenticated components share a single set of Firestore listeners.
 *
 * After admin saves an asset, every consumer updates automatically via
 * onSnapshot — no manual refresh needed anywhere in the app.
 */
import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from './firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const ASSET_KEYS = [
  'mainLogo',
  'sidebarLogo',
  'loginBackground',
  'dashboardHero',
  'invoiceHeader',
  'reportHeader',
  'backgroundOne',
  'backgroundTwo',
];

// Context shape: { assets: { mainLogo: assetDoc|null, ... }, ready: bool }
const SystemAssetsContext = createContext({ assets: {}, ready: false });

export function SystemAssetsProvider({ children }) {
  const [assets, setAssets] = useState({});
  const [ready, setReady] = useState(false);
  const resolvedCount = useRef(0);

  useEffect(() => {
    resolvedCount.current = 0;

    if (import.meta.env.DEV) {
      console.log('[SystemAssets] Mounting real-time listeners for:', ASSET_KEYS);
    }

    const unsubs = ASSET_KEYS.map(key =>
      onSnapshot(
        doc(db, 'systemAssets', key),
        (snap) => {
          const data = snap.exists() ? snap.data() : null;

          if (import.meta.env.DEV) {
            const size = data?.imageDataUrl
              ? Math.round(data.imageDataUrl.length / 1024) + ' KB'
              : 'none';
            console.log(
              `[SystemAssets] ✓ "${key}" → exists=${snap.exists()}, ` +
              `sourceType=${data?.sourceType || 'none'}, size=${size}`
            );
          }

          setAssets(prev => ({ ...prev, [key]: data }));
          resolvedCount.current += 1;
          if (resolvedCount.current >= ASSET_KEYS.length) setReady(true);
        },
        (err) => {
          // Always log — not just DEV — so permissions issues are immediately visible
          console.error(`[SystemAssets] ❌ "${key}" listener failed: ${err.code} — ${err.message}`);

          if (err.code === 'permission-denied') {
            console.error(
              `[SystemAssets] !! Add to Firestore Security Rules:\n` +
              `  match /systemAssets/{assetId} {\n` +
              `    allow read:  if request.auth != null;\n` +
              `    allow write: if request.auth != null;\n` +
              `  }`
            );
          }

          setAssets(prev => ({ ...prev, [key]: null }));
          resolvedCount.current += 1;
          if (resolvedCount.current >= ASSET_KEYS.length) setReady(true);
        }
      )
    );

    return () => {
      unsubs.forEach(u => u());
      resolvedCount.current = 0;
      if (import.meta.env.DEV) {
        console.log('[SystemAssets] Unmounted listeners.');
      }
    };
  }, []);

  return (
    <SystemAssetsContext.Provider value={{ assets, ready }}>
      {children}
    </SystemAssetsContext.Provider>
  );
}

/**
 * Returns the full assets map: { mainLogo: assetDoc|null, ... }
 * Use this only in Admin.jsx which needs to display all keys.
 */
export function useSystemAssets() {
  const { assets } = useContext(SystemAssetsContext);
  return assets;
}

/**
 * Returns true once all 8 initial onSnapshot callbacks have fired.
 * Useful for showing a loading state before real data arrives.
 */
export function useAssetsReady() {
  const { ready } = useContext(SystemAssetsContext);
  return ready;
}

/**
 * Returns the effective image URL for a single asset key, or null.
 * - null if the asset doesn't exist in Firestore
 * - null if isActive === false (explicitly disabled)
 * - Picks the URL based on sourceType priority:
 *   image_url/url  → imageUrl (or imageDataUrl as fallback)
 *   public         → publicPath
 *   everything else → imageDataUrl (base64 / builtin SVG)
 *
 * @param {string} key - one of ASSET_KEYS
 */
export function useAssetUrl(key) {
  const { assets } = useContext(SystemAssetsContext);
  const asset = assets[key];
  if (!asset || asset.isActive === false) return null;

  const sourceType = asset.sourceType;
  let url = null;

  if (sourceType === 'image_url' || sourceType === 'url') {
    url = asset.imageUrl || asset.imageDataUrl || null;
  } else if (sourceType === 'public') {
    url = asset.publicPath || null;
  } else {
    // firestore_base64, builtin_library, or legacy docs with no sourceType
    url = asset.imageDataUrl || null;
  }

  if (import.meta.env.DEV) {
    if (url) {
      console.log(
        `[useAssetUrl] ✓ "${key}" → sourceType="${sourceType || 'none'}", ` +
        `url=${url.slice(0, 60)}${url.length > 60 ? '…' : ''}`
      );
    } else {
      console.log(`[useAssetUrl] ○ "${key}" → no active image (sourceType="${sourceType || 'none'}")`);
    }
  }

  return url;
}
