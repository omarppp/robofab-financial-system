import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { useStore } from './store/useStore';
import Layout from './components/Layout';
import { ToastContainer, ConfirmProvider } from './components/UI';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Accounts from './pages/Accounts';
import Transfers from './pages/Transfers';
import PaymentsReceipts from './pages/PaymentsReceipts';
import Items from './pages/Items';
import Warehouses from './pages/Warehouses';
import Production from './pages/Production';
import Employees from './pages/Employees';
import Quotations from './pages/Quotations';
import Assets from './pages/Assets';
import Orders from './pages/Orders';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

const SPIN = `@keyframes spin { to { transform: rotate(360deg); } }`;

// ── Auth/app loading screen ──
function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'radial-gradient(ellipse at 30% 50%, rgba(249,115,22,0.08) 0%, transparent 60%), linear-gradient(160deg, #0c0c0e 0%, #111115 50%, #0d0d11 100%)',
      gap: 20, fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl',
    }}>
      <img src="/brand/logo.png" alt="RoboFab" style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 16, boxShadow: '0 0 32px rgba(249,115,22,0.3)' }} />
      <div style={{ color: '#f1f5f9', fontSize: 16, fontWeight: 700, letterSpacing: '0.02em' }}>
        نظام RoboFab المالي
      </div>
      <div style={{
        width: 36, height: 36,
        border: '3px solid rgba(249,115,22,0.2)',
        borderTop: '3px solid #f97316',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <style>{SPIN}</style>
    </div>
  );
}

// ── Firestore data loading screen ──
function DataLoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0c0c0e', gap: 16,
      fontFamily: "'Cairo','Segoe UI',sans-serif", direction: 'rtl',
    }}>
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(249,115,22,0.15)', borderTop: '3px solid #f97316',
        borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ color: '#6b7280', fontSize: 14 }}>جاري تحميل بيانات النظام…</div>
      <style>{SPIN}</style>
    </div>
  );
}

// ── Error screen ──
function ErrorScreen({ title, message, hint, onRetry, onLogout }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#0c0c0e', fontFamily: "'Cairo','Segoe UI',sans-serif",
      direction: 'rtl', padding: 16,
    }}>
      <div style={{
        background: '#131318', borderRadius: 16, padding: '36px 32px',
        border: '1px solid rgba(239,68,68,0.2)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)', maxWidth: 460, width: '100%',
        textAlign: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'rgba(239,68,68,0.1)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
          border: '1px solid rgba(239,68,68,0.2)',
        }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" width="32" height="32">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>

        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 10 }}>
          {title || 'خطأ في تحميل البيانات'}
        </h2>

        <p style={{
          fontSize: 13, color: '#9ca3af', marginBottom: hint ? 12 : 24,
          lineHeight: 1.8, background: '#16161b',
          borderRadius: 8, padding: '12px 16px',
        }}>
          {message}
        </p>

        {hint && (
          <p style={{ fontSize: 12, color: '#4b5563', marginBottom: 24, lineHeight: 1.7 }}>
            {hint}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {onRetry && (
            <button onClick={onRetry} style={{
              padding: '10px 24px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #f97316, #ea6a0a)', color: '#fff', fontSize: 14,
              fontWeight: 600, cursor: 'pointer',
              fontFamily: "'Cairo','Segoe UI',sans-serif",
              boxShadow: '0 4px 16px rgba(249,115,22,0.3)',
            }}>
              إعادة المحاولة
            </button>
          )}
          <button onClick={onLogout} style={{
            padding: '10px 24px', borderRadius: 8,
            border: '1.5px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: '#9ca3af', fontSize: 14,
            fontWeight: 600, cursor: 'pointer',
            fontFamily: "'Cairo','Segoe UI',sans-serif",
          }}>
            تسجيل الخروج
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main authenticated app ──
function AuthenticatedApp() {
  const { user, userProfile, logout } = useAuth();
  const { loadFromFirestore, retryLoad, clearStore, dataLoaded, loadingData, dataError } = useStore();
  const [page, setPage] = useState('dashboard');

  const profileOk = userProfile?.isActive === true && userProfile?.role === 'owner';

  useEffect(() => {
    if (profileOk && !dataLoaded && !loadingData) {
      loadFromFirestore();
    }
  }, [profileOk, dataLoaded, loadingData, loadFromFirestore]);

  const handleLogout = async () => {
    clearStore();
    await logout();
  };

  const handleRetry = () => { retryLoad(); };

  if (loadingData) return <DataLoadingScreen />;

  if (dataError) {
    const isPermission = dataError.includes('صلاحية');
    return (
      <ErrorScreen
        message={dataError}
        hint={isPermission
          ? 'تأكد من تفعيل Firestore Security Rules في Firebase Console وأن المستخدم لديه صلاحية القراءة.'
          : undefined}
        onRetry={handleRetry}
        onLogout={handleLogout}
      />
    );
  }

  if (!dataLoaded) return <DataLoadingScreen />;

  const navigate = (p) => setPage(p);

  const renderPage = () => {
    switch (page) {
      case 'dashboard':        return <Dashboard onNavigate={navigate} />;
      case 'invoices-sale':    return <Invoices type="sale" />;
      case 'invoices-purchase':return <Invoices type="purchase" />;
      case 'invoices-expense': return <Invoices type="expense" />;
      case 'quotations':       return <Quotations />;
      case 'sales-orders':     return <Orders initialTab="sales" />;
      case 'purchase-orders':  return <Orders initialTab="purchase" />;
      case 'customers':        return <Customers onNavigate={navigate} />;
      case 'suppliers':        return <Suppliers onNavigate={navigate} />;
      case 'accounts':         return <Accounts />;
      case 'transfers':        return <Transfers />;
      case 'payments':         return <PaymentsReceipts initialTab="payments" />;
      case 'receipts':         return <PaymentsReceipts initialTab="receipts" />;
      case 'items':            return <Items />;
      case 'warehouses':       return <Warehouses />;
      case 'production':       return <Production />;
      case 'employees':        return <Employees />;
      case 'assets':           return <Assets />;
      case 'reports':          return <Reports />;
      case 'settings':         return <Settings />;
      default:                 return <Dashboard onNavigate={navigate} />;
    }
  };

  return (
    <>
      <ToastContainer />
      <ConfirmProvider />
      <Layout activePage={page} onNavigate={navigate} authUser={user} onLogout={handleLogout}>
        {renderPage()}
      </Layout>
    </>
  );
}

// ── App router ──
function AppRouter() {
  const { user, userProfile, loading, authError, logout } = useAuth();

  if (loading) return <LoadingScreen />;

  if (authError && user) {
    return (
      <ErrorScreen
        title="تعذّر تحميل الملف الشخصي"
        message={authError}
        hint="تحقق من إعدادات Firestore Security Rules أو تواصل مع مدير النظام."
        onLogout={logout}
      />
    );
  }

  if (!user) return <Login />;
  if (!userProfile) return <LoadingScreen />;

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
