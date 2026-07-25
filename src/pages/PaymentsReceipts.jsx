import { useState } from 'react';
import { useStore, PAYMENT_METHODS } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, Tabs, toast } from '../components/UI';
import { confirm } from '../components/UI';

const methodOptions = Object.entries(PAYMENT_METHODS).map(([k, v]) => ({ value: k, label: v }));

const RECEIVER_TYPES = [
  { value: '',         label: '— النوع —' },
  { value: 'employee', label: 'موظف' },
  { value: 'customer', label: 'عميل' },
  { value: 'supplier', label: 'مورد' },
  { value: 'other',    label: 'شخص آخر' },
];

function PaymentForm({ accounts, customers, suppliers, employees, type = 'payment', onSave, onClose }) {
  const [form, setForm] = useState({
    amount: '', date: today(), accountId: '', method: 'cash',
    customerId: '', supplierId: '', employeeId: '',
    receivedBy: '', receiverType: '',
    description: '', notes: '', reference: '',
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'أدخل مبلغاً صحيحاً';
    if (!form.accountId) e.account = 'حساب مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  const accOptions = accounts.map(a => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` }));

  const receivedByLabel = type === 'payment' ? 'المستلم (من استلم المبلغ)' : 'استلم بواسطة';

  return (
    <div>
      <div className="form-grid">
        <Field label="المبلغ" required error={errors.amount}>
          <input type="number" className={`form-control ${errors.amount ? 'error' : ''}`} value={form.amount} onChange={e => set('amount', e.target.value)} min="0.01" step="0.01" placeholder="0.00" dir="ltr" />
        </Field>
        <Field label="التاريخ" required>
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="الحساب المالي" required error={errors.account}>
          <select className={`form-control ${errors.account ? 'error' : ''}`} value={form.accountId} onChange={e => set('accountId', e.target.value)}>
            <option value="">اختر الحساب</option>
            {accOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="طريقة الدفع">
          <select className="form-control" value={form.method} onChange={e => set('method', e.target.value)}>
            {methodOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>

        {/* Party linkage */}
        {type === 'receipt' && (
          <Field label="العميل المرتبط">
            <select className="form-control" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
              <option value="">— اختياري —</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {type === 'payment' && (
          <>
            <Field label="المورد المرتبط">
              <select className="form-control" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
                <option value="">— اختياري —</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="الموظف المرتبط">
              <select className="form-control" value={form.employeeId} onChange={e => set('employeeId', e.target.value)}>
                <option value="">— اختياري —</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </Field>
          </>
        )}

        {/* Received-by */}
        <Field label={receivedByLabel} span={2}>
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
            <select className="form-control" value={form.receiverType} onChange={e => set('receiverType', e.target.value)}>
              {RECEIVER_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <input className="form-control" value={form.receivedBy} onChange={e => set('receivedBy', e.target.value)} placeholder="اسم الشخص المستلم" />
          </div>
        </Field>

        <Field label="البيان" span={2}>
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف العملية" />
        </Field>
        <Field label="رقم مرجعي">
          <input className="form-control" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="رقم الشيك / التحويل" />
        </Field>
        <Field label="ملاحظات">
          <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات إضافية" />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>
          {type === 'payment' ? '💸 تسجيل الصرف' : '💰 تسجيل القبض'}
        </button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

function TxnList({ items, type, onDelete, accounts, customers, suppliers, employees }) {
  const getAccName = (id) => accounts.find(a => a.id === id)?.name || '-';
  const getParty = (item) => {
    if (item.customerId)  return customers.find(c => c.id === item.customerId)?.name  || '-';
    if (item.supplierId)  return suppliers.find(s => s.id === item.supplierId)?.name  || '-';
    if (item.employeeId)  return employees.find(e => e.id === item.employeeId)?.name  || '-';
    return '-';
  };
  if (items.length === 0) return <EmptyState title="لا توجد سجلات" message="ابدأ بإضافة سجل جديد" />;
  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th>الرقم</th>
            <th>التاريخ</th>
            <th>المبلغ</th>
            <th>الحساب</th>
            <th>الطريقة</th>
            <th>الطرف</th>
            <th>المستلم</th>
            <th>البيان</th>
            <th>الإجراءات</th>
          </tr>
        </thead>
        <tbody>
          {items.map(item => (
            <tr key={item.id}>
              <td className="font-bold">{item.number}</td>
              <td>{formatDate(item.date)}</td>
              <td className={`number-cell ${type === 'receipt' ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(item.amount)}</td>
              <td>{getAccName(item.accountId)}</td>
              <td><span className="badge badge-info">{PAYMENT_METHODS[item.method] || item.method}</span></td>
              <td className="text-muted">{getParty(item)}</td>
              <td className="text-muted">
                {item.receivedBy
                  ? <span>{item.receivedBy}{item.receiverType ? <span style={{ fontSize: 11, marginRight: 4, color: 'var(--primary)', background: 'var(--primary-dim)', borderRadius: 4, padding: '1px 5px' }}>{RECEIVER_TYPES.find(r => r.value === item.receiverType)?.label || item.receiverType}</span> : null}</span>
                  : '-'}
              </td>
              <td className="text-muted">{item.description || '-'}</td>
              <td><div className="table-actions"><IconBtn onClick={() => onDelete(item)} title="حذف" color="ghost">🗑️</IconBtn></div></td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--surface-3)' }}>
            <td colSpan={2} className="font-bold">الإجمالي</td>
            <td className={`number-cell font-bold ${type === 'receipt' ? 'amount-positive' : 'amount-negative'}`}>
              {formatCurrency(items.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0))}
            </td>
            <td colSpan={6} />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

export default function PaymentsReceipts({ initialTab = 'payments' }) {
  const store = useStore();
  const bu = store.currentBusinessUnit;
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modal, setModal] = useState(false);

  const payments = store.payments.filter(p => {
    if ((p.businessUnitId || 'main') !== bu) return false;
    if (search && !p.description?.includes(search) && !p.number?.includes(search)) return false;
    if (dateFrom && new Date(p.date) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(p.date) > new Date(dateTo))   return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const receipts = store.receipts.filter(r => {
    if ((r.businessUnitId || 'main') !== bu) return false;
    if (search && !r.description?.includes(search) && !r.number?.includes(search)) return false;
    if (dateFrom && new Date(r.date) < new Date(dateFrom)) return false;
    if (dateTo   && new Date(r.date) > new Date(dateTo))   return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalPayments = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const totalReceipts = receipts.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

  const handleSave = (form) => {
    if (tab === 'payments') { store.addPayment(form); toast.success('تم تسجيل سند الصرف'); }
    else                    { store.addReceipt(form); toast.success('تم تسجيل سند القبض'); }
    setModal(false);
  };

  const handleDelete = async (item) => {
    const ok = await confirm('حذف السند', 'هل أنت متأكد من حذف هذا السند؟');
    if (ok) {
      if (tab === 'payments') { store.deletePayment(item.id); toast.success('تم الحذف'); }
      else                    { store.deleteReceipt(item.id); toast.success('تم الحذف'); }
    }
  };

  return (
    <div>
      <PageHeader
        title={tab === 'payments' ? 'سندات الصرف' : 'سندات القبض'}
        subtitle={tab === 'payments'
          ? `${payments.length} سند • الإجمالي: ${formatCurrency(totalPayments)}`
          : `${receipts.length} سند • الإجمالي: ${formatCurrency(totalReceipts)}`}
        actions={<button className="btn btn-primary" onClick={() => setModal(true)}>+ سند جديد</button>}
      />

      <Tabs
        tabs={[
          { key: 'payments', label: '💸 سندات الصرف', count: store.payments.length },
          { key: 'receipts', label: '💰 سندات القبض', count: store.receipts.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." />
        <input type="date" className="form-control" style={{ width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-control" style={{ width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </FilterBar>

      <div className="card">
        {tab === 'payments' ? (
          <TxnList items={payments} type="payment" onDelete={handleDelete}
            accounts={store.accounts} customers={store.customers} suppliers={store.suppliers} employees={store.employees} />
        ) : (
          <TxnList items={receipts} type="receipt" onDelete={handleDelete}
            accounts={store.accounts} customers={store.customers} suppliers={store.suppliers} employees={store.employees} />
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)}
        title={tab === 'payments' ? 'سند صرف جديد' : 'سند قبض جديد'} size="lg">
        <PaymentForm
          type={tab === 'payments' ? 'payment' : 'receipt'}
          accounts={store.accounts.filter(a => (a.businessUnitId || 'main') === bu)}
          customers={store.customers.filter(c => (c.businessUnitId || 'main') === bu)}
          suppliers={store.suppliers.filter(s => (s.businessUnitId || 'main') === bu)}
          employees={store.employees}
          onSave={handleSave} onClose={() => setModal(false)}
        />
      </Modal>
    </div>
  );
}
