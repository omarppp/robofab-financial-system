import { useState, useRef, useEffect } from 'react';
import { useStore, BUSINESS_UNITS } from '../store/useStore';
import {
  Home, FileText, MessageSquare, ShoppingCart, Users, Building2,
  CreditCard, ArrowLeftRight, DollarSign, Banknote, AlertCircle,
  Package, Warehouse, Factory, User, BarChart2,
  Settings, LogOut, Menu, Wrench, Handshake, ChevronDown,
} from 'lucide-react';

// Full nav items definition
const ALL_NAV = [
  { key: 'dashboard',         label: 'لوحة التحكم',       Icon: Home },
  { key: 'invoices-sale',     label: 'فواتير المبيعات',   Icon: FileText },
  { key: 'quotations',        label: 'عروض الأسعار',      Icon: MessageSquare },
  { key: 'sales-orders',      label: 'أوامر البيع',       Icon: ShoppingCart },
  { key: 'customers',         label: 'العملاء',            Icon: Users },
  { key: 'invoices-purchase', label: 'فواتير الشراء',     Icon: ShoppingCart },
  { key: 'purchase-orders',   label: 'أوامر الشراء',      Icon: ShoppingCart },
  { key: 'suppliers',         label: 'الموردون',           Icon: Building2 },
  { key: 'accounts',          label: 'الحسابات المالية',  Icon: CreditCard },
  { key: 'transfers',         label: 'التحويلات',          Icon: ArrowLeftRight },
  { key: 'payments',          label: 'المدفوعات',          Icon: DollarSign },
  { key: 'receipts',          label: 'المقبوضات',          Icon: Banknote },
  { key: 'invoices-expense',  label: 'المصروفات',          Icon: AlertCircle },
  { key: 'items',             label: 'الأصناف',            Icon: Package },
  { key: 'warehouses',        label: 'المستودعات',         Icon: Warehouse },
  { key: 'production',        label: 'أوامر الإنتاج',      Icon: Factory },
  { key: 'employees',         label: 'الموظفون',           Icon: User },
  { key: 'assets',            label: 'الأصول الثابتة',    Icon: Building2 },
  { key: 'repair-orders',     label: 'أوامر الصيانة',     Icon: Wrench },
  { key: 'reports',           label: 'التقارير المالية',   Icon: BarChart2 },
  { key: 'settings',          label: 'الإعدادات',          Icon: Settings },
];

// Keys visible per business unit
const BU_NAV_KEYS = {
  main: [
    'dashboard',
    'invoices-sale', 'quotations', 'sales-orders', 'customers',
    'invoices-purchase', 'purchase-orders', 'suppliers',
    'accounts', 'transfers', 'payments', 'receipts', 'invoices-expense',
    'items', 'warehouses', 'production',
    'employees', 'assets',
    'reports', 'settings',
  ],
  chandeliers: [
    'dashboard',
    'invoices-sale', 'customers',
    'invoices-purchase', 'suppliers',
    'accounts', 'payments', 'receipts', 'invoices-expense',
    'items',
    'reports', 'settings',
  ],
  holders: [
    'dashboard',
    'invoices-sale', 'customers',
    'invoices-purchase', 'suppliers',
    'accounts', 'payments', 'receipts', 'invoices-expense',
    'items', 'production',
    'reports', 'settings',
  ],
  joystick: [
    'dashboard',
    'repair-orders',
    'invoices-sale', 'customers',
    'accounts', 'payments', 'receipts', 'invoices-expense',
    'items',
    'reports', 'settings',
  ],
};

const SECTION_MAP = {
  dashboard: 'الرئيسية',
  'invoices-sale': 'المبيعات', quotations: 'المبيعات', 'sales-orders': 'المبيعات', customers: 'المبيعات',
  'repair-orders': 'الصيانة',
  'invoices-purchase': 'المشتريات', 'purchase-orders': 'المشتريات', suppliers: 'المشتريات',
  accounts: 'الحسابات', transfers: 'الحسابات', payments: 'الحسابات', receipts: 'الحسابات', 'invoices-expense': 'الحسابات',
  items: 'المستودع', warehouses: 'المستودع', production: 'المستودع',
  employees: 'الموارد البشرية',
  assets: 'الأصول',
  reports: 'التقارير',
  settings: 'الإعدادات',
};

function buildNav(bu) {
  const keys = BU_NAV_KEYS[bu] || BU_NAV_KEYS.main;
  const sections = [];
  const seen = {};
  keys.forEach(k => {
    const item = ALL_NAV.find(n => n.key === k);
    if (!item) return;
    const sec = SECTION_MAP[k] || 'أخرى';
    if (!seen[sec]) { seen[sec] = true; sections.push({ section: sec, items: [] }); }
    sections[sections.length - 1].items.push(item);
  });
  return sections;
}

