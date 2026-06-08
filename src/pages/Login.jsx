import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

export default function Login() {
  const { login, authError } = useAuth();
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [submitError, setSubmitError] = useState('');
  const [loading,     setLoading]     = useState(false);

  const displayError = authError || submitError;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!email || !password) {
      setSubmitError('يرجى إدخال البريد الإلكتروني وكلمة المرور');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msgs = {
        'auth/invalid-credential':    'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'auth/user-not-found':        'لا يوجد حساب بهذا البريد الإلكتروني',
        'auth/wrong-password':        'كلمة المرور غير صحيحة',
        'auth/too-many-requests':     'تم تجاوز عدد المحاولات، حاول لاحقاً',
        'auth/network-request-failed':'خطأ في الاتصال بالشبكة، تحقق من الإنترنت',
      };
      setSubmitError(msgs[err.code] || 'حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Left visual panel — hidden on mobile via CSS class */}
      <div className="login-visual-panel" style={styles.visual}>
        <img src="/brand/posters2.png" alt="RoboFab" style={styles.visualImg} />
        <div style={styles.visualOverlay} />
        <div style={styles.visualContent}>
          <img src="/brand/logo.png" alt="RoboFab Logo" style={styles.visualLogo} />
          <div style={styles.visualTitle}>نظام RoboFab المالي</div>
          <div style={styles.visualSub}>منصة الإدارة المالية الاحترافية للشركات الصناعية</div>
          <div style={styles.visualBadges}>
            <span style={styles.badge}>فواتير المبيعات</span>
            <span style={styles.badge}>التقارير المالية</span>
            <span style={styles.badge}>إدارة المخزون</span>
            <span style={styles.badge}>الموارد البشرية</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div style={styles.formPanel}>
        <div style={styles.card}>
          {/* Logo + Brand */}
          <div style={styles.brand}>
            <div style={styles.logoCircle}>
              <img src="/brand/logo.png" alt="RoboFab" style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 8 }} />
            </div>
            <h1 style={styles.brandTitle}>نظام RoboFab المالي</h1>
            <p style={styles.brandSub}>الإصدار الاحترافي — تسجيل الدخول</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={styles.form} noValidate>
            <div style={styles.field}>
              <label style={styles.label}>البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
                style={styles.input}
                autoComplete="email"
                dir="ltr"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={styles.input}
                autoComplete="current-password"
                dir="ltr"
              />
            </div>

            {displayError && (
              <div style={styles.error}>{displayError}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? 'جاري تسجيل الدخول…' : 'تسجيل الدخول'}
            </button>
          </form>

          <p style={styles.footer}>
            نظام RoboFab المالي &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    direction: 'rtl',
    background: '#0c0c0e',
  },
  /* ── Left visual panel (responsive via CSS class login-visual-panel) ── */
  visual: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  visualImg: {
    position: 'absolute', inset: 0,
    width: '100%', height: '100%',
    objectFit: 'cover',
  },
  visualOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(135deg, rgba(12,12,14,0.85) 0%, rgba(12,12,14,0.5) 50%, rgba(249,115,22,0.1) 100%)',
  },
  visualContent: {
    position: 'absolute', inset: 0,
    display: 'flex', flexDirection: 'column',
    justifyContent: 'center', padding: '48px 56px',
  },
  visualLogo: {
    width: 80, height: 80, objectFit: 'contain', borderRadius: 16,
    boxShadow: '0 0 40px rgba(249,115,22,0.4)',
    marginBottom: 28,
  },
  visualTitle: {
    fontSize: 32, fontWeight: 900, color: '#f1f5f9',
    lineHeight: 1.25, marginBottom: 12,
    textShadow: '0 2px 20px rgba(0,0,0,0.5)',
  },
  visualSub: {
    fontSize: 15, color: 'rgba(241,245,249,0.65)',
    marginBottom: 36, lineHeight: 1.7, maxWidth: 360,
  },
  visualBadges: {
    display: 'flex', flexWrap: 'wrap', gap: 8,
  },
  badge: {
    padding: '6px 14px',
    background: 'rgba(249,115,22,0.15)',
    border: '1px solid rgba(249,115,22,0.3)',
    borderRadius: 20, fontSize: 12, color: '#fb923c',
    fontWeight: 600,
  },
  /* ── Right form panel ── */
  formPanel: {
    width: '100%',
    maxWidth: 480,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    background: 'linear-gradient(160deg, #0d0d11 0%, #111115 100%)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    background: '#131318',
    border: '1px solid rgba(255,255,255,0.07)',
    borderTop: '2px solid rgba(249,115,22,0.5)',
    borderRadius: 20,
    boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 60px rgba(249,115,22,0.05)',
    padding: '40px 36px',
  },
  brand: {
    textAlign: 'center',
    marginBottom: 32,
  },
  logoCircle: {
    width: 76, height: 76,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1a0a02, #431407)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    margin: '0 auto 16px',
    boxShadow: '0 0 32px rgba(249,115,22,0.4), 0 8px 24px rgba(249,115,22,0.2)',
    border: '1px solid rgba(249,115,22,0.4)',
  },
  brandTitle: {
    fontSize: 20, fontWeight: 800, color: '#f1f5f9', margin: 0,
  },
  brandSub: {
    fontSize: 12, color: '#6b7280', marginTop: 4,
  },
  form: {
    display: 'flex', flexDirection: 'column', gap: 20,
  },
  field: {
    display: 'flex', flexDirection: 'column', gap: 6,
  },
  label: {
    fontSize: 13, fontWeight: 600, color: '#c4c9d4',
  },
  input: {
    padding: '11px 14px',
    border: '1.5px solid rgba(255,255,255,0.08)',
    borderRadius: 9,
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    background: '#16161b',
    color: '#f1f5f9',
  },
  error: {
    background: 'rgba(239,68,68,0.08)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 8,
    padding: '10px 14px',
    fontSize: 13, color: '#f87171', textAlign: 'center',
  },
  btn: {
    padding: '13px 24px',
    background: 'linear-gradient(135deg, #f97316, #ea6a0a)',
    color: '#fff', border: 'none', borderRadius: 9,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Cairo', 'Segoe UI', sans-serif",
    transition: 'opacity 0.2s, transform 0.1s, box-shadow 0.2s',
    marginTop: 4,
    boxShadow: '0 4px 20px rgba(249,115,22,0.35)',
  },
  footer: {
    textAlign: 'center', fontSize: 11, color: '#3f4451', marginTop: 28,
  },
};
