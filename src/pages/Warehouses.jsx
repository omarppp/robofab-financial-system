import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

function WarehouseForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', location: '', description: '', ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم المستودع مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div className="form-grid">
        <Field label="اسم المستودع" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: المستودع الرئيسي" />
        </Field>
        <Field label="الموقع">
          <input className="form-control" value={form.location} onChange={e => set('location', e.target.value)} placeholder="المدينة - الحي" />
        </Field>
        <Field label="الوصف" span={2}>
          <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} rows={2} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

function TransferForm({ items, warehouses, onSave, onClose }) {
  const [form, setForm] = useState({ itemId: '', fromWarehouseId: '', toWarehouseId: '', quantity: 1, date: today(), notes: '' });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const srcItem = items.find(i => i.id === form.itemId && i.warehouseId === form.fromWarehouseId);
  const validate = () => {
    const e = {};
    if (!form.itemId) e.item = 'الصنف مطلوب';
    if (!form.fromWarehouseId) e.from = 'المستودع المرسل مطلوب';
    if (!form.toWarehouseId) e.to = 'المستودع المستقبل مطلوب';
    if (form.fromWarehouseId === form.toWarehouseId) e.to = 'يجب أن يكون المستودعان مختلفين';
    if (!form.quantity || parseFloat(form.quantity) <= 0) e.qty = 'الكمية يجب أن تكون أكبر من صفر';
    if (srcItem && parseFloat(form.quantity) > srcItem.quantity) e.qty = `الكمية المتاحة: ${srcItem.quantity}`;
    setErrors(e); return !Object.keys(e).length;
  };
  const whItems = (whId) => items.filter(i => i.warehouseId === whId);
  return (
    <div>
      <div className="form-grid">
        <Field label="من مستودع" required error={errors.from}>
          <select className="form-control" value={form.fromWarehouseId} onChange={e => set('fromWarehouseId', e.target.value)}>
            <option value="">اختر المستودع المرسل</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="إلى مستودع" required error={errors.to}>
          <select className="form-control" value={form.toWarehouseId} onChange={e => set('toWarehouseId', e.target.value)}>
            <option value="">اختر المستودع المستقبل</option>
            {warehouses.filter(w => w.id !== form.fromWarehouseId).map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="الصنف" required error={errors.item}>
          <select className="form-control" value={form.itemId} onChange={e => set('itemId', e.target.value)}>
            <option value="">اختر الصنف</option>
            {whItems(form.fromWarehouseId).map(i => <option key={i.id} value={i.id}>{i.name} (متاح: {i.quantity} {i.unit})</option>)}
          </select>
        </Field>
        <Field label="الكمية" required error={errors.qty}>
          <input type="number" className="form-control" value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0.001" step="0.001" />
          {srcItem && <span className="text-sm text-muted mt-1">المتاح: {srcItem.quantity} {srcItem.unit}</span>}
        </Field>
        <Field label="التاريخ">
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="ملاحظات">
          <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="سبب التحويل" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>✓ تنفيذ التحويل</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Warehouses() {
  const { warehouses, addWarehouse, updateWarehouse, deleteWarehouse, items, warehouseTransfers, addWarehouseTransfer } = useStore();
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [viewWh, setViewWh] = useState(null);

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (w) => { setSelected(w); setModal('edit'); };
  const openView = (w) => { setViewWh(w); setModal('view'); };

  const handleSaveWh = (form) => {
    if (modal === 'add') { addWarehouse(form); toast.success('تم إضافة المستودع'); }
    else { updateWarehouse(selected.id, form); toast.success('تم التحديث'); }
    setModal(null);
  };
  const handleDelete = async (w) => {
    const ok = await confirm('حذف المستودع', `هل أنت متأكد من حذف المستودع "${w.name}"؟`);
    if (ok) { deleteWarehouse(w.id); toast.success('تم الحذف'); }
  };
  const handleTransfer = (form) => {
    addWarehouseTransfer(form);
    toast.success('تم تنفيذ تحويل المخزون');
    setModal(null);
  };

  const getWhItems = (id) => items.filter(i => i.warehouseId === id);
  const getWhValue = (id) => getWhItems(id).reduce((s, i) => s + ((i.quantity || 0) * (i.purchasePrice || 0)), 0);

  return (
    <div>
      <PageHeader
        title="إدارة المستودعات"
        subtitle={`${warehouses.length} مستودع`}
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-outline" onClick={() => setModal('transfer')}>↔️ تحويل مخزون</button>
            <button className="btn btn-primary" onClick={openAdd}>+ مستودع جديد</button>
          </div>
        }
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
        {warehouses.map(wh => {
          const whItems = getWhItems(wh.id);
          const whValue = getWhValue(wh.id);
          return (
            <div key={wh.id} className="card" style={{ cursor: 'pointer' }} onClick={() => openView(wh)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div className="font-bold" style={{ fontSize: 16 }}>🏭 {wh.name}</div>
                  <div className="text-muted text-sm">{wh.location || 'الموقع غير محدد'}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <IconBtn onClick={e => { e.stopPropagation(); openEdit(wh); }} title="تعديل" color="ghost">✏️</IconBtn>
                  <IconBtn onClick={e => { e.stopPropagation(); handleDelete(wh); }} title="حذف" color="ghost">🗑️</IconBtn>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="card" style={{ padding: 10, background: '#f8fafc' }}>
                  <div className="text-sm text-muted">عدد الأصناف</div>
                  <div className="font-bold" style={{ fontSize: 18 }}>{whItems.length}</div>
                </div>
                <div className="card" style={{ padding: 10, background: '#f8fafc' }}>
                  <div className="text-sm text-muted">قيمة المخزون</div>
                  <div className="font-bold amount-positive" style={{ fontSize: 14 }}>{formatCurrency(whValue)}</div>
                </div>
              </div>
            </div>
          );
        })}
        {warehouses.length === 0 && (
          <div style={{ gridColumn: '1 / -1' }}>
            <EmptyState title="لا توجد مستودعات" message="ابدأ بإضافة مستوداتك" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة مستودع</button>} />
          </div>
        )}
      </div>

      {/* Transfer History */}
      {warehouseTransfers.length > 0 && (
        <div className="card">
          <div className="card-title">سجل تحويلات المخزون</div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>الرقم</th><th>التاريخ</th><th>الصنف</th><th>من</th><th>إلى</th><th>الكمية</th><th>ملاحظات</th></tr>
              </thead>
              <tbody>
                {warehouseTransfers.slice(-20).reverse().map(t => (
                  <tr key={t.id}>
                    <td className="font-bold">{t.number}</td>
                    <td>{formatDate(t.date)}</td>
                    <td>{items.find(i => i.id === t.itemId)?.name || '-'}</td>
                    <td><span style={{ color: '#dc2626' }}>{warehouses.find(w => w.id === t.fromWarehouseId)?.name || '-'}</span></td>
                    <td><span style={{ color: '#16a34a' }}>{warehouses.find(w => w.id === t.toWarehouseId)?.name || '-'}</span></td>
                    <td className="number-cell">{t.quantity}</td>
                    <td className="text-muted">{t.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Warehouse view modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`مستودع: ${viewWh?.name}`} size="lg">
        {viewWh && (
          <div>
            <div className="card mb-4" style={{ padding: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 13 }}>
                <div><span className="text-muted">الموقع: </span><strong>{viewWh.location || '-'}</strong></div>
                <div><span className="text-muted">الوصف: </span><strong>{viewWh.description || '-'}</strong></div>
              </div>
            </div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>الكود</th><th>الصنف</th><th>الفئة</th><th>الكمية</th><th>الوحدة</th><th>سعر الشراء</th><th>القيمة</th></tr></thead>
                <tbody>
                  {getWhItems(viewWh.id).map(item => (
                    <tr key={item.id}>
                      <td className="text-muted">{item.code}</td>
                      <td className="font-bold">{item.name}</td>
                      <td><span className="badge badge-muted">{item.category}</span></td>
                      <td className={`number-cell ${item.quantity <= item.minQuantity ? 'amount-negative' : ''}`}>{item.quantity}</td>
                      <td>{item.unit}</td>
                      <td className="number-cell">{formatCurrency(item.purchasePrice)}</td>
                      <td className="number-cell amount-positive">{formatCurrency((item.quantity || 0) * (item.purchasePrice || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة مستودع' : 'تعديل المستودع'}>
        <WarehouseForm initial={selected || {}} onSave={handleSaveWh} onClose={() => setModal(null)} />
      </Modal>
      <Modal open={modal === 'transfer'} onClose={() => setModal(null)} title="تحويل مخزون بين المستودعات" size="lg">
        <TransferForm items={items} warehouses={warehouses} onSave={handleTransfer} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
