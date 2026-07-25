import { useState } from 'react';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler } from 'chart.js';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, getLast6Months, filterByDateRange, today } from '../utils/helpers';
import { Tabs, PageHeader, FilterBar } from '../components/UI';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip, Legend, Filler);

const chartOpts = {
  plugins: { legend: { labels: { font: { family: 'Cairo' } } } },
  scales: { x: { ticks: { font: { family: 'Cairo' } } }, y: { ticks: { font: { family: 'Cairo' }, callback: v => v.toLocaleString('ar-SA') } } },
  responsive: true, maintainAspectRatio: false,
};

const REPORT_HEADER_URL = '/brand/logo.png';

export default function Reports() {
  const store = useStore();
  const bu = store.currentBusinessUnit;
  const reportHeaderUrl = REPORT_HEADER_URL;
  const [tab, setTab] = useState('summary');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const months = getLast6Months();

  // Filter by business unit first, then date range
  const buInvoices = store.invoices.filter(i => (i.businessUnitId || 'main') === bu);
  const buPayments = store.payments.filter(p => (p.businessUnitId || 'main') === bu);
  const buReceipts = store.receipts.filter(r => (r.businessUnitId || 'main') === bu);
  const buCustomers = store.customers.filter(c => (c.businessUnitId || 'main') === bu);
  const buSuppliers = store.suppliers.filter(s => (s.businessUnitId || 'main') === bu);
  const buItems = store.items.filter(i => (i.businessUnitId || 'main') === bu);
  const buAccounts = store.accounts.filter(a => (a.businessUnitId || 'main') === bu);

  const filteredInvoices = filterByDateRange(buInvoices, 'date', dateFrom, dateTo);
  const filteredPayments = filterByDateRange(buPayments, 'date', dateFrom, dateTo);
  const filteredReceipts = filterByDateRange(buReceipts, 'date', dateFrom, dateTo);

  const salesInvoices = filteredInvoices.filter(i => i.type === 'sale' && i.status !== 'cancelled' && i.status !== 'draft');
  const purchaseInvoices = filteredInvoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && i.status !== 'draft');
  const expenseInvoices = filteredInvoices.filter(i => i.type === 'expense' && i.status !== 'cancelled');

  const totalSales = salesInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalPurchases = purchaseInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  const totalExpenses = expenseInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0) + filteredPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const totalReceipts = filteredReceipts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  // Charts
  const salesByMonth = months.map(m => buInvoices.filter(i => i.type === 'sale' && i.status !== 'cancelled' && i.status !== 'draft' && new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year).reduce((s, i) => s + (parseFloat(i.total) || 0), 0));
  const purchasesByMonth = months.map(m => buInvoices.filter(i => i.type === 'purchase' && i.status !== 'cancelled' && new Date(i.date).getMonth() === m.month && new Date(i.date).getFullYear() === m.year).reduce((s, i) => s + (parseFloat(i.total) || 0), 0));
  const expensesByMonth = months.map(m => buPayments.filter(p => new Date(p.date).getMonth() === m.month && new Date(p.date).getFullYear() === m.year).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0));

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    const data = {
      period: `${dateFrom || 'البداية'} - ${dateTo || 'الآن'}`,
      summary: { totalSales, totalPurchases, totalExpenses, totalReceipts, netProfit },
      salesInvoices: salesInvoices.map(i => ({ number: i.number, date: i.date, total: i.total, status: i.status })),
      purchaseInvoices: purchaseInvoices.map(i => ({ number: i.number, date: i.date, total: i.total, status: i.status })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `تقرير-${today()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const TABS = [
    { key: 'summary', label: '📊 ملخص مالي' },
    { key: 'sales', label: '📈 تقرير المبيعات' },
    { key: 'purchases', label: '🛒 تقرير المشتريات' },
    { key: 'expenses', label: '💸 تقرير المصروفات' },
    { key: 'customers', label: '👥 تقرير العملاء' },
    { key: 'suppliers', label: '🏭 تقرير الموردين' },
    { key: 'inventory', label: '📦 تقرير المخزون' },
    { key: 'accounts', label: '🏦 تقرير الحسابات' },
  ];

  return (
    <div>
      {/* Report print header — hidden on screen, visible when printing */}
      {reportHeaderUrl && (
        <div style={{ marginBottom: 16, borderBottom: '2px solid #1e3a5f', paddingBottom: 12, textAlign: 'center' }}>
          <img src={reportHeaderUrl} alt="رأس التقرير" style={{ maxWidth: '100%', maxHeight: 90, objectFit: 'contain' }} />
        </div>
      )}
    <div className="no-print-hide">
      <PageHeader
        title="التقارير والإحصائيات"
        subtitle="تحليل مالي شامل"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline btn-sm" onClick={handleExport}>📥 تصدير</button>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}>🖨️ طباعة</button>
          </div>
        }
      />

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      <FilterBar>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>تصفية حسب الفترة:</span>
        <input type="date" className="form-control" style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-control" style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
        <button className="btn btn-ghost btn-sm" onClick={() => { setDateFrom(''); setDateTo(''); }}>إعادة تعيين</button>
      </FilterBar>

      {/* Summary Tab */}
      {tab === 'summary' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'إجمالي المبيعات', value: totalSales, color: '#2563a8' },
              { label: 'إجمالي المشتريات', value: totalPurchases, color: '#d97706' },
              { label: 'إجمالي المصروفات', value: totalExpenses, color: '#dc2626' },
              { label: 'إجمالي المقبوضات', value: totalReceipts, color: '#16a34a' },
            ].map(kpi => (
              <div key={kpi.label} className="card" style={{ padding: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{kpi.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: kpi.color, marginTop: 4 }}>{formatCurrency(kpi.value)}</div>
              </div>
            ))}
          </div>

          <div className="charts-grid">
            <div className="card">
              <div className="card-title">المبيعات والمشتريات الشهرية</div>
              <div style={{ height: 280 }}>
                <Bar data={{ labels: months.map(m => m.label), datasets: [{ label: 'المبيعات', data: salesByMonth, backgroundColor: 'rgba(37,99,168,0.8)', borderRadius: 4 }, { label: 'المشتريات', data: purchasesByMonth, backgroundColor: 'rgba(212,160,23,0.8)', borderRadius: 4 }] }} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { ...chartOpts.plugins.legend, position: 'top' } } }} />
              </div>
            </div>
            <div className="card">
              <div className="card-title">منحنى الأرباح الشهرية</div>
              <div style={{ height: 280 }}>
                <Line data={{
                  labels: months.map(m => m.label),
                  datasets: [
                    { label: 'الإيرادات', data: salesByMonth, borderColor: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', fill: true, tension: 0.4 },
                    { label: 'المصروفات', data: purchasesByMonth.map((v, i) => v + expensesByMonth[i]), borderColor: '#dc2626', backgroundColor: 'rgba(220,38,38,0.05)', fill: true, tension: 0.4 },
                  ]
                }} options={{ ...chartOpts, plugins: { ...chartOpts.plugins, legend: { ...chartOpts.plugins.legend, position: 'top' } } }} />
              </div>
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-title">ملخص الفترة المحددة</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>الإيرادات والمصروفات</div>
                {[
                  { label: 'إيرادات المبيعات', value: totalSales, positive: true },
                  { label: 'تكلفة المشتريات', value: totalPurchases, positive: false },
                  { label: 'المصروفات التشغيلية', value: expenseInvoices.reduce((s, i) => s + (parseFloat(i.total) || 0), 0), positive: false },
                  { label: 'سندات الصرف', value: filteredPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0), positive: false },
                  { label: 'إجمالي المقبوضات', value: totalReceipts, positive: true },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f1f5f9', fontSize: 14 }}>
                    <span>{row.label}</span>
                    <span className={row.positive ? 'amount-positive font-bold' : 'amount-negative font-bold'}>{formatCurrency(row.value)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>أرصدة الحسابات</div>
                {buAccounts.filter(a => a.active).map(acc => (
                  <div key={acc.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <span>{acc.name}</span>
                    <span className={`font-bold ${acc.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(acc.balance)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Tab */}
      {tab === 'sales' && (
        <ReportTable
          title="تقرير المبيعات"
          items={salesInvoices.sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { label: 'رقم الفاتورة', key: 'number', bold: true },
            { label: 'التاريخ', key: 'date', format: formatDate },
            { label: 'العميل', key: 'customerId', format: (id) => buCustomers.find(c => c.id === id)?.name || '-' },
            { label: 'الوصف', key: 'description' },
            { label: 'المجموع الفرعي', key: 'subtotal', format: formatCurrency, number: true },
            { label: 'الخصم', key: 'discount', format: formatCurrency, number: true },
            { label: 'الإجمالي', key: 'total', format: formatCurrency, number: true, positive: true },
            { label: 'الحالة', key: 'status', format: (s) => <InvStatusBadge s={s} /> },
          ]}
          totalKey="total"
          totalLabel="إجمالي المبيعات"
        />
      )}

      {/* Purchases Tab */}
      {tab === 'purchases' && (
        <ReportTable
          title="تقرير المشتريات"
          items={purchaseInvoices.sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { label: 'رقم الفاتورة', key: 'number', bold: true },
            { label: 'التاريخ', key: 'date', format: formatDate },
            { label: 'المورد', key: 'supplierId', format: (id) => buSuppliers.find(s => s.id === id)?.name || '-' },
            { label: 'الوصف', key: 'description' },
            { label: 'الإجمالي', key: 'total', format: formatCurrency, number: true, negative: true },
            { label: 'الحالة', key: 'status', format: (s) => <InvStatusBadge s={s} /> },
          ]}
          totalKey="total"
          totalLabel="إجمالي المشتريات"
          negativeTotal
        />
      )}

      {/* Expenses Tab */}
      {tab === 'expenses' && (
        <ReportTable
          title="تقرير المصروفات"
          items={[...expenseInvoices.map(i => ({ ...i, _type: 'invoice' })), ...filteredPayments.map(p => ({ ...p, _type: 'payment', number: p.number, date: p.date, total: p.amount, description: p.description }))].sort((a, b) => new Date(b.date) - new Date(a.date))}
          columns={[
            { label: 'الرقم', key: 'number', bold: true },
            { label: 'التاريخ', key: 'date', format: formatDate },
            { label: 'النوع', key: '_type', format: (t) => t === 'invoice' ? <span className="badge badge-warning">فاتورة</span> : <span className="badge badge-danger">سند صرف</span> },
            { label: 'الوصف', key: 'description' },
            { label: 'المبلغ', key: 'total', format: formatCurrency, number: true, negative: true },
          ]}
          totalKey="total"
          totalLabel="إجمالي المصروفات"
          negativeTotal
        />
      )}

      {/* Customers Tab */}
      {tab === 'customers' && (
        <div className="card">
          <div className="card-title">تقرير العملاء</div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>اسم العميل</th><th>الهاتف</th><th>إجمالي الفواتير</th><th>المدفوع</th><th>المتبقي</th><th>عدد الفواتير</th></tr>
              </thead>
              <tbody>
                {buCustomers.map(c => (
                  <tr key={c.id}>
                    <td className="font-bold">{c.name}</td>
                    <td>{c.phone}</td>
                    <td className="number-cell">{formatCurrency(c.totalInvoices || 0)}</td>
                    <td className="number-cell amount-positive">{formatCurrency(c.totalPaid || 0)}</td>
                    <td className={`number-cell ${(c.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatCurrency(c.balance || 0)}</td>
                    <td className="number-cell">{buInvoices.filter(i => i.customerId === c.id).length}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td className="font-bold">الإجمالي</td><td />
                  <td className="number-cell font-bold">{formatCurrency(buCustomers.reduce((s, c) => s + (c.totalInvoices || 0), 0))}</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(buCustomers.reduce((s, c) => s + (c.totalPaid || 0), 0))}</td>
                  <td className="number-cell font-bold amount-negative">{formatCurrency(buCustomers.reduce((s, c) => s + (c.balance || 0), 0))}</td>
                  <td className="number-cell font-bold">{buInvoices.filter(i => i.type === 'sale').length}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Suppliers Tab */}
      {tab === 'suppliers' && (
        <div className="card">
          <div className="card-title">تقرير الموردين</div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>اسم المورد</th><th>الهاتف</th><th>إجمالي المشتريات</th><th>المدفوع</th><th>المتبقي</th></tr>
              </thead>
              <tbody>
                {buSuppliers.map(s => (
                  <tr key={s.id}>
                    <td className="font-bold">{s.name}</td>
                    <td>{s.phone}</td>
                    <td className="number-cell">{formatCurrency(s.totalPurchases || 0)}</td>
                    <td className="number-cell amount-positive">{formatCurrency(s.totalPaid || 0)}</td>
                    <td className={`number-cell ${(s.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatCurrency(s.balance || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td className="font-bold">الإجمالي</td><td />
                  <td className="number-cell font-bold">{formatCurrency(buSuppliers.reduce((s, sup) => s + (sup.totalPurchases || 0), 0))}</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(buSuppliers.reduce((s, sup) => s + (sup.totalPaid || 0), 0))}</td>
                  <td className="number-cell font-bold amount-negative">{formatCurrency(buSuppliers.reduce((s, sup) => s + (sup.balance || 0), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Tab */}
      {tab === 'inventory' && (
        <div className="card">
          <div className="card-title">تقرير المخزون</div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>الكود</th><th>الصنف</th><th>الفئة</th><th>المستودع</th><th>الكمية</th><th>الوحدة</th><th>سعر الشراء</th><th>سعر البيع</th><th>قيمة المخزون</th><th>الحالة</th></tr>
              </thead>
              <tbody>
                {buItems.map(item => (
                  <tr key={item.id}>
                    <td className="text-muted">{item.code}</td>
                    <td className="font-bold">{item.name}</td>
                    <td><span className="badge badge-muted">{item.category}</span></td>
                    <td>{store.warehouses.find(w => w.id === item.warehouseId)?.name || '-'}</td>
                    <td className={`number-cell ${item.quantity <= item.minQuantity ? 'amount-negative' : ''}`}>{item.quantity}</td>
                    <td>{item.unit}</td>
                    <td className="number-cell">{formatCurrency(item.purchasePrice)}</td>
                    <td className="number-cell">{formatCurrency(item.salePrice)}</td>
                    <td className="number-cell amount-positive">{formatCurrency((item.quantity || 0) * (item.purchasePrice || 0))}</td>
                    <td>{item.quantity <= item.minQuantity ? <span className="badge badge-danger">منخفض</span> : <span className="badge badge-success">متوفر</span>}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={8} className="font-bold">إجمالي قيمة المخزون</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(buItems.reduce((s, i) => s + ((i.quantity || 0) * (i.purchasePrice || 0)), 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Accounts Tab */}
      {tab === 'accounts' && (
        <div className="card">
          <div className="card-title">تقرير الحسابات المالية</div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>الحساب</th><th>النوع</th><th>الرصيد</th><th>تعاملات</th></tr>
              </thead>
              <tbody>
                {buAccounts.filter(a => a.active).map(acc => {
                  const txnCount = [
                    ...store.transfers.filter(t => t.fromAccountId === acc.id || t.toAccountId === acc.id),
                    ...buPayments.filter(p => p.accountId === acc.id),
                    ...buReceipts.filter(r => r.accountId === acc.id),
                  ].length;
                  return (
                    <tr key={acc.id}>
                      <td className="font-bold">{acc.name}</td>
                      <td><span className={`account-type-badge type-${acc.type}`}>{acc.type}</span></td>
                      <td className={`number-cell ${acc.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(acc.balance)}</td>
                      <td className="number-cell">{txnCount}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td className="font-bold" colSpan={2}>إجمالي الأرصدة</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(buAccounts.filter(a => a.active && a.balance > 0).reduce((s, a) => s + a.balance, 0))}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}

function ReportTable({ title, items, columns, totalKey, totalLabel, negativeTotal }) {
  const total = items.reduce((s, item) => s + (parseFloat(item[totalKey]) || 0), 0);
  return (
    <div className="card">
      <div className="card-title">{title} ({items.length} سجل)</div>
      {items.length === 0 ? (
        <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>لا توجد بيانات للفترة المحددة</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>{columns.map(col => <th key={col.key}>{col.label}</th>)}</tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  {columns.map(col => (
                    <td key={col.key} className={`${col.number ? 'number-cell' : ''} ${col.bold ? 'font-bold' : ''} ${col.positive ? 'amount-positive' : ''} ${col.negative ? 'amount-negative' : ''}`}>
                      {col.format ? col.format(item[col.key]) : (item[col.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f8fafc' }}>
                <td className="font-bold" colSpan={columns.length - 1}>{totalLabel}</td>
                <td className={`number-cell font-bold ${negativeTotal ? 'amount-negative' : 'amount-positive'}`}>{formatCurrency(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function InvStatusBadge({ s }) {
  const map = { draft: ['مسودة', 'muted'], pending: ['معلقة', 'warning'], partial: ['جزئي', 'info'], paid: ['مدفوعة', 'success'], overdue: ['متأخرة', 'danger'], cancelled: ['ملغاة', 'danger'] };
  const [label, color] = map[s] || ['غير محدد', 'muted'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}
