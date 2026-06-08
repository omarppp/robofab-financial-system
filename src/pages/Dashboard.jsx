import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { useStore } from '../store/useStore';
import { formatCurrency, getLast6Months } from '../utils/helpers';
import { KpiCard, EmptyState } from '../components/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const chartDefaults = {
  plugins: {
    legend: {
      labels: { font: { family: 'Cairo' }, boxWidth: 12, color: '#9ca3af' },
    },
  },
  scales: {
    x: {
      ticks: { font: { family: 'Cairo' }, color: '#6b7280' },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
    y: {
      ticks: { font: { family: 'Cairo' }, color: '#6b7280', callback: v => v.toLocaleString('ar-SA') },
      grid: { color: 'rgba(255,255,255,0.05)' },
    },
  },
  responsive: true, maintainAspectRatio: false,
};

export default function Dashboard({ onNavigate }) {
  const store = useStore();
  const totalSales = store.getTotalSales();
  const totalPurchases = store.getTotalPurchases();
  const totalExpenses = store.getTotalExpenses();
  const totalReceipts = store.getTotalReceipts();
  const netProfit = totalSales - totalPurchases - totalExpenses;
  const cashBalance = store.getCashBalance();
  const bankBalance = store.getBankBalance();
  const stockValue = store.getStockValue();
  const customerReceivables = store.getCustomerReceivables();
  const supplierPayables = store.getSupplierPayables();
  const capitalBalance = store.accounts.filter(a => a.type === 'capital').reduce((s, a) => s + (a.balance || 0), 0);

  const overdueInvoices = store.invoices.filter(i => i.status === 'overdue');
  const pendingInvoices = store.invoices.filter(i => i.status === 'pending' || i.status === 'partial');
  const lowStockItems = store.items.filter(i => i.quantity <= i.minQuantity);

  const months = getLast6Months();
  const salesByMonth = months.map(m => store.invoices.filter(i => i.type === 'sale' && i.status !== 'cancelled' && i.status !== 'draft' && new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year).reduce((s, i) => s + (parseFloat(i.total) || 0), 0));
  const purchasesByMonth = months.map(m => store.invoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year).reduce((s, i) => s + (parseFloat(i.total) || 0), 0));

  const salesChartData = {
    labels: months.map(m => m.label),
    datasets: [
      { label: 'المبيعات', data: salesByMonth, backgroundColor: 'rgba(249,115,22,0.8)', borderRadius: 6 },
      { label: 'المشتريات', data: purchasesByMonth, backgroundColor: 'rgba(56,189,248,0.6)', borderRadius: 6 },
    ]
  };

  const profitChartData = {
    labels: months.map(m => m.label),
    datasets: [
      { label: 'الإيرادات', data: salesByMonth, borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#22c55e' },
      { label: 'المصروفات', data: purchasesByMonth.map((v, i) => v + (salesByMonth[i] * 0.1)), borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.08)', fill: true, tension: 0.4, pointBackgroundColor: '#ef4444' },
    ]
  };

  const accountsDistribution = {
    labels: ['صندوق نقدي', 'حسابات بنكية', 'رأس المال', 'عهدة'],
    datasets: [{ data: [cashBalance, bankBalance, capitalBalance, store.accounts.filter(a => a.type === 'custody').reduce((s, a) => s + (a.balance || 0), 0)], backgroundColor: ['#f97316', '#22c55e', '#a855f7', '#38bdf8'], borderWidth: 0, borderColor: 'transparent' }]
  };

  const QUICK_ACTIONS = [
    { label: 'فاتورة مبيعات', icon: '📄', page: 'invoices-sale', color: '#2563a8' },
    { label: 'عرض سعر', icon: '📋', page: 'quotations', color: '#7c3aed' },
    { label: 'فاتورة شراء', icon: '🛒', page: 'invoices-purchase', color: '#d97706' },
    { label: 'سند صرف', icon: '💸', page: 'payments', color: '#dc2626' },
    { label: 'سند قبض', icon: '💰', page: 'receipts', color: '#16a34a' },
    { label: 'تحويل حساب', icon: '🔄', page: 'transfers', color: '#0284c7' },
    { label: 'عميل جديد', icon: '👤', page: 'customers', color: '#0891b2' },
    { label: 'مورد جديد', icon: '🏭', page: 'suppliers', color: '#059669' },
  ];

  const todayStr = new Date().toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  return (
    <div>
      {/* Hero Image Banner */}
      <div className="dashboard-hero">
        <img src="/brand/posters2.png" alt="" className="dashboard-hero-img" />
        <div className="dashboard-hero-content">
          <div className="dashboard-hero-title">مرحباً بك في نظام RoboFab المالي</div>
          <div className="dashboard-hero-date">{todayStr}</div>
        </div>
      </div>

      {/* Stats Strip — separate cards below the hero image */}
      <div className="dashboard-stats-strip">
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">صافي الربح</div>
          <div className="dashboard-stat-value" style={{ color: netProfit >= 0 ? 'var(--success)' : 'var(--danger)' }}>{formatCurrency(netProfit)}</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">إجمالي الأرصدة</div>
          <div className="dashboard-stat-value">{formatCurrency(cashBalance + bankBalance)}</div>
        </div>
        <div className="dashboard-stat-card">
          <div className="dashboard-stat-label">المبيعات الكلية</div>
          <div className="dashboard-stat-value">{formatCurrency(totalSales)}</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card mb-4">
        <div className="card-title">
          <span>الإجراءات السريعة</span>
        </div>
        <div className="quick-actions-grid">
          {QUICK_ACTIONS.map(a => (
            <button key={a.page} className="quick-action-btn" onClick={() => onNavigate(a.page)}>
              <span style={{ fontSize: 24 }}>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard label="إجمالي المبيعات" value={formatCurrency(totalSales)} color="blue" icon={<span>📈</span>} />
        <KpiCard label="إجمالي المشتريات" value={formatCurrency(totalPurchases)} color="yellow" icon={<span>🛒</span>} />
        <KpiCard label="إجمالي المصروفات" value={formatCurrency(totalExpenses)} color="red" icon={<span>💸</span>} />
        <KpiCard label="إجمالي المقبوضات" value={formatCurrency(totalReceipts)} color="green" icon={<span>💰</span>} />
        <KpiCard label="صافي الربح/الخسارة" value={formatCurrency(netProfit)} color={netProfit >= 0 ? 'green' : 'red'} icon={<span>{netProfit >= 0 ? '✅' : '❌'}</span>} />
        <KpiCard label="رصيد الصندوق" value={formatCurrency(cashBalance)} color="info" icon={<span>🏦</span>} />
        <KpiCard label="أرصدة البنوك" value={formatCurrency(bankBalance)} color="purple" icon={<span>🏛️</span>} />
        <KpiCard label="حسابات العملاء" value={formatCurrency(customerReceivables)} color="blue" icon={<span>👥</span>} />
        <KpiCard label="حسابات الموردين" value={formatCurrency(supplierPayables)} color="yellow" icon={<span>🏭</span>} />
        <KpiCard label="قيمة المخزون" value={formatCurrency(stockValue)} color="info" icon={<span>📦</span>} />
        <KpiCard label="رأس المال" value={formatCurrency(capitalBalance)} color="purple" icon={<span>💎</span>} />
        <KpiCard label="فواتير متأخرة" value={overdueInvoices.length} color="red" icon={<span>⚠️</span>} />
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card">
          <div className="card-title">المبيعات مقابل المشتريات (آخر 6 أشهر)</div>
          <div className="chart-container" style={{ height: 260 }}>
            <Bar data={salesChartData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { ...chartDefaults.plugins.legend, position: 'top' } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-title">منحنى الإيرادات والمصروفات</div>
          <div className="chart-container" style={{ height: 260 }}>
            <Line data={profitChartData} options={{ ...chartDefaults, plugins: { ...chartDefaults.plugins, legend: { ...chartDefaults.plugins.legend, position: 'top' } } }} />
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-title">توزيع الأرصدة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'center' }}>
            <div className="chart-container" style={{ height: 200 }}>
              <Doughnut data={accountsDistribution} options={{ ...chartDefaults, scales: undefined, cutout: '65%', plugins: { legend: { display: false } } }} />
            </div>
            <div>
              {accountsDistribution.labels.map((label, i) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: accountsDistribution.datasets[0].backgroundColor[i], display: 'inline-block' }} />
                    {label}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{formatCurrency(accountsDistribution.datasets[0].data[i])}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">أحدث الفواتير</div>
          {store.invoices.length === 0 ? (
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
                  {store.invoices.slice(-6).reverse().map(inv => (
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
      </div>

      {/* Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginTop: 20 }}>
        <div className="card">
          <div className="card-title" style={{ color: '#f87171' }}>⚠️ فواتير متأخرة ({overdueInvoices.length})</div>
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
          <div className="card-title" style={{ color: '#fbbf24' }}>🕐 فواتير معلقة ({pendingInvoices.length})</div>
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
          <div className="card-title" style={{ color: '#f87171' }}>📦 مخزون منخفض ({lowStockItems.length})</div>
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
              {store.accounts.filter(a => a.active).map(acc => (
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
  const map = { draft: ['مسودة', 'muted'], pending: ['معلقة', 'warning'], partial: ['جزئي', 'info'], paid: ['مدفوعة', 'success'], overdue: ['متأخرة', 'danger'], cancelled: ['ملغاة', 'danger'] };
  const [label, color] = map[status] || ['غير محدد', 'muted'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}

function getAccountTypeLabel(type) {
  const types = { cash: 'صندوق', bank: 'بنك', expense: 'مصروفات', income: 'إيرادات', capital: 'رأس مال', custody: 'عهدة', receivable: 'مدينون', payable: 'دائنون', transport: 'نقل', other: 'أخرى' };
  return types[type] || type;
}
