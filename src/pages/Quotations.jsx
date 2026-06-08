import React, { useState } from 'react';
import { useStore, QUOTATION_STATUSES } from '../store/useStore';
import { formatCurrency, formatDate, today, addDays, calcSubtotal } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, StatusBadge, SummaryRow, toast } from '../components/UI';
import { confirm } from '../components/UI';

function QuotationForm({ initial = {}, customers, items: invItems, accounts, onSave, onClose }) {
  const [form, setForm] = useState({
    customerId: '', date: today(), expiryDate: addDays(today(), 14),
    description: '', notes: '', discount: 0,
    items: [{ name: '', quantity: 1, unitPrice: 0, accountId: '' }],
    ...initial
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, item) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? item : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unitPrice: 0, accountId: '' }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = calcSubtotal(form.items);
  const total = parseFloat((subtotal - (parseFloat(form.discount) || 0)).toFixed(2));

  const validate = () => {
    const e = {};
    if (!form.customerId) e.party = 'العميل مطلوب';
    if (!form.date) e.date = 'التاريخ مطلوب';
    if (form.items.length === 0 || form.items.some(i => !i.name.trim())) e.items = 'أضف بنوداً صحيحة';
    setErrors(e); return !Object.keys(e).length;
  };

  return (
    <div>
      <div className="form-grid">
        <Field label="العميل" required error={errors.party}>
          <select className={`form-control ${errors.party ? 'error' : ''}`} value={form.customerId} onChange={e => set('customerId', e.target.value)}>
            <option value="">اختر العميل</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="تاريخ العرض" required>
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="تاريخ الانتهاء">
          <input type="date" className="form-control" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
        </Field>
        <Field label="وصف العرض">
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للعرض" />
        </Field>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>بنود عرض الأسعار</strong>
          {errors.items && <span className="form-error">{errors.items}</span>}
        </div>
        <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>الصنف / الخدمة</th>
                <th>الصنف من المخزون</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>✕</button>
                  </td>
                  <td><input value={item.name} onChange={e => setItem(idx, { ...item, name: e.target.value })} placeholder="اسم الصنف أو الخدمة" style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'right', padding: 4 }} /></td>
                  <td>
                    <select value={item.itemId || ''} onChange={e => {
                      const inv = invItems.find(i => i.id === e.target.value);
                      if (inv) setItem(idx, { ...item, itemId: inv.id, name: item.name || inv.name, unitPrice: inv.salePrice || item.unitPrice });
                      else setItem(idx, { ...item, itemId: e.target.value });
                    }} style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
                      <option value="">-- صنف --</option>
                      {invItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                    </select>
                  </td>
                  <td><input type="number" value={item.quantity} onChange={e => setItem(idx, { ...item, quantity: e.target.value })} min="0.001" step="0.001" style={{ border: 'none', background: 'transparent', width: 70, fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }} /></td>
                  <td><input type="number" value={item.unitPrice} onChange={e => setItem(idx, { ...item, unitPrice: e.target.value })} min="0" step="0.01" style={{ border: 'none', background: 'transparent', width: 90, fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }} /></td>
                  <td style={{ fontWeight: 700, textAlign: 'center', background: '#f8fafc' }}>{formatCurrency(parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline btn-sm mt-2" onClick={addItem}>+ إضافة سطر</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Field label="ملاحظات">
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="ملاحظات للعميل" />
        </Field>
        <div>
          <div className="invoice-total-section">
            <SummaryRow label="المجموع الفرعي" value={formatCurrency(subtotal)} />
            <div className="invoice-total-row">
              <span style={{ fontWeight: 600 }}>الخصم</span>
              <input type="number" value={form.discount} onChange={e => set('discount', e.target.value)} min="0" step="0.01" style={{ width: 100, border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', textAlign: 'center', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
            </div>
            <SummaryRow label="الإجمالي النهائي" value={formatCurrency(total)} bold large />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave({ ...form, total, subtotal }); }}>💾 حفظ عرض الأسعار</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Quotations() {
  const store = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = store.quotations.filter(q => {
    if (search && !q.number?.includes(search) && !q.description?.includes(search)) return false;
    if (statusFilter && q.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalAmount = filtered.reduce((s, q) => s + (parseFloat(q.total) || 0), 0);

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (q) => { setSelected(q); setModal('edit'); };

  const handleSave = (form) => {
    if (modal === 'add') { store.addQuotation(form); toast.success('تم إنشاء عرض الأسعار'); }
    else { store.updateQuotation(selected.id, form); toast.success('تم التحديث'); }
    setModal(null);
  };

  const handleConvert = async (q) => {
    const ok = await confirm('تحويل إلى فاتورة', `هل تريد تحويل عرض السعر ${q.number} إلى فاتورة مبيعات؟`);
    if (ok) {
      store.convertQuotationToInvoice(q.id);
      toast.success('تم تحويل عرض السعر إلى فاتورة مبيعات');
    }
  };

  const handleDelete = async (q) => {
    const ok = await confirm('حذف عرض السعر', `هل أنت متأكد من حذف العرض ${q.number}؟`);
    if (ok) { store.deleteQuotation(q.id); toast.success('تم الحذف'); }
  };

  const getCustomerName = (id) => store.customers.find(c => c.id === id)?.name || '-';

  return (
    <div>
      <PageHeader
        title="عروض الأسعار"
        subtitle={`${store.quotations.length} عرض • الإجمالي: ${formatCurrency(totalAmount)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ عرض سعر جديد</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث..." />
        <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">جميع الحالات</option>
          {Object.entries(QUOTATION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد عروض أسعار" message="ابدأ بإنشاء عرض سعر لعميلك" action={<button className="btn btn-primary" onClick={openAdd}>+ عرض سعر جديد</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم العرض</th><th>العميل</th><th>التاريخ</th><th>تاريخ الانتهاء</th>
                  <th>الوصف</th><th>الإجمالي</th><th>الحالة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(q => (
                  <tr key={q.id}>
                    <td className="font-bold">{q.number}</td>
                    <td className="font-bold">{getCustomerName(q.customerId)}</td>
                    <td>{formatDate(q.date)}</td>
                    <td>{q.expiryDate ? formatDate(q.expiryDate) : '-'}</td>
                    <td className="text-muted">{q.description || '-'}</td>
                    <td className="number-cell">{formatCurrency(q.total)}</td>
                    <td><StatusBadge status={q.status} map={QUOTATION_STATUSES} /></td>
                    <td>
                      <div className="table-actions">
                        {q.status === 'open' && <IconBtn onClick={() => handleConvert(q)} title="تحويل لفاتورة" color="ghost">📄</IconBtn>}
                        <IconBtn onClick={() => openEdit(q)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(q)} title="حذف" color="ghost">🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={5} className="font-bold">الإجمالي</td>
                  <td className="number-cell font-bold">{formatCurrency(totalAmount)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'عرض سعر جديد' : 'تعديل عرض السعر'} size="xl">
        <QuotationForm
          initial={selected || {}}
          customers={store.customers} items={store.items} accounts={store.accounts}
          onSave={handleSave} onClose={() => setModal(null)}
        />
      </Modal>
    </div>
  );
}
