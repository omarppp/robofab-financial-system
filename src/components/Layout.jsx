import { useState } from 'react';
import { useStore } from '../store/useStore';

const NAV = [
  {
    section: 'الرئيسية',
    items: [
      { key: 'dashboard', label: 'لوحة التحكم', icon: <HomeIcon /> },
    ]
  },
  {
    section: 'المبيعات',
    items: [
      { key: 'invoices-sale',  label: 'فواتير المبيعات', icon: <InvoiceIcon /> },
      { key: 'quotations',     label: 'عروض الأسعار',    icon: <QuoteIcon />   },
      { key: 'sales-orders',   label: 'أوامر البيع',     icon: <OrderIcon />   },
      { key: 'customers',      label: 'العملاء',          icon: <PeopleIcon />  },
    ]
  },
  {
    section: 'المشتريات',
    items: [
      { key: 'invoices-purchase', label: 'فواتير الشراء', icon: <ShoppingIcon /> },
      { key: 'purchase-orders',   label: 'أوامر الشراء',  icon: <OrderIcon />    },
      { key: 'suppliers',         label: 'الموردون',       icon: <TruckIcon />    },
    ]
  },
  {
    section: 'الحسابات',
    items: [
      { key: 'accounts',          label: 'الحسابات المالية',      icon: <AccountIcon /> },
      { key: 'transfers',         label: 'التحويلات',              icon: <TransferIcon /> },
      { key: 'payments',          label: 'المدفوعات',              icon: <PaymentIcon /> },
      { key: 'receipts',          label: 'المقبوضات',              icon: <ReceiptIcon /> },
      { key: 'invoices-expense',  label: 'المصروفات',              icon: <ExpenseIcon /> },
    ]
  },
  {
    section: 'المستودع',
    items: [
      { key: 'items',      label: 'الأصناف',       icon: <BoxIcon />        },
      { key: 'warehouses', label: 'المستودعات',    icon: <WarehouseIcon />  },
      { key: 'production', label: 'أوامر الإنتاج', icon: <ProductionIcon /> },
    ]
  },
  {
    section: 'الموارد البشرية',
    items: [
      { key: 'employees', label: 'الموظفون', icon: <EmployeeIcon /> },
    ]
  },
  {
    section: 'الأصول',
    items: [
      { key: 'assets', label: 'الأصول الثابتة', icon: <AssetIcon /> },
    ]
  },
  {
    section: 'التقارير',
    items: [
      { key: 'reports', label: 'التقارير المالية', icon: <ReportIcon /> },
    ]
  },
  {
    section: 'الإعدادات',
    items: [
      { key: 'settings', label: 'الإعدادات', icon: <SettingsIcon /> },
    ]
  },
];

export default function Layout({ activePage, onNavigate, authUser, onLogout, children }) {
  const { sidebarCollapsed, toggleSidebar } = useStore();
  const [mobileOpen, setMobileOpen]         = useState(false);

  const displayName = authUser?.name
    || authUser?.email?.split('@')[0]
    || 'مستخدم';

  const displayEmail = authUser?.email || '';

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <img src="/brand/logo.png" alt="RoboFab" />
          {!sidebarCollapsed && (
            <div className="sidebar-logo-text">
              نظام RoboFab المالي
              <span>الإصدار الاحترافي 1.0</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          {NAV.map(section => (
            <div key={section.section}>
              <div className="nav-section-label">{section.section}</div>
              {section.items.map(item => (
                <div
                  key={item.key}
                  className={`nav-item ${activePage === item.key ? 'active' : ''}`}
                  onClick={() => { onNavigate(item.key); setMobileOpen(false); }}
                  title={sidebarCollapsed ? item.label : ''}
                >
                  {item.icon}
                  <span className="nav-item-text">{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>

        {!sidebarCollapsed && (
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
            © {new Date().getFullYear()} نظام RoboFab المالي
          </div>
        )}
      </div>

      {/* Main */}
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button className="toggle-sidebar-btn" onClick={toggleSidebar} title="تبديل القائمة">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              <div className="topbar-title">{getPageTitle(activePage)}</div>
            </div>
          </div>

          <div className="topbar-right">
            <div style={{ fontSize: 12, color: 'var(--text-muted)', direction: 'rtl' }}>
              {new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>

            <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div>
                <div className="user-name" style={{ textAlign: 'right' }}>{displayName}</div>
                <div className="user-role" style={{ direction: 'ltr', fontSize: 10, color: 'var(--text-muted)' }}>
                  {displayEmail}
                </div>
              </div>
              <div className="user-avatar">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={onLogout}
                title="تسجيل الخروج"
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  padding: '5px 8px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  transition: 'color 0.2s, border-color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.borderColor = 'var(--danger)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                خروج
              </button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}

function getPageTitle(page) {
  const titles = {
    dashboard:          'لوحة التحكم الرئيسية',
    'invoices-sale':    'فواتير المبيعات',
    'invoices-purchase':'فواتير الشراء',
    'invoices-expense': 'فواتير المصروفات',
    quotations:         'عروض الأسعار',
    'sales-orders':     'أوامر البيع',
    'purchase-orders':  'أوامر الشراء',
    customers:          'إدارة العملاء',
    suppliers:          'إدارة الموردين',
    accounts:           'الحسابات المالية',
    transfers:          'التحويلات بين الحسابات',
    payments:           'سندات الصرف',
    receipts:           'سندات القبض',
    items:              'الأصناف والمخزون',
    warehouses:         'المستودعات',
    production:         'أوامر الإنتاج',
    employees:          'الموظفون',
    assets:             'الأصول الثابتة',
    reports:            'التقارير المالية',
    settings:           'الإعدادات',
  };
  return titles[page] || 'نظام RoboFab المالي';
}

// ---- Icons ----
function HomeIcon()       { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>; }
function InvoiceIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>; }
function QuoteIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>; }
function OrderIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
function PeopleIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function ShoppingIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>; }
function TruckIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16,8 20,8 23,11 23,16 16,16 16,8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>; }
function AccountIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
function TransferIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17,1 21,5 17,9"/><path d="M3 11V9a4 4 0 014-4h14M7,23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg>; }
function PaymentIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>; }
function ReceiptIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20,12 20,22 4,22 4,12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>; }
function ExpenseIcon()    { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
function BoxIcon()        { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/><polyline points="3.27,6.96 12,12.01 20.73,6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>; }
function WarehouseIcon()  { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg>; }
function ProductionIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M21 12h-2M5 12H3M18.66 18.66l-1.41-1.41M6.75 6.75L5.34 5.34M12 19v2M12 3V1M17.66 6.75l1.41-1.41"/></svg>; }
function EmployeeIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function AssetIcon()      { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>; }
function ReportIcon()     { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function SettingsIcon()   { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93l-1.41 1.41M5.34 18.66l-1.41 1.41M21 12h-2M5 12H3M18.66 18.66l-1.41-1.41M6.75 6.75L5.34 5.34M12 19v2M12 3V1M17.66 6.75l1.41-1.41"/></svg>; }
