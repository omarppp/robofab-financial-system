import { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

function CustomerForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', notes: '', ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم العميل مطلوب';
    if (!form.phone.trim()) e.phone = 'رقم الهاتف مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div className="form-grid">
        <Field label="اسم العميل" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="الاسم الكامل أو اسم الشركة" />
        </Field>
        <Field label="رقم الهاتف" required error={errors.phone}>
          <input className={`form-control ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="01xxxxxxxxx" dir="ltr" />
        </Field>
        <Field label="العنوان">
          <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} placeholder="المدينة والمنطقة" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" dir="ltr" />
        </Field>
        <Field label="ملاحظات" span={2}>
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} placeholder="ملاحظات عن العميل" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Customers({ onNavigate }) {
  const { customers, addCustomer, updateCustomer, deleteCustomer, invoices, receipts, currentBusinessUnit } = useStore();
  const bu = currentBusinessUnit;
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const buCustomers = customers.filter(c => (c.businessUnitId || 'main') === bu);
  const filtered = buCustomers.filter(c => !search || c.name.includes(search) || c.phone?.includes(search));

  const openView = (c) => { setSelected(c); setModal('view'); };
  const openEdit = (c) => { setSelected(c); setModal('edit'); };
  const openAdd  = () => { setSelected(null); setModal('add'); };

  const handleSave = (form) => {
    if (modal === 'add') { addCustomer(form); toast.success('تم إضافة العميل'); }
    else { updateCustomer(selected.id, form); toast.success('تم تحديث بيانات العميل'); }
    setModal(null);
  };

  const handleDelete = async (c) => {
    const ok = await confirm('حذف العميل', `هل أنت متأكد من حذف العميل "${c.name}"؟`);
    if (ok) { deleteCustomer(c.id); toast.success('تم حذف العميل'); }
  };

  const getCustomerInvoices  = (id) => invoices.filter(i => i.customerId === id && i.type === 'sale');
  const getCustomerReceipts  = (id) => receipts.filter(r => r.customerId === id);
  const getCustomerExpenses  = (id) => invoices.filter(i => i.customerId === id && i.type === 'expense');
  const calcLinkedExpenses   = (id) => getCustomerExpenses(id).reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

  const totalReceivables = buCustomers.reduce((s, c) => s + (c.balance || 0), 0);

  return (
    <div>
      <PageHeader
        title="إدارة العملاء"
        subtitle={`${buCustomers.length} عميل • إجمالي المستحقات: ${formatCurrency(totalReceivables)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ عميل جديد</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." />
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا يوجد عملاء" message="ابدأ بإضافة عملائك" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة عميل</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>اسم العميل</th>
                  <th>الهاتف</th>
                  <th>إجمالي الفواتير</th>
                  <th>المدفوع</th>
                  <th>المتبقي</th>
                  <th>مصروفات مرتبطة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const linkedExp = calcLinkedExpenses(c.id);
                  return (
                    <tr key={c.id}>
                      <td className="font-bold" style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => openView(c)}>{c.name}</td>
                      <td dir="ltr">{c.phone}</td>
                      <td className="number-cell">{formatCurrency(c.totalInvoices || 0)}</td>
                      <td className="number-cell amount-positive">{formatCurrency(c.totalPaid || 0)}</td>
                      <td className={`number-cell ${(c.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatCurrency(c.balance || 0)}</td>
                      <td className="number-cell" style={{ color: linkedExp > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{formatCurrency(linkedExp)}</td>
                      <td>
                        <div className="table-actions">
                          <IconBtn onClick={() => openView(c)} title="عرض" color="ghost">👁️</IconBtn>
                          <IconBtn onClick={() => openEdit(c)} title="تعديل" color="ghost">✏️</IconBtn>
                          <IconBtn onClick={() => handleDelete(c)} title="حذف" color="ghost">🗑️</IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}>
        <CustomerForm initial={selected || {}} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`ملف العميل: ${selected?.name}`} size="lg"
        footer={
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => { setModal(null); onNavigate?.('invoices-sale'); }}>+ فاتورة مبيعات</button>
            <button className="btn btn-outline" onClick={() => { setModal(null); onNavigate?.('quotations'); }}>+ عرض سعر</button>
            <button className="btn btn-ghost" onClick={() => openEdit(selected)}>✏️ تعديل</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إغلاق</button>
          </div>
        }
      >
        {selected && (() => {
          const linkedExp = calcLinkedExpenses(selected.id);
          const netProfit = (selected.totalInvoices || 0) - linkedExp;
          const custInvoices = getCustomerInvoices(selected.id);
          const custReceipts = getCustomerReceipts(selected.id);
          const custExpenses = getCustomerExpenses(selected.id);
          return (
            <div>
              {/* Financial summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
                <StatCard label="إجمالي الفواتير" value={formatCurrency(selected.totalInvoices || 0)} color="var(--primary)" />
                <StatCard label="إجمالي المدفوع"  value={formatCurrency(selected.totalPaid || 0)}    color="var(--success)" />
                <StatCard label="الرصيد المتبقي"  value={formatCurrency(selected.balance || 0)}      color={(selected.balance || 0) > 0 ? 'var(--danger)' : 'var(--success)'} />
                <StatCard label="مصروفات مرتبطة" value={formatCurrency(linkedExp)}                   color="var(--warning)" />
                <StatCard label="صافي الربح"      value={formatCurrency(netProfit)}                  color={netProfit >= 0 ? 'var(--success)' : 'var(--danger)'} span={2} />
              </div>

              {/* Contact info */}
              <div className="card mb-4" style={{ padding: 14 }}>
                <div className="text-sm text-muted" style={{ marginBottom: 8 }}>بيانات التواصل</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                  <div><span className="text-muted">الهاتف: </span><strong dir="ltr">{selected.phone || '-'}</strong></div>
                  <div><span className="text-muted">البريد: </span><strong dir="ltr">{selected.email || '-'}</strong></div>
                  <div style={{ gridColumn: 'span 2' }}><span className="text-muted">العنوان: </span><strong>{selected.address || '-'}</strong></div>
                  {selected.notes && <div style={{ gridColumn: 'span 2' }}><span className="text-muted">ملاحظات: </span>{selected.notes}</div>}
                </div>
              </div>

              {/* Invoices */}
              <SectionTitle label="فواتير المبيعات" count={custInvoices.length} />
              {custInvoices.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 12 }}>لا توجد فواتير</p>
              ) : (
                <div className="table-container" style={{ marginBottom: 16 }}>
                  <table className="table">
                    <thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                    <tbody>
                      {custInvoices.slice(0, 10).map(inv => (
                        <tr key={inv.id}>
                          <td className="font-bold">{inv.number}</td>
                          <td>{formatDate(inv.date)}</td>
                          <td className="number-cell">{formatCurrency(inv.total)}</td>
                          <td><InvBadge s={inv.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Receipts */}
              <SectionTitle label="سندات القبض" count={custReceipts.length} />
              {custReceipts.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 12 }}>لا توجد سندات قبض</p>
              ) : (
                <div className="table-container" style={{ marginBottom: 16 }}>
                  <table className="table">
                    <thead><tr><th>الرقم</th><th>التاريخ</th><th>المبلغ</th><th>الوصف</th></tr></thead>
                    <tbody>
                      {custReceipts.slice(0, 10).map(r => (
                        <tr key={r.id}>
                          <td className="font-bold">{r.number}</td>
                          <td>{formatDate(r.date)}</td>
                          <td className="number-cell amount-positive">{formatCurrency(r.amount)}</td>
                          <td className="text-muted">{r.description || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Linked expenses */}
              <SectionTitle label="مصروفات مرتبطة بهذا العميل" count={custExpenses.length} />
              {custExpenses.length === 0 ? (
                <p className="text-muted text-center" style={{ padding: 12 }}>لا توجد مصروفات مرتبطة</p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead><tr><th>رقم</th><th>التاريخ</th><th>الفئة</th><th>المبلغ</th></tr></thead>
                    <tbody>
                      {custExpenses.slice(0, 10).map(exp => (
                        <tr key={exp.id}>
                          <td className="font-bold">{exp.number}</td>
                          <td>{formatDate(exp.date)}</td>
                          <td className="text-muted">{exp.expenseCategory || '-'}</td>
                          <td className="number-cell amount-negative">{formatCurrency(exp.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, color, span }) {
  return (
    <div className="card" style={{ padding: 14, gridColumn: span ? `span ${span}` : undefined }}>
      <div className="text-sm text-muted" style={{ marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function SectionTitle({ label, count }) {
  return (
    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
      {label}
      <span style={{ background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 10, padding: '1px 8px', fontSize: 11 }}>{count}</span>
    </div>
  );
}

function InvBadge({ s }) {
  const map = { draft: ['مسودة', 'muted'], pending: ['معلقة', 'warning'], partial: ['جزئي', 'info'], paid: ['مدفوعة', 'success'], overdue: ['متأخرة', 'danger'], cancelled: ['ملغاة', 'danger'] };
  const [label, color] = map[s] || ['غير محدد', 'muted'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}
