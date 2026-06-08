import React, { useState } from 'react';
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
          <input className={`form-control ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="05xxxxxxxx" />
        </Field>
        <Field label="العنوان">
          <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} placeholder="المدينة والمنطقة" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} placeholder="example@email.com" />
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
  const { customers, addCustomer, updateCustomer, deleteCustomer, invoices, receipts } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = customers.filter(c => !search || c.name.includes(search) || c.phone?.includes(search));

  const openView = (c) => { setSelected(c); setModal('view'); };
  const openEdit = (c) => { setSelected(c); setModal('edit'); };
  const openAdd = () => { setSelected(null); setModal('add'); };

  const handleSave = (form) => {
    if (modal === 'add') { addCustomer(form); toast.success('تم إضافة العميل'); }
    else { updateCustomer(selected.id, form); toast.success('تم تحديث بيانات العميل'); }
    setModal(null);
  };

  const handleDelete = async (c) => {
    const ok = await confirm('حذف العميل', `هل أنت متأكد من حذف العميل "${c.name}"؟`);
    if (ok) { deleteCustomer(c.id); toast.success('تم حذف العميل'); }
  };

  const getCustomerInvoices = (id) => invoices.filter(i => i.customerId === id && i.type === 'sale');
  const getCustomerReceipts = (id) => receipts.filter(r => r.customerId === id);
  const totalReceivables = customers.reduce((s, c) => s + (c.balance || 0), 0);

  return (
    <div>
      <PageHeader
        title="إدارة العملاء"
        subtitle={`${customers.length} عميل • إجمالي المستحقات: ${formatCurrency(totalReceivables)}`}
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
                  <th>العنوان</th>
                  <th>إجمالي الفواتير</th>
                  <th>المدفوع</th>
                  <th>المتبقي (الرصيد)</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id}>
                    <td className="font-bold" style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => openView(c)}>{c.name}</td>
                    <td>{c.phone}</td>
                    <td className="text-muted">{c.address || '-'}</td>
                    <td className="number-cell">{formatCurrency(c.totalInvoices || 0)}</td>
                    <td className="number-cell amount-positive">{formatCurrency(c.totalPaid || 0)}</td>
                    <td className={`number-cell ${(c.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatCurrency(c.balance || 0)}</td>
                    <td>
                      <div className="table-actions">
                        <IconBtn onClick={() => openView(c)} title="عرض" color="ghost">👁️</IconBtn>
                        <IconBtn onClick={() => openEdit(c)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(c)} title="حذف" color="ghost">🗑️</IconBtn>
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
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة عميل جديد' : 'تعديل بيانات العميل'}>
        <CustomerForm initial={selected || {}} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`ملف العميل: ${selected?.name}`} size="lg"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { setModal(null); onNavigate?.('invoices-sale'); }}>+ فاتورة مبيعات</button>
            <button className="btn btn-outline" onClick={() => { setModal(null); onNavigate?.('quotations'); }}>+ عرض سعر</button>
            <button className="btn btn-ghost" onClick={() => openEdit(selected)}>✏️ تعديل</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إغلاق</button>
          </div>
        }
      >
        {selected && (
          <div>
            {/* Info Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">إجمالي الفواتير</div><div className="font-heavy" style={{ fontSize: 18 }}>{formatCurrency(selected.totalInvoices || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">إجمالي المدفوع</div><div className="font-heavy amount-positive" style={{ fontSize: 18 }}>{formatCurrency(selected.totalPaid || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">الرصيد المتبقي</div><div className={`font-heavy ${(selected.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`} style={{ fontSize: 18 }}>{formatCurrency(selected.balance || 0)}</div></div>
            </div>

            {/* Contact Info */}
            <div className="card mb-4" style={{ padding: 16 }}>
              <div className="text-sm text-muted mb-2">بيانات التواصل</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><span className="text-muted">الهاتف: </span><strong>{selected.phone || '-'}</strong></div>
                <div><span className="text-muted">البريد: </span><strong>{selected.email || '-'}</strong></div>
                <div style={{ gridColumn: 'span 2' }}><span className="text-muted">العنوان: </span><strong>{selected.address || '-'}</strong></div>
                {selected.notes && <div style={{ gridColumn: 'span 2' }}><span className="text-muted">ملاحظات: </span>{selected.notes}</div>}
              </div>
            </div>

            {/* Invoices */}
            <div className="card-title" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>فواتير العميل ({getCustomerInvoices(selected.id).length})</div>
            {getCustomerInvoices(selected.id).length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 16 }}>لا توجد فواتير لهذا العميل</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                  <tbody>
                    {getCustomerInvoices(selected.id).slice(0, 10).map(inv => (
                      <tr key={inv.id}>
                        <td className="font-bold">{inv.number}</td>
                        <td>{formatDate(inv.date)}</td>
                        <td className="number-cell">{formatCurrency(inv.total)}</td>
                        <td><InvStatus s={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Receipts */}
            <div className="card-title mt-4" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>سندات القبض ({getCustomerReceipts(selected.id).length})</div>
            {getCustomerReceipts(selected.id).length === 0 ? (
              <p className="text-muted text-center" style={{ padding: 16 }}>لا توجد سندات قبض</p>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead><tr><th>الرقم</th><th>التاريخ</th><th>المبلغ</th><th>الوصف</th></tr></thead>
                  <tbody>
                    {getCustomerReceipts(selected.id).slice(0, 10).map(r => (
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
          </div>
        )}
      </Modal>
    </div>
  );
}

function InvStatus({ s }) {
  const map = { draft: ['مسودة', 'muted'], pending: ['معلقة', 'warning'], partial: ['جزئي', 'info'], paid: ['مدفوعة', 'success'], overdue: ['متأخرة', 'danger'], cancelled: ['ملغاة', 'danger'] };
  const [label, color] = map[s] || ['غير محدد', 'muted'];
  return <span className={`badge badge-${color}`}>{label}</span>;
}
