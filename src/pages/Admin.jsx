import { useState, useRef } from 'react';
import { db } from '../lib/firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { useSystemAssets, useAssetsReady } from '../lib/SystemAssetsContext';
import { toast, confirm as confirmDialog, PageHeader, Spinner } from '../components/UI';

// ── Asset definitions ────────────────────────────────────────────────────────
const IMAGE_TYPES = [
  {
    key: 'mainLogo',
    label: 'الشعار الرئيسي',
    description: 'شعار النظام الرئيسي — يظهر في الشريط العلوي والصفحات',
    gradient: 'linear-gradient(135deg, #0d0d11 0%, #f97316 100%)',
    compressConfig: { maxWidth: 400, quality: 0.75 },
  },
  {
    key: 'sidebarLogo',
    label: 'شعار الشريط الجانبي',
    description: 'الشعار المصغر داخل القائمة الجانبية (احتياطي: الشعار الرئيسي)',
    gradient: 'linear-gradient(135deg, #0d0d11 0%, #a855f7 100%)',
    compressConfig: { maxWidth: 400, quality: 0.75 },
  },
  {
    key: 'loginBackground',
    label: 'خلفية صفحة الدخول',
    description: 'صورة خلفية شاشة تسجيل الدخول',
    gradient: 'linear-gradient(135deg, #0c0c0e 0%, #f97316 100%)',
    compressConfig: { maxWidth: 1200, quality: 0.70 },
  },
  {
    key: 'dashboardHero',
    label: 'صورة لوحة التحكم',
    description: 'الصورة الخلفية للبانر الترحيبي في لوحة التحكم',
    gradient: 'linear-gradient(135deg, #16a34a 0%, #0284c7 100%)',
    compressConfig: { maxWidth: 1200, quality: 0.70 },
  },
  {
    key: 'invoiceHeader',
    label: 'رأس الفاتورة',
    description: 'الترويسة في الفواتير المطبوعة',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea6a0a 100%)',
    compressConfig: { maxWidth: 1000, quality: 0.72 },
  },
  {
    key: 'reportHeader',
    label: 'رأس التقارير',
    description: 'الترويسة في التقارير المطبوعة',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #f97316 100%)',
    compressConfig: { maxWidth: 1000, quality: 0.72 },
  },
  {
    key: 'backgroundOne',
    label: 'الخلفية الزخرفية الأولى',
    description: 'صورة زخرفية للواجهة',
    gradient: 'linear-gradient(135deg, #dc2626 0%, #f97316 100%)',
    compressConfig: { maxWidth: 1200, quality: 0.68 },
  },
  {
    key: 'backgroundTwo',
    label: 'الخلفية الزخرفية الثانية',
    description: 'صورة زخرفية إضافية للواجهة',
    gradient: 'linear-gradient(135deg, #0284c7 0%, #22c55e 100%)',
    compressConfig: { maxWidth: 1200, quality: 0.68 },
  },
];

// ── Source type labels ────────────────────────────────────────────────────────
const SOURCE_LABELS = {
  firestore_base64: 'صورة مرفوعة',
  image_url: 'رابط URL',
  builtin_library: 'مكتبة النظام',
};

