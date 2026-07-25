import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

function SupplierForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '', address: '', email: '', notes: '', ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم المورد مطلوب';
    if (!form.phone.trim()) e.phone = 'رقم الهاتف مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div className="form-grid">
        <Field label="اسم المورد" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="اسم الشركة أو المورد" />
        </Field>
        <Field label="رقم الهاتف" required error={errors.phone}>
          <input className={`form-control ${errors.phone ? 'error' : ''}`} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="05xxxxxxxx" />
        </Field>
        <Field label="العنوان">
          <input className="form-control" value={form.address} onChange={e => set('address', e.target.value)} placeholder="المدينة والمنطقة" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" className="form-control" value={form.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="ملاحظات" span={2}>
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Suppliers({ onNavigate }) {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier, invoices, payments, currentBusinessUnit } = useStore();
  const bu = currentBusinessUnit;
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const buSuppliers = suppliers.filter(s => (s.businessUnitId || 'main') === bu);
  const filtered = buSuppliers.filter(s => !search || s.name.includes(search) || s.phone?.includes(search));
  const totalPayables = buSuppliers.reduce((s, sp) => s + (sp.balance || 0), 0);

  const openView = (s) => { setSelected(s); setModal('view'); };
  const openEdit = (s) => { setSelected(s); setModal('edit'); };
  const openAdd = () => { setSelected(null); setModal('add'); };

  const handleSave = (form) => {
    if (modal === 'add') { addSupplier(form); toast.success('تم إضافة المورد'); }
    else { updateSupplier(selected.id, form); toast.success('تم تحديث بيانات المورد'); }
    setModal(null);
  };
  const handleDelete = async (s) => {
    const ok = await confirm('حذف المورد', `هل أنت متأكد من حذف المورد "${s.name}"؟`);
    if (ok) { deleteSupplier(s.id); toast.success('تم حذف المورد'); }
  };

  const getSupplierInvoices = (id) => invoices.filter(i => i.supplierId === id && i.type === 'purchase');
  const getSupplierPayments = (id) => payments.filter(p => p.supplierId === id);

  return (
    <div>
      <PageHeader
        title="إدارة الموردين"
        subtitle={`${buSuppliers.length} مورد • إجمالي المستحقات: ${formatCurrency(totalPayables)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ مورد جديد</button>}
      />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الهاتف..." />
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا يوجد موردون" message="ابدأ بإضافة موردينك" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة مورد</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>اسم المورد</th><th>الهاتف</th><th>العنوان</th>
                  <th>إجمالي المشتريات</th><th>المدفوع</th><th>المتبقي</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id}>
                    <td className="font-bold" style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => openView(s)}>{s.name}</td>
                    <td>{s.phone}</td>
                    <td className="text-muted">{s.address || '-'}</td>
                    <td className="number-cell">{formatCurrency(s.totalPurchases || 0)}</td>
                    <td className="number-cell amount-positive">{formatCurrency(s.totalPaid || 0)}</td>
                    <td className={`number-cell ${(s.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`}>{formatCurrency(s.balance || 0)}</td>
                    <td>
                      <div className="table-actions">
                        <IconBtn onClick={() => openView(s)} title="عرض" color="ghost">👁️</IconBtn>
                        <IconBtn onClick={() => openEdit(s)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(s)} title="حذف" color="ghost">🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة مورد جديد' : 'تعديل بيانات المورد'}>
        <SupplierForm initial={selected || {}} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`ملف المورد: ${selected?.name}`} size="lg"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { setModal(null); onNavigate?.('invoices-purchase'); }}>+ فاتورة شراء</button>
            <button className="btn btn-ghost" onClick={() => openEdit(selected)}>✏️ تعديل</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إغلاق</button>
          </div>
        }
      >
        {selected && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">إجمالي المشتريات</div><div className="font-heavy" style={{ fontSize: 18 }}>{formatCurrency(selected.totalPurchases || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">إجمالي المدفوع</div><div className="font-heavy amount-positive" style={{ fontSize: 18 }}>{formatCurrency(selected.totalPaid || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">الرصيد المستحق</div><div className={`font-heavy ${(selected.balance || 0) > 0 ? 'amount-negative' : 'amount-positive'}`} style={{ fontSize: 18 }}>{formatCurrency(selected.balance || 0)}</div></div>
            </div>
            <div className="card mb-4" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div><span className="text-muted">الهاتف: </span><strong>{selected.phone || '-'}</strong></div>
                <div><span className="text-muted">البريد: </span><strong>{selected.email || '-'}</strong></div>
                <div style={{ gridColumn: 'span 2' }}><span className="text-muted">العنوان: </span><strong>{selected.address || '-'}</strong></div>
                {selected.notes && <div style={{ gridColumn: 'span 2' }}><span className="text-muted">ملاحظات: </span>{selected.notes}</div>}
              </div>
            </div>
            <div className="card-title" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>فواتير الشراء ({getSupplierInvoices(selected.id).length})</div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>رقم الفاتورة</th><th>التاريخ</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                <tbody>
                  {getSupplierInvoices(selected.id).slice(0, 10).map(inv => (
                    <tr key={inv.id}>
                      <td className="font-bold">{inv.number}</td>
                      <td>{formatDate(inv.date)}</td>
                      <td className="number-cell">{formatCurrency(inv.total)}</td>
                      <td><span className="badge badge-info">{inv.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
