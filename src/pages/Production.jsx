import React, { useState } from 'react';
import { useStore, PRODUCTION_STATUSES } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, StatusBadge, toast } from '../components/UI';
import { confirm } from '../components/UI';

function ProductionForm({ initial = {}, items, warehouses, onSave, onClose }) {
  const [form, setForm] = useState({
    productName: '', productItemId: '', quantity: 1, warehouseId: warehouses[0]?.id || '',
    date: today(), estimatedCost: 0, notes: '', status: 'new',
    materials: [{ itemId: '', name: '', quantity: 1, unit: '' }],
    ...initial
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setMat = (idx, mat) => setForm(f => ({ ...f, materials: f.materials.map((m, i) => i === idx ? mat : m) }));
  const addMat = () => setForm(f => ({ ...f, materials: [...f.materials, { itemId: '', name: '', quantity: 1, unit: '' }] }));
  const removeMat = (idx) => setForm(f => ({ ...f, materials: f.materials.filter((_, i) => i !== idx) }));

  const validate = () => {
    const e = {};
    if (!form.productName.trim()) e.name = 'اسم المنتج مطلوب';
    if (!form.quantity || parseFloat(form.quantity) <= 0) e.qty = 'الكمية مطلوبة';
    setErrors(e); return !Object.keys(e).length;
  };

  return (
    <div>
      <div className="form-grid">
        <Field label="المنتج المراد إنتاجه" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.productName} onChange={e => set('productName', e.target.value)} placeholder="اسم المنتج" />
        </Field>
        <Field label="صنف المنتج (من المخزون)">
          <select className="form-control" value={form.productItemId} onChange={e => set('productItemId', e.target.value)}>
            <option value="">اختر الصنف (اختياري)</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </Field>
        <Field label="الكمية المطلوب إنتاجها" required error={errors.qty}>
          <input type="number" className="form-control" value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0.001" step="0.001" />
        </Field>
        <Field label="المستودع">
          <select className="form-control" value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="التاريخ">
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="التكلفة التقديرية">
          <input type="number" className="form-control" value={form.estimatedCost} onChange={e => set('estimatedCost', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="الحالة">
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(PRODUCTION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="ملاحظات">
          <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات على أمر الإنتاج" />
        </Field>
      </div>

      <hr className="section-divider" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <strong>المواد الخام المستخدمة</strong>
        <button className="btn btn-outline btn-sm" onClick={addMat}>+ إضافة مادة</button>
      </div>
      <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
        <table className="invoice-items-table">
          <thead>
            <tr>
              <th style={{ width: 40 }}></th>
              <th>المادة من المخزون</th>
              <th>الاسم / الوصف</th>
              <th>الكمية</th>
              <th>الوحدة</th>
            </tr>
          </thead>
          <tbody>
            {form.materials.map((mat, idx) => (
              <tr key={idx}>
                <td style={{ textAlign: 'center' }}>
                  <button onClick={() => removeMat(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>✕</button>
                </td>
                <td>
                  <select value={mat.itemId} onChange={e => {
                    const item = items.find(i => i.id === e.target.value);
                    setMat(idx, { ...mat, itemId: e.target.value, name: item?.name || mat.name, unit: item?.unit || mat.unit });
                  }} style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
                    <option value="">اختر من المخزون</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit})</option>)}
                  </select>
                </td>
                <td><input value={mat.name} onChange={e => setMat(idx, { ...mat, name: e.target.value })} style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 13, outline: 'none', padding: 4 }} placeholder="اسم المادة" /></td>
                <td><input type="number" value={mat.quantity} onChange={e => setMat(idx, { ...mat, quantity: e.target.value })} min="0.001" step="0.001" style={{ border: 'none', background: 'transparent', width: 80, fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }} /></td>
                <td><input value={mat.unit} onChange={e => setMat(idx, { ...mat, unit: e.target.value })} style={{ border: 'none', background: 'transparent', width: 70, fontFamily: 'inherit', fontSize: 12, outline: 'none', textAlign: 'center' }} placeholder="وحدة" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ أمر الإنتاج</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Production() {
  const { productionOrders, addProductionOrder, updateProductionOrder, deleteProductionOrder, items, warehouses } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = productionOrders.filter(o => {
    if (search && !o.number?.includes(search) && !o.productName?.includes(search)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (o) => { setSelected(o); setModal('edit'); };

  const handleSave = (form) => {
    if (modal === 'add') { addProductionOrder(form); toast.success('تم إنشاء أمر الإنتاج'); }
    else { updateProductionOrder(selected.id, form); toast.success('تم التحديث'); }
    setModal(null);
  };

  const handleComplete = async (o) => {
    const ok = await confirm('إكمال أمر الإنتاج', `هل تريد تأكيد اكتمال إنتاج "${o.productName}"؟ سيتم تحديث المخزون تلقائياً.`);
    if (ok) {
      updateProductionOrder(o.id, { status: 'completed' });
      toast.success('تم اكتمال أمر الإنتاج وتحديث المخزون');
    }
  };

  const handleDelete = async (o) => {
    const ok = await confirm('حذف أمر الإنتاج', `هل أنت متأكد من حذف أمر الإنتاج ${o.number}؟`);
    if (ok) { deleteProductionOrder(o.id); toast.success('تم الحذف'); }
  };

  return (
    <div>
      <PageHeader
        title="أوامر الإنتاج"
        subtitle={`${productionOrders.length} أمر إنتاج`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ أمر إنتاج جديد</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الأمر أو المنتج..." />
        <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">جميع الحالات</option>
          {Object.entries(PRODUCTION_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد أوامر إنتاج" message="ابدأ بإنشاء أمر الإنتاج الأول" action={<button className="btn btn-primary" onClick={openAdd}>+ إنشاء أمر إنتاج</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الأمر</th><th>المنتج</th><th>الكمية</th><th>المستودع</th>
                  <th>التاريخ</th><th>التكلفة التقديرية</th><th>الحالة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td className="font-bold">{o.number}</td>
                    <td className="font-bold">{o.productName}</td>
                    <td className="number-cell">{o.quantity}</td>
                    <td className="text-muted">{warehouses.find(w => w.id === o.warehouseId)?.name || '-'}</td>
                    <td>{formatDate(o.date)}</td>
                    <td className="number-cell">{formatCurrency(o.estimatedCost)}</td>
                    <td><StatusBadge status={o.status} map={PRODUCTION_STATUSES} /></td>
                    <td>
                      <div className="table-actions">
                        {o.status !== 'completed' && o.status !== 'cancelled' && (
                          <IconBtn onClick={() => handleComplete(o)} title="إكمال الإنتاج" color="ghost">✅</IconBtn>
                        )}
                        <IconBtn onClick={() => openEdit(o)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(o)} title="حذف" color="ghost">🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'أمر إنتاج جديد' : 'تعديل أمر الإنتاج'} size="xl">
        <ProductionForm initial={selected || {}} items={items} warehouses={warehouses} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