// ── Built-in gradient presets (RoboFab palette) ───────────────────────────────
function makeSvgGradient(c1, c2) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/></linearGradient></defs><rect width="400" height="200" fill="url(#g)"/></svg>`;
  return 'data:image/svg+xml;base64,' + btoa(svg);
}

const BUILTIN_PRESETS = [
  { label: 'برتقالي داكن',  dataUrl: makeSvgGradient('#1a0a02', '#f97316') },
  { label: 'برتقالي لطيف',  dataUrl: makeSvgGradient('#431407', '#fb923c') },
  { label: 'أسود جرافيت',  dataUrl: makeSvgGradient('#0c0c0e', '#222229') },
  { label: 'بنفسجي داكن',  dataUrl: makeSvgGradient('#1a0a2e', '#a855f7') },
  { label: 'أخضر صناعي',   dataUrl: makeSvgGradient('#022c22', '#22c55e') },
  { label: 'أزرق فولاذي',  dataUrl: makeSvgGradient('#0c1825', '#38bdf8') },
  { label: 'رمادي معدني',   dataUrl: makeSvgGradient('#111115', '#6b7280') },
  { label: 'أحمر جمري',    dataUrl: makeSvgGradient('#1a0505', '#ef4444') },
];

// ── Utilities ─────────────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch { return iso; }
}

// ── Image processor (no Storage — pure browser canvas) ────────────────────────
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_DATAURL_BYTES = 700 * 1024;

function canvasCompress(img, maxWidth, quality) {
  let w = img.naturalWidth;
  let h = img.naturalHeight;
  if (w > maxWidth) {
    h = Math.round((h * maxWidth) / w);
    w = maxWidth;
  }
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  return { dataUrl: canvas.toDataURL('image/jpeg', quality), width: w, height: h };
}

async function processImageFile(file, config = { maxWidth: 1200, quality: 0.72 }) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('نوع الصورة غير مدعوم. استخدم PNG أو JPG أو WEBP أو SVG.');
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('حجم الصورة كبير جدًا. من فضلك اختر صورة أقل من 2 ميجابايت.');
  }

  if (import.meta.env.DEV) {
    console.log(`[Admin] processImageFile — type=${file.type}, originalSize=${Math.round(file.size/1024)}KB`);
  }

  if (file.type === 'image/svg+xml') {
    const text = await file.text();
    if (!text.trim().toLowerCase().includes('<svg')) throw new Error('ملف SVG غير صالح.');
    const safe = text.replace(/<script[\s\S]*?<\/script>/gi, '');
    const dataUrl = 'data:image/svg+xml,' + encodeURIComponent(safe);
    if (dataUrl.length > MAX_DATAURL_BYTES) throw new Error('الصورة كبيرة بعد الضغط. اختر صورة أصغر.');
    return { dataUrl, width: 0, height: 0, compressedSize: dataUrl.length };
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        let result = canvasCompress(img, config.maxWidth, config.quality);
        if (import.meta.env.DEV) {
          console.log(`[Admin] First pass: ${Math.round(result.dataUrl.length/1024)}KB @ q=${config.quality}`);
        }
        if (result.dataUrl.length > MAX_DATAURL_BYTES) {
          const lq = Math.max(config.quality - 0.20, 0.40);
          result = canvasCompress(img, Math.min(config.maxWidth, 900), lq);
          if (import.meta.env.DEV) {
            console.log(`[Admin] Second pass: ${Math.round(result.dataUrl.length/1024)}KB @ q=${lq}`);
          }
        }
        if (result.dataUrl.length > MAX_DATAURL_BYTES) {
          reject(new Error('الصورة كبيرة بعد الضغط. اختر صورة أصغر أو أقل جودة.'));
          return;
        }
        resolve({ dataUrl: result.dataUrl, width: result.width, height: result.height, compressedSize: result.dataUrl.length });
      };
      img.onerror = () => reject(new Error('فشل في قراءة الصورة.'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('فشل في قراءة الملف.'));
    reader.readAsDataURL(file);
  });
}

// ── ImageCard component ──────────────────────────────────────────────────────
function ImageCard({ imageType, assetData, onSave, onDelete }) {
  const [mode, setMode] = useState('idle');
  const [pending, setPending] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [dimensions, setDimensions] = useState(null);
  const fileRef = useRef(null);

  // displayUrl: show pending preview first, then saved image
  // Check both imageDataUrl (base64/builtin) and imageUrl (URL-type) on the saved doc
  const displayUrl = pending?.imageDataUrl || assetData?.imageUrl || assetData?.imageDataUrl || null;
  const hasImage = !!displayUrl;
  const hasPending = !!pending;

  const reset = () => { setPending(null); setMode('idle'); setUrlInput(''); };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setProcessing(true);
    try {
      const result = await processImageFile(file, imageType.compressConfig);
      setPending({
        imageDataUrl: result.dataUrl,
        sourceType: 'firestore_base64',
        fileName: file.name,
        fileType: file.type,
        originalSize: file.size,
        width: result.width,
        height: result.height,
      });
      setMode('idle');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUrlPreview = () => {
    const url = urlInput.trim();
    if (!url) { toast.error('أدخل رابط الصورة أولاً'); return; }
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('data:')) {
      toast.error('الرابط غير صالح. يجب أن يبدأ بـ https://');
      return;
    }
    setPending({ imageDataUrl: url, sourceType: 'image_url', fileName: '', fileType: 'url', originalSize: 0, width: 0, height: 0 });
    setMode('idle');
  };

  const handleLibrarySelect = (preset) => {
    setPending({ imageDataUrl: preset.dataUrl, sourceType: 'builtin_library', fileName: preset.label, fileType: 'svg', originalSize: preset.dataUrl.length, width: 400, height: 200 });
    setMode('idle');
  };

  const handleSave = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await onSave(imageType.key, pending);
      setPending(null);
      setMode('idle');
    } catch (err) {
      toast.error('فشل الحفظ: ' + (err.message || 'خطأ'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDialog('تأكيد الحذف', `هل أنت متأكد من حذف "${imageType.label}"؟`);
    if (ok) onDelete(imageType.key);
  };

  return (
    <div style={{
      background: 'var(--card)',
      border: '1px solid var(--border)',
      borderRadius: 16,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'box-shadow 0.2s, border-color 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = '';
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* ── Image preview area ── */}
      <div style={{
        position: 'relative', height: 180, flexShrink: 0, overflow: 'hidden',
        background: imageType.gradient, cursor: 'pointer',
      }} onClick={() => !processing && !saving && setMode(mode === 'idle' ? 'file' : 'idle')}>
        {hasImage ? (
          <img
            src={displayUrl} alt={imageType.label}
            onLoad={e => setDimensions({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
            onError={() => setDimensions(null)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 600, gap: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="22" height="22">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            انقر لاختيار صورة
          </div>
        )}

        {/* Status badge */}
        {hasPending && !processing && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(245,158,11,0.92)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
            معاينة — لم يُحفظ بعد
          </div>
        )}
        {!hasPending && assetData?.imageDataUrl && !processing && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(34,197,94,0.88)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
            ✓ نشط في النظام
          </div>
        )}
        {processing && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#fff' }}>
            <Spinner />
            <div style={{ fontSize: 13, fontWeight: 700 }}>جاري معالجة الصورة...</div>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      <div style={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Title + description */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text)' }}>{imageType.label}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{imageType.description}</div>
        </div>

        {/* Metadata block (only for saved, non-pending state) */}
        {assetData?.imageDataUrl && !hasPending && (
          <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '7px 10px', border: '1px solid var(--border)', fontSize: 11, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>المصدر:</span>
              <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{SOURCE_LABELS[assetData.sourceType] || assetData.sourceType}</span>
            </div>
            {assetData.fileName && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>الملف:</span>
                <span style={{ fontWeight: 600, direction: 'ltr' }}>{assetData.fileName.length > 22 ? '...' + assetData.fileName.slice(-20) : assetData.fileName}</span>
              </div>
            )}
            {assetData.originalSize > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>الحجم الأصلي:</span>
                <span style={{ fontWeight: 600 }}>{formatSize(assetData.originalSize)}</span>
              </div>
            )}
            {dimensions?.w > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>الأبعاد:</span>
                <span style={{ fontWeight: 600, direction: 'ltr' }}>{dimensions.w} × {dimensions.h}</span>
              </div>
            )}
            {assetData.updatedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>آخر تحديث:</span>
                <span style={{ fontWeight: 600 }}>{formatDate(assetData.updatedAt)}</span>
              </div>
            )}
          </div>
        )}

        {/* Idle mode — action buttons */}
        {mode === 'idle' && !hasPending && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 'auto' }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, minWidth: 80, fontSize: 12 }}
              onClick={() => { setMode('file'); setTimeout(() => fileRef.current?.click(), 50); }}>
              📁 من الجهاز
            </button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setMode('url')}>🔗 رابط</button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setMode('library')}>🎨 مكتبة</button>
            {assetData?.imageDataUrl && (
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--danger)' }} onClick={handleDelete}>🗑️</button>
            )}
          </div>
        )}

        {/* File mode */}
        {mode === 'file' && !hasPending && (
          <div style={{ marginTop: 'auto' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>PNG, JPG, WEBP, SVG — حد أقصى 2 ميجابايت</div>
            <button className="btn btn-ghost btn-sm" onClick={reset}>إلغاء</button>
          </div>
        )}

        {/* URL mode */}
        {mode === 'url' && !hasPending && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 'auto' }}>
            <input
              className="form-control"
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleUrlPreview()}
              placeholder="https://example.com/logo.png"
              dir="ltr"
              style={{ fontSize: 12 }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }} onClick={handleUrlPreview}>معاينة</button>
              <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={reset}>إلغاء</button>
            </div>
          </div>
        )}

        {/* Library mode */}
        {mode === 'library' && !hasPending && (
          <div style={{ marginTop: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
              {BUILTIN_PRESETS.map((p) => (
                <div
                  key={p.label}
                  title={p.label}
                  onClick={() => handleLibrarySelect(p)}
                  style={{
                    height: 36, borderRadius: 6, cursor: 'pointer', overflow: 'hidden',
                    border: '2px solid transparent', transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
                >
                  <img src={p.dataUrl} alt={p.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ))}
            </div>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, width: '100%' }} onClick={reset}>إلغاء</button>
          </div>
        )}

        {/* Pending: save/cancel bar */}
        {hasPending && (
          <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
            <button className="btn btn-primary btn-sm" style={{ flex: 1, fontSize: 12 }}
              onClick={handleSave} disabled={saving}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ وتطبيق'}
            </button>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={reset} disabled={saving}>
              إلغاء
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  );
}

// ── Admin page ────────────────────────────────────────────────────────────────
export default function Admin() {
  const { user } = useAuth();

  // ── READ from the same SystemAssetsContext used by all other pages ──
  // This is the critical fix: Admin no longer has its own disconnected
  // getDocs state. Admin and the sidebar/dashboard/etc. now see identical data.
  // When a save triggers an onSnapshot update, everything updates at once.
  const assets = useSystemAssets();
  const assetsReady = useAssetsReady();

  const handleSave = async (key, pendingData) => {
    const imgType = IMAGE_TYPES.find(t => t.key === key);

    if (import.meta.env.DEV) {
      console.log(
        `[Admin] Saving → key="${key}", sourceType="${pendingData.sourceType}", ` +
        `size=${Math.round((pendingData.imageDataUrl?.length || 0) / 1024)}KB, ` +
        `path="systemAssets/${key}"`
      );
    }

    // For URL-type assets, mirror the URL into the dedicated imageUrl field
    // so useAssetUrl's sourceType-based priority lookup always finds it.
    const isUrlType = pendingData.sourceType === 'image_url' || pendingData.sourceType === 'url';

    const assetDoc = {
      key,
      title:        imgType?.label || key,
      description:  imgType?.description || '',
      imageDataUrl: pendingData.imageDataUrl,             // base64/SVG/http URL (always set)
      imageUrl:     isUrlType ? pendingData.imageDataUrl : '',  // explicit URL field for URL-type
      publicPath:   '',                                   // reserved for future public-folder assets
      sourceType:   pendingData.sourceType,
      fileName:     pendingData.fileName || '',
      fileType:     pendingData.fileType || '',
      originalSize: pendingData.originalSize || 0,
      isActive:     true,
      updatedAt:    new Date().toISOString(),
      updatedBy:    user?.email || 'admin',
    };

    await setDoc(doc(db, 'systemAssets', key), assetDoc);
    // ── No local setAssets call here! ──
    // SystemAssetsContext's onSnapshot fires automatically after the write,
    // updates context state, and re-renders every consumer (this page included).
    toast.success(`✓ تم حفظ "${imgType?.label || key}" وتطبيقه في النظام`);
  };

  const handleDelete = async (key) => {
    const imgType = IMAGE_TYPES.find(t => t.key === key);
    try {
      await deleteDoc(doc(db, 'systemAssets', key));
      // ── No local setAssets call here either ──
      toast.success(`تم حذف "${imgType?.label || key}"`);
    } catch (err) {
      toast.error('فشل الحذف: ' + (err.message || 'خطأ غير معروف'));
    }
  };

  const uploadedCount = IMAGE_TYPES.filter(t => assets[t.key]?.imageDataUrl).length;

  // Show spinner until context has fired all initial onSnapshot callbacks
  if (!assetsReady) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 16 }}>
        <Spinner />
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>جاري تحميل الأصول المرئية من Firestore...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="لوحة التحكم الإدارية"
        subtitle="إدارة الصور المرئية للنظام — الشعارات والخلفيات والترويسات"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'إجمالي الأصناف', value: IMAGE_TYPES.length, color: 'blue' },
          { label: 'صور نشطة في النظام', value: uploadedCount, color: 'green' },
          { label: 'غير مُحددة', value: IMAGE_TYPES.length - uploadedCount, color: 'yellow' },
        ].map(s => (
          <div key={s.label} className={`kpi-card ${s.color}`} style={{ cursor: 'default' }}>
            <div className="kpi-label">{s.label}</div>
            <div className="kpi-value">{s.value}</div>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="alert alert-info mb-4">
        <span>ℹ️</span>
        <span>
          الصور مضغوطة ومخزنة في Firestore بدون Firebase Storage.
          بعد الحفظ تُطبَّق <strong>فوراً</strong> في الشريط الجانبي، لوحة التحكم، الفواتير، والتقارير دون تحديث الصفحة.
          الحد الأقصى للملف <strong>2 ميجابايت</strong> (PNG, JPG, WEBP, SVG).
        </span>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {IMAGE_TYPES.map(imgType => (
          <ImageCard
            key={imgType.key}
            imageType={imgType}
            assetData={assets[imgType.key] || null}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, padding: '14px 20px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
        🔒 جميع الأصول مخزنة في Firestore — المجموعة:{' '}
        <strong style={{ direction: 'ltr', display: 'inline-block', color: 'var(--primary)' }}>systemAssets</strong>
        {user?.email && <span style={{ marginRight: 'auto' }}>المسؤول: {user.email}</span>}
      </div>
    </div>
  );
}
