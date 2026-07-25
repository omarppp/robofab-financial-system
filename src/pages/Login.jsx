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
        'auth/invalid-credential':     'البريد الإلكتروني أو كلمة المرور غير صحيحة',
        'auth/user-not-found':         'لا يوجد حساب بهذا البريد الإلكتروني',
        'auth/wrong-password':         'كلمة المرور غير صحيحة',
        'auth/too-many-requests':      'تم تجاوز عدد المحاولات، حاول لاحقاً',
        'auth/network-request-failed': 'خطأ في الاتصال بالشبكة، تحقق من الإنترنت',
      };
      setSubmitError(msgs[err.code] || 'حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Cairo', 'Segoe UI', sans-serif",
      direction: 'rtl',
    }}>
      {/* Background gradient orb */}
      <div style={{
        position: 'fixed', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(16,185,129,0.07) 0%, transparent 70%)',
      }} />

      <div style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}>
        {/* Logo + Brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 68, height: 68, borderRadius: 18,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(16,185,129,0.30)',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="32" height="32">
              <line x1="18" y1="20" x2="18" y2="10"/>
              <line x1="12" y1="20" x2="12" y2="4"/>
              <line x1="6"  y1="20" x2="6"  y2="14"/>
            </svg>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#1e293b', margin: 0, letterSpacing: '-0.02em' }}>
            النظام المالي
          </h1>
          <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 6, fontWeight: 500 }}>
            نظام RoboFab — إدارة مالية احترافية
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 20,
          padding: '36px 40px',
          boxShadow: '0 10px 40px rgba(15,23,42,0.10), 0 1px 3px rgba(15,23,42,0.06)',
        }}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: '#1e293b', marginBottom: 24 }}>
            تسجيل الدخول
          </h2>

          {displayError && (
            <div style={{
              background: 'rgba(239,68,68,0.07)',
              border: '1px solid rgba(239,68,68,0.20)',
              borderRadius: 10, padding: '11px 14px',
              fontSize: 13, color: '#dc2626',
              marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15" style={{ flexShrink: 0 }}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {displayError}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }} noValidate>
            {/* Email */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="example@company.com"
                autoComplete="email"
                dir="ltr"
                style={{
                  padding: '11px 14px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                dir="ltr"
                style={{
                  padding: '11px 14px',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 8,
                  fontSize: 14,
                  fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.boxShadow = '0 0 0 3px rgba(16,185,129,0.10)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '13px 24px',
                background: loading ? '#6ee7b7' : '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 15,
                fontWeight: 800,
                fontFamily: "'Cairo', 'Segoe UI', sans-serif",
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s, transform 0.1s, box-shadow 0.15s',
                boxShadow: loading ? 'none' : '0 4px 16px rgba(16,185,129,0.30)',
              }}
              onMouseEnter={e => { if (!loading) { e.target.style.background = '#059669'; e.target.style.transform = 'translateY(-1px)'; } }}
              onMouseLeave={e => { if (!loading) { e.target.style.background = '#10b981'; e.target.style.transform = 'none'; } }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <span style={{ width: 16, height: 16, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
                  جارٍ الدخول…
                </span>
              ) : 'دخول'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', marginTop: 20 }}>
          © {new Date().getFullYear()} RoboFab — جميع الحقوق محفوظة
        </p>
      </div>
    </div>
  );
}