export default function Layout({ activePage, onNavigate, authUser, onLogout, children }) {
  const { sidebarCollapsed, toggleSidebar, currentBusinessUnit, setBusinessUnit } = useStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [buDropOpen, setBuDropOpen] = useState(false);
  const dropRef = useRef(null);

  const displayName = authUser?.name || authUser?.email?.split('@')[0] || 'مستخدم';
  const displayEmail = authUser?.email || '';

  const nav = buildNav(currentBusinessUnit);
  const currentBuInfo = BUSINESS_UNITS[currentBusinessUnit] || BUSINESS_UNITS.main;

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setBuDropOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleBuSelect = (bu) => {
    setBusinessUnit(bu);
    setBuDropOpen(false);
    onNavigate('dashboard');
  };

  return (
    <div className="app-layout">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="drawer-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}
      >
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <BarChart2 size={20} strokeWidth={2} />
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-logo-text">
              النظام المالي
              <span>RoboFab v1.0</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="sidebar-nav">
          {nav.map((section) => (
            <div key={section.section}>
              {!sidebarCollapsed && (
                <div className="nav-section-label">{section.section}</div>
              )}
              {section.items.map(({ key, label, Icon }) => (
                <div
                  key={key}
                  className={`nav-item ${activePage === key ? 'active' : ''}`}
                  onClick={() => { onNavigate(key); setMobileOpen(false); }}
                  title={sidebarCollapsed ? label : ''}
                >
                  <Icon size={17} strokeWidth={1.75} />
                  <span className="nav-item-text">{label}</span>
                </div>
              ))}
            </div>
          ))}

          {/* Partners — always visible for all businesses */}
          {!sidebarCollapsed && <div className="nav-section-label">الشركاء</div>}
          <div
            className={`nav-item ${activePage === 'partners' ? 'active' : ''}`}
            onClick={() => { onNavigate('partners'); setMobileOpen(false); }}
            title={sidebarCollapsed ? 'الشركاء' : ''}
          >
            <Handshake size={17} strokeWidth={1.75} />
            <span className="nav-item-text">الشركاء</span>
          </div>
        </nav>

        {!sidebarCollapsed && (
          <div className="sidebar-footer">
            © {new Date().getFullYear()} RoboFab المالي
          </div>
        )}
      </div>

      {/* Main */}
      <div className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <button
              className="toggle-sidebar-btn"
              onClick={() => { toggleSidebar(); setMobileOpen(o => !o); }}
              title="تبديل القائمة"
            >
              <Menu size={20} strokeWidth={2} />
            </button>

            {/* Business Switcher */}
            <div ref={dropRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setBuDropOpen(o => !o)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 20,
                  background: currentBuInfo.color + '18',
                  border: `1.5px solid ${currentBuInfo.color}50`,
                  color: currentBuInfo.color,
                  fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.15s',
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: currentBuInfo.color, flexShrink: 0 }} />
                {currentBuInfo.short || currentBuInfo.label}
                <ChevronDown size={12} />
              </button>
              {buDropOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: 6,
                  background: '#fff', borderRadius: 10, padding: 6,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid #e2e8f0',
                  zIndex: 1000, minWidth: 190,
                }}>
                  {Object.entries(BUSINESS_UNITS).map(([bu, { label, color }]) => (
                    <button
                      key={bu}
                      onClick={() => handleBuSelect(bu)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '9px 12px', border: 'none',
                        borderRadius: 8,
                        background: currentBusinessUnit === bu ? color + '15' : 'transparent',
                        cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit',
                        fontSize: 13, fontWeight: currentBusinessUnit === bu ? 700 : 500,
                        color: currentBusinessUnit === bu ? color : '#374151',
                      }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="topbar-title">{getPageTitle(activePage)}</div>
          </div>

          <div className="topbar-right">
            <div className="topbar-date">
              {new Date().toLocaleDateString('ar-EG', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </div>

            <div className="user-badge">
              <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
              <div>
                <div className="user-name">{displayName}</div>
                <div className="user-role" style={{ direction: 'ltr', fontSize: 10 }}>{displayEmail}</div>
              </div>
            </div>

            <button className="logout-btn" onClick={onLogout} title="تسجيل الخروج">
              <LogOut size={14} strokeWidth={2} />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Page content */}
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

function getPageTitle(page) {
  const titles = {
    dashboard:           'لوحة التحكم الرئيسية',
    'invoices-sale':     'فواتير المبيعات',
    'invoices-purchase': 'فواتير الشراء',
    'invoices-expense':  'فواتير المصروفات',
    quotations:          'عروض الأسعار',
    'sales-orders':      'أوامر البيع',
    'purchase-orders':   'أوامر الشراء',
    customers:           'إدارة العملاء',
    suppliers:           'إدارة الموردين',
    accounts:            'الحسابات المالية',
    transfers:           'التحويلات بين الحسابات',
    payments:            'سندات الصرف',
    receipts:            'سندات القبض',
    items:               'الأصناف والمخزون',
    warehouses:          'المستودعات',
    production:          'أوامر الإنتاج',
    employees:           'الموظفون',
    assets:              'الأصول الثابتة',
    reports:             'التقارير المالية',
    settings:            'الإعدادات',
    partners:            'الشركاء',
    'repair-orders':     'أوامر الصيانة',
  };
  return titles[page] || 'النظام المالي';
}
