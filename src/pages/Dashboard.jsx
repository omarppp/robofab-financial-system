import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
import { useStore, REPAIR_ORDER_STATUSES, BUSINESS_UNITS } from '../store/useStore';
import { formatCurrency, getLast6Months } from '../utils/helpers';
import { KpiCard, EmptyState } from '../components/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const chartDefaults = {
  plugins: {
    legend: {
      labels: { font: { family: 'Cairo' }, boxWidth: 12, color: '#64748b' },
    },
  },
  scales: {
    x: {
      ticks: { font: { family: 'Cairo' }, color: '#94a3b8' },
      grid: { color: 'rgba(226,232,240,0.8)' },
    },
    y: {
      ticks: { font: { family: 'Cairo' }, color: '#94a3b8', callback: v => v.toLocaleString('ar-SA') },
      grid: { color: 'rgba(226,232,240,0.8)' },
    },
  },
  responsive: true, maintainAspectRatio: false,
};

export default function Dashboard({ onNavigate }) {
  const store = useStore();
  const bu = store.currentBusinessUnit;
  const buLabel = BUSINESS_UNITS[bu]?.label || 'النشاط الرئيسي';
  const buInvoices = store.invoices.filter(i => (i.businessUnitId || 'main') === bu);

  const totalSales         = store.getTotalSales();
  const totalPurchases     = store.getTotalPurchases();
  const totalExpenses      = store.getTotalExpenses();
  const totalReceipts      = store.getTotalReceipts();
  const cashBalance        = store.getCashBalance();
  const bankBalance        = store.getBankBalance();
  const stockValue         = store.getStockValue();

  const overdueInvoices = buInvoices.filter(i => i.status === 'overdue');
  const pendingInvoices = buInvoices.filter(i => i.status === 'pending' || i.status === 'partial');
  const lowStockItems   = store.items.filter(i => (i.businessUnitId || 'main') === bu && i.quantity <= i.minQuantity);

  const months          = getLast6Months();
  const salesByMonth    = months.map(m => buInvoices.filter(i => i.type === 'sale'     && i.status !== 'cancelled' && i.status !== 'draft' && new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year).reduce((s, i) => s + (parseFloat(i.total) || 0), 0));
  const purchasesByMonth = months.map(m => buInvoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year).reduce((s, i) => s + (parseFloat(i.total) || 0), 0));

  const salesChartData = {
    labels: months.map(m => m.label),
    datasets: [
      { label: 'المبيعات',   data: salesByMonth,    backgroundColor: 'rgba(37,99,235,0.82)',   borderRadius: 6 },
      { label: 'المشتريات', data: purchasesByMonth, backgroundColor: 'rgba(59,130,246,0.65)', borderRadius: 6 },
    ],
  };

  const accountsDistribution = {
    labels: ['صندوق نقدي', 'حسابات بنكية', 'عهدة', 'أخرى'],
    datasets: [{
      data: [
        cashBalance, bankBalance,
        store.accounts.filter(a => (a.businessUnitId || 'main') === bu && a.type === 'custody').reduce((s, a) => s + (a.balance || 0), 0),
        store.accounts.filter(a => (a.businessUnitId || 'main') === bu && !['cash','bank','custody'].includes(a.type)).reduce((s, a) => s + (a.balance || 0), 0),
      ],
      backgroundColor: ['#2563eb', '#60a5fa', '#8b5cf6', '#f59e0b'],
      borderWidth: 0, borderColor: 'transparent',
    }],
  };

  const QUICK_ACTIONS = [
    { label: 'فاتورة مبيعات', icon: '📄', page: 'invoices-sale' },
    { label: 'عرض سعر',       icon: '📋', page: 'quotations' },
    { label: 'فاتورة شراء',   icon: '🛒', page: 'invoices-purchase' },
    { label: 'سند صرف',       icon: '💸', page: 'payments' },
    { label: 'سند قبض',       icon: '💰', page: 'receipts' },
    { label: 'تحويل حساب',    icon: '🔄', page: 'transfers' },
    { label: 'عميل جديد',     icon: '👤', page: 'customers' },
    { label: 'مورد جديد',     icon: '🏭', page: 'suppliers' },
  ];

  const todayStr = new Date().toLocaleDateString('ar-EG', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  return (
    <div>
      {/* Hero Banner — gradient, no image */}
      <div className="dashboard-hero">
        <div className="dashboard-hero-content">
          <div>
            <div className="dashboard-hero-title">لوحة تحكم — {buLabel}</div>
            <div className="dashboard-hero-date">{todayStr}</div>
          </div>
          <div className="dashboard-hero-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="22,12 18,12 15,21 9,3 6,12 2,12"/>
            </svg>
            نظرة عامة مالية
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="dashboard-stats-strip">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'rgba(37,99,235,0.10)' }}>
            <span style={{ fontSize: 22 }}>💹</span>
          </div>
          <div>
            <div className="dashboard-stat-label">المبيعات الكلية</div>
            <div className="dashboard-stat-value">{formatCurrency(totalSales)}</div>
          </div>
        </div>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'rgba(59,130,246,0.10)' }}>
            <span style={{ fontSize: 22 }}>🏦</span>
          </div>
          <div>
            <div className="dashboard-stat-label">إجمالي الأرصدة</div>
            <div className="dashboard-stat-value">{formatCurrency(cashBalance + bankBalance)}</div>
          </div>
        </div>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-icon" style={{ background: 'rgba(37,99,235,0.10)' }}>
            <span style={{ fontSize: 22 }}>💰</span>
          </div>
          <div>
            <div className="dashboard-stat-label">المقبوضات الكلية</div>
            <div className="dashboard-stat-value">{formatCurrency(totalReceipts)}</div>
          </div>
        </div>
      </div>

      {/* Joystick Repair Orders Summary (shown only for joystick business) */}
      {bu === 'joystick' && (
        <div className="card mb-4">
          <div className="card-title">ملخص أوامر الصيانة</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {Object.entries(REPAIR_ORDER_STATUSES).filter(([k]) => !['delivered','cancelled'].includes(k)).map(([key, { label, color }]) => (
              <div key={key} className={`kpi-card ${color}`} style={{ padding: 14, cursor: 'pointer' }} onClick={() => onNavigate('repair-orders')}>
                <div className="kpi-label">{label}</div>
                <div className="kpi-value">{store.repairOrders.filter(r => r.status === key).length}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card mb-4">
        <div className="card-title">
          <span>الإجراءات السريعة</span>
        </div>
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map(a => (
            <button key={a.page} className="quick-action-btn" onClick={() => onNavigate(a.page)}>
              <div className="action-icon">
                <span style={{ fontSize: 20 }}>{a.icon}</span>
              </div>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard label="إجمالي المبيعات"  value={formatCurrency(totalSales)}     color="blue"   icon={<span>📈</span>} />
        <KpiCard label="إجمالي المشتريات" value={formatCurrency(totalPurchases)}  color="yellow" icon={<span>🛒</span>} />
        <KpiCard label="إجمالي المصروفات" value={formatCurrency(totalExpenses)}   color="red"    icon={<span>💸</span>} />
        <KpiCard label="إجمالي المقبوضات" value={formatCurrency(totalReceipts)}   color="green"  icon={<span>💰</span>} />
        <KpiCard label="رصيد الصندوق"     value={formatCurrency(cashBalance)}     color="info"   icon={<span>🏦</span>} />
        <KpiCard label="أرصدة البنوك"     value={formatCurrency(bankBalance)}     color="purple" icon={<span>🏛️</span>} />
        <KpiCard label="قيمة المخزون"     value={formatCurrency(stockValue)}      color="info"   icon={<span>📦</span>} />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">المبيعات مقابل المشتريات (آخر 6 أشهر) — {buLabel}</div>
          <div className="chart-container" style={{ height: 260 }}>
            <Bar
              data={salesChartData}
              options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { ...chartDefaults.plugins.legend, position: 'top' } } }}
            />
          </div>
        </div>
        <div className="card">
          <div className="card-title">توزيع الأرصدة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
            <div className="chart-container" style={{ height: 200 }}>
              <Doughnut
                data={accountsDistribution}
                options={{ ...chartDefaults, scales: undefined, cutout: '65%', plugins: { legend: { display: false } } }}
              />
            </div>
            <div>
              {accountsDistribution.labels.map((label, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: accountsDistribution.datasets[0].backgroundColor[i], display: 'inline-block', flexShrink: 0 }} />
                    {label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>
                    {formatCurrency(accountsDistribution.datasets[0].data[i])}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">أحدث الفواتير — {buLabel}</div>
        {buInvoices.length === 0 ? (
          <EmptyState title="لا توجد فواتير" message="ابدأ بإنشاء فاتورتك الأولى" />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الرقم</th>
                  <th>النوع</th>
                  <th>المبلغ</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {buInvoices.slice(-6).reverse().map(inv => (
                  <tr key={inv.id}>
                    <td className="font-bold">{inv.number}</td>
                    <td>{inv.type === 'sale' ? 'مبيعات' : inv.type === 'purchase' ? 'شراء' : 'مصروف'}</td>
                    <td className="number-cell">{formatCurrency(inv.total)}</td>
                    <td><InvoiceStatusBadge status={inv.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 20 }}>
        <div className="card">
          <div className="card-title">
            <span style={{ color: 'var(--danger-dark)' }}>فواتير متأخرة ({overdueInvoices.length})</span>
          </div>
          {overdueInvoices.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>لا توجد فواتير متأخرة ✓</p>
          ) : overdueInvoices.slice(0, 5).map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span className="font-bold">{inv.number}</span>
              <span className="amount-negative">{formatCurrency(inv.total)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">
            <span style={{ color: 'var(--warning-dark)' }}>فواتير معلقة ({pendingInvoices.length})</span>
          </div>
          {pendingInvoices.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>لا توجد فواتير معلقة ✓</p>
          ) : pendingInvoices.slice(0, 5).map(inv => (
            <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span className="font-bold">{inv.number}</span>
              <span className="font-bold">{formatCurrency(inv.total)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title">
            <span style={{ color: 'var(--danger-dark)' }}>مخزون منخفض ({lowStockItems.length})</span>
          </div>
          {lowStockItems.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: 20 }}>المخزون جيد ✓</p>
          ) : lowStockItems.slice(0, 5).map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
              <span>{item.name}</span>
              <span className="amount-negative">{item.quantity} {item.unit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accounts Summary */}
      <div className="card mt-4">
        <div className="card-title">ملخص الحسابات المالية</div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>اسم الحساب</th>
                <th>النوع</th>
                <th>الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {store.accounts.filter(a => a.active && (a.businessUnitId || 'main') === bu).map(acc => (
                <tr key={acc.id}>
                  <td className="font-bold">{acc.name}</td>
                  <td><span className={`account-type-badge type-${acc.type}`}>{getAccountTypeLabel(acc.type)}</span></td>
                  <td className={`number-cell ${acc.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(acc.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InvoiceStatusBadge({ status }) {
  const map = {
    draft:     ['مسودة',  'muted'],
    pending:   ['معلقة',  'warning'],
    partial:   ['جزئي',   'info'],
    paid:      ['مدفوعة', 'success'],
    overdue:   ['متأخرة', 'danger'],
    cancelled: ['ملغاة',  'danger'],
  };
  const [label, color] = map[status] || ['غير محدد', 'muted'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}

function getAccountTypeLabel(type) {
  const types = {
    cash: 'صندوق', bank: 'بنك', expense: 'مصروفات', income: 'إيرادات',
    capital: 'رأس مال', custody: 'عهدة', receivable: 'مدينون',
    payable: 'دائنون', transport: 'نقل', other: 'أخرى',
  };
  return types[type] || type;
}
