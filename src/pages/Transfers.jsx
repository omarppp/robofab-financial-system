import React, { useState } from 'react';
import { useStore, ACCOUNT_TYPES } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

function TransferForm({ accounts, onSave, onClose }) {
  const [form, setForm] = useState({ fromAccountId: '', toAccountId: '', amount: '', date: today(), description: '', notes: '', reference: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const fromAcc = accounts.find(a => a.id === form.fromAccountId);
  const validate = () => {
    const e = {};
    if (!form.fromAccountId) e.from = 'الحساب المرسل مطلوب';
    if (!form.toAccountId) e.to = 'الحساب المستقبل مطلوب';
    if (form.fromAccountId === form.toAccountId) e.to = 'يجب أن يكون الحسابان مختلفين';
    if (!form.amount || parseFloat(form.amount) <= 0) e.amount = 'أدخل مبلغاً صحيحاً';
    if (fromAcc && parseFloat(form.amount) > fromAcc.balance) e.amount = 'الرصيد غير كافٍ';
    if (!form.description.trim()) e.desc = 'وصف التحويل مطلوب';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = () => { if (validate()) onSave(form); };

  const accOptions = accounts.map(a => ({ value: a.id, label: `${a.name} (${formatCurrency(a.balance)})` }));

  return (
    <div>
      <div className="form-grid">
        <Field label="من حساب" required error={errors.from}>
          <select className="form-control" value={form.fromAccountId} onChange={e => set('fromAccountId', e.target.value)}>
            <option value="">اختر الحساب المرسل</option>
            {accOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="إلى حساب" required error={errors.to}>
          <select className="form-control" value={form.toAccountId} onChange={e => set('toAccountId', e.target.value)}>
            <option value="">اختر الحساب المستقبل</option>
            {accOptions.filter(o => o.value !== form.fromAccountId).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="المبلغ" required error={errors.amount}>
          <input type="number" className={`form-control ${errors.amount ? 'error' : ''}`} value={form.amount} onChange={e => set('amount', e.target.value)} min="0.01" step="0.01" placeholder="0.00" />
          {fromAcc && <span className="text-sm text-muted mt-1">الرصيد المتاح: {formatCurrency(fromAcc.balance)}</span>}
        </Field>
        <Field label="التاريخ" required>
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="وصف التحويل" required error={errors.desc} span={2}>
          <input className={`form-control ${errors.desc ? 'error' : ''}`} value={form.description} onChange={e => set('description', e.target.value)} placeholder="سبب أو وصف التحويل" />
        </Field>
        <Field label="رقم المرجع">
          <input className="form-control" value={form.reference} onChange={e => set('reference', e.target.value)} placeholder="رقم المرجع أو المستند" />
        </Field>
        <Field label="ملاحظات">
          <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات إضافية" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={submit}>✓ تنفيذ التحويل</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Transfers() {
  const { transfers, accounts, addTransfer } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = transfers.filter(t => {
    if (search && !t.description?.includes(search) && !t.number?.includes(search)) return false;
    if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(t.date) > new Date(dateTo)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalTransferred = filtered.reduce((s, t) => s + (parseFloat(t.amount) || 0), 0);

  const getAccName = (id) => accounts.find(a => a.id === id)?.name || 'غير محدد';

  const handleSave = (form) => {
    addTransfer(form);
    toast.success('تم تنفيذ التحويل بنجاح');
    setModal(false);
  };

  return (
    <div>
      <PageHeader
        title="التحويلات بين الحسابات"
        subtitle={`${transfers.length} تحويل • إجمالي: ${formatCurrency(totalTransferred)}`}
        actions={<button className="btn btn-primary" onClick={() => setModal(true)}>+ تحويل جديد</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في التحويلات..." />
        <input type="date" className="form-control" style={{ width: 160 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="من تاريخ" />
        <input type="date" className="form-control" style={{ width: 160 }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="إلى تاريخ" />
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد تحويلات" message="قم بإنشاء أول تحويل بين الحسابات" action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ تحويل جديد</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم التحويل</th>
                  <th>التاريخ</th>
                  <th>من حساب</th>
                  <th>إلى حساب</th>
                  <th>المبلغ</th>
                  <th>الوصف</th>
                  <th>المرجع</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td className="font-bold">{t.number}</td>
                    <td>{formatDate(t.date)}</td>
                    <td><span style={{ color: '#dc2626', fontWeight: 600 }}>↑ {getAccName(t.fromAccountId)}</span></td>
                    <td><span style={{ color: '#16a34a', fontWeight: 600 }}>↓ {getAccName(t.toAccountId)}</span></td>
                    <td className="number-cell amount-positive">{formatCurrency(t.amount)}</td>
                    <td>{t.description || '-'}</td>
                    <td className="text-muted">{t.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="font-bold text-muted">الإجمالي</td>
                  <td className="number-cell amount-positive font-bold">{formatCurrency(totalTransferred)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="تحويل بين الحسابات" size="lg">
        <TransferForm accounts={accounts} onSave={handleSave} onClose={() => setModal(false)} />
      </Modal>
    </div>
  );
}
