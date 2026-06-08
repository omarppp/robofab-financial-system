import React, { useState } from 'react';
import { useStore, ACCOUNT_TYPES, EGYPTIAN_BANKS } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

const typeOptions = Object.entries(ACCOUNT_TYPES).map(([k, v]) => ({ value: k, label: v }));

function AccountForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', type: 'cash', balance: 0, description: '', bankName: '', accountNumber: '', ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم الحساب مطلوب';
    setErrors(e);
    return !Object.keys(e).length;
  };
  const submit = () => { if (validate()) onSave(form); };
  return (
    <div>
      <div className="form-grid">
        <Field label="اسم الحساب" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: الصندوق الرئيسي" />
        </Field>
        <Field label="نوع الحساب" required>
          <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
            {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        {form.type === 'bank' && (
          <>
            <Field label="اسم البنك">
              <select className="form-control" value={form.bankName} onChange={e => set('bankName', e.target.value)}>
                <option value="">اختر البنك</option>
                {EGYPTIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="رقم الحساب / IBAN">
              <input className="form-control" value={form.accountNumber} onChange={e => set('accountNumber', e.target.value)} placeholder="رقم الحساب البنكي" />
            </Field>
          </>
        )}
        <Field label="الرصيد الافتتاحي">
          <input type="number" className="form-control" value={form.balance} onChange={e => set('balance', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="الوصف">
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للحساب" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={submit}>💾 حفظ الحساب</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Accounts() {
  const { accounts, addAccount, updateAccount, deleteAccount, transfers, payments, receipts } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(null); // null | 'add' | 'edit' | 'view'
  const [selected, setSelected] = useState(null);

  const filtered = accounts.filter(a => {
    if (search && !a.name.includes(search)) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    return true;
  });

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (acc) => { setSelected(acc); setModal('edit'); };
  const openView = (acc) => { setSelected(acc); setModal('view'); };

  const handleSave = (form) => {
    if (modal === 'add') { addAccount(form); toast.success('تم إضافة الحساب بنجاح'); }
    else { updateAccount(selected.id, form); toast.success('تم تحديث الحساب بنجاح'); }
    setModal(null);
  };

  const handleDelete = async (acc) => {
    const ok = await confirm('حذف الحساب', `هل أنت متأكد من حذف حساب "${acc.name}"؟ لا يمكن التراجع عن هذا الإجراء.`);
    if (ok) { deleteAccount(acc.id); toast.success('تم حذف الحساب'); }
  };

  // Get account transactions for view
  const getAccountTxns = (accId) => {
    const txns = [];
    transfers.forEach(t => {
      if (t.fromAccountId === accId) txns.push({ ...t, txnType: 'تحويل صادر', amount: -t.amount });
      if (t.toAccountId === accId) txns.push({ ...t, txnType: 'تحويل وارد', amount: t.amount });
    });
    payments.filter(p => p.accountId === accId).forEach(p => txns.push({ ...p, txnType: 'صرف' }));
    receipts.filter(r => r.accountId === accId).forEach(r => txns.push({ ...r, txnType: 'قبض' }));
    return txns.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const totalBalance = filtered.reduce((s, a) => s + (a.balance || 0), 0);

  return (
    <div>
      <PageHeader
        title="الحسابات المالية"
        subtitle={`${accounts.length} حساب • إجمالي الأرصدة: ${formatCurrency(totalBalance)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ إضافة حساب</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الحسابات..." />
        <select className="form-control" style={{ width: 180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">جميع الأنواع</option>
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </FilterBar>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        {Object.entries(ACCOUNT_TYPES).map(([type, label]) => {
          const total = accounts.filter(a => a.type === type).reduce((s, a) => s + (a.balance || 0), 0);
          if (total === 0 && !accounts.find(a => a.type === type)) return null;
          return (
            <div key={type} className="card" style={{ padding: 14 }}>
              <div className="text-sm text-muted">{label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{formatCurrency(total)}</div>
            </div>
          );
        })}
      </div>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد حسابات" message="ابدأ بإضافة حساباتك المالية" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة حساب</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>اسم الحساب</th>
                  <th>النوع</th>
                  <th>الرصيد الحالي</th>
                  <th>الوصف</th>
                  <th>تاريخ الإنشاء</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(acc => (
                  <tr key={acc.id}>
                    <td className="font-bold" style={{ cursor: 'pointer' }} onClick={() => openView(acc)}>{acc.name}</td>
                    <td><span className={`account-type-badge type-${acc.type}`}>{ACCOUNT_TYPES[acc.type] || acc.type}</span></td>
                    <td className={`number-cell ${acc.balance >= 0 ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(acc.balance)}</td>
                    <td className="text-muted">{acc.description || '-'}</td>
                    <td>{formatDate(acc.createdAt)}</td>
                    <td>
                      <div className="table-actions">
                        <IconBtn onClick={() => openView(acc)} title="عرض المعاملات" color="ghost">👁️</IconBtn>
                        <IconBtn onClick={() => openEdit(acc)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(acc)} title="حذف" color="ghost">🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة حساب جديد' : 'تعديل الحساب'}>
        <AccountForm initial={selected || {}} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`حساب: ${selected?.name}`} size="lg">
        {selected && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <div className="text-sm text-muted">نوع الحساب</div>
                <div style={{ marginTop: 6 }}><span className={`account-type-badge type-${selected.type}`}>{ACCOUNT_TYPES[selected.type]}</span></div>
              </div>
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <div className="text-sm text-muted">الرصيد الحالي</div>
                <div className={`font-heavy ${selected.balance >= 0 ? 'amount-positive' : 'amount-negative'}`} style={{ fontSize: 18, marginTop: 4 }}>{formatCurrency(selected.balance)}</div>
              </div>
              <div className="card" style={{ padding: 14, textAlign: 'center' }}>
                <div className="text-sm text-muted">تاريخ الإنشاء</div>
                <div style={{ fontWeight: 600, marginTop: 4 }}>{formatDate(selected.createdAt)}</div>
              </div>
            </div>
            <div className="card-title">سجل المعاملات</div>
            {(() => {
              const txns = getAccountTxns(selected.id);
              if (txns.length === 0) return <p className="text-muted text-center" style={{ padding: 20 }}>لا توجد معاملات مسجلة</p>;
              return (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr><th>التاريخ</th><th>النوع</th><th>الوصف</th><th>المبلغ</th></tr>
                    </thead>
                    <tbody>
                      {txns.map(t => (
                        <tr key={t.id}>
                          <td>{formatDate(t.date)}</td>
                          <td><span className="badge badge-info">{t.txnType}</span></td>
                          <td>{t.description || t.notes || '-'}</td>
                          <td className={`number-cell ${t.amount >= 0 ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(Math.abs(t.amount))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
