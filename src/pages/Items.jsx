import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

const UNITS = ['قطعة', 'كيلو', 'جرام', 'لتر', 'متر', 'متر مربع', 'صندوق', 'كرتون', 'علبة', 'دستة', 'طن', 'برميل'];
const CATEGORIES = ['خامات', 'منتجات', 'مواد', 'أدوات', 'قطع غيار', 'تعبئة', 'أخرى'];

function ItemForm({ initial = {}, warehouses, onSave, onClose }) {
  const [form, setForm] = useState({
    code: '', name: '', category: 'منتجات', description: '', unit: 'قطعة',
    purchasePrice: 0, salePrice: 0, quantity: 0, minQuantity: 10, warehouseId: warehouses[0]?.id || '', ...initial
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم الصنف مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div className="form-grid">
        <Field label="كود الصنف">
          <input className="form-control" value={form.code} onChange={e => set('code', e.target.value)} placeholder="ITM001 (يُولَّد تلقائياً)" />
        </Field>
        <Field label="اسم الصنف" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="اسم الصنف أو المنتج" />
        </Field>
        <Field label="الفئة">
          <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="وحدة القياس">
          <select className="form-control" value={form.unit} onChange={e => set('unit', e.target.value)}>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </Field>
        <Field label="المستودع">
          <select className="form-control" value={form.warehouseId} onChange={e => set('warehouseId', e.target.value)}>
            <option value="">اختر المستودع</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
        <Field label="سعر الشراء">
          <input type="number" className="form-control" value={form.purchasePrice} onChange={e => set('purchasePrice', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="سعر البيع">
          <input type="number" className="form-control" value={form.salePrice} onChange={e => set('salePrice', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="الكمية الحالية">
          <input type="number" className="form-control" value={form.quantity} onChange={e => set('quantity', e.target.value)} min="0" step="0.001" />
        </Field>
        <Field label="حد التنبيه (الكمية الدنيا)">
          <input type="number" className="form-control" value={form.minQuantity} onChange={e => set('minQuantity', e.target.value)} min="0" />
        </Field>
        <Field label="الوصف" span={2}>
          <textarea className="form-control" value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="وصف الصنف" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ الصنف</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Items() {
  const { items, addItem, updateItem, deleteItem, warehouses, currentBusinessUnit } = useStore();
  const bu = currentBusinessUnit;
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [whFilter, setWhFilter] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const buItems = items.filter(i => (i.businessUnitId || 'main') === bu);
  const filtered = buItems.filter(i => {
    if (search && !i.name.includes(search) && !i.code?.includes(search)) return false;
    if (catFilter && i.category !== catFilter) return false;
    if (whFilter && i.warehouseId !== whFilter) return false;
    if (showLowStock && i.quantity > i.minQuantity) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, i) => s + ((i.quantity || 0) * (i.purchasePrice || 0)), 0);
  const lowStockCount = buItems.filter(i => i.quantity <= i.minQuantity).length;

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (i) => { setSelected(i); setModal('edit'); };

  const handleSave = (form) => {
    if (modal === 'add') { addItem(form); toast.success('تم إضافة الصنف'); }
    else { updateItem(selected.id, form); toast.success('تم تحديث الصنف'); }
    setModal(null);
  };
  const handleDelete = async (i) => {
    const ok = await confirm('حذف الصنف', `هل أنت متأكد من حذف "${i.name}"؟`);
    if (ok) { deleteItem(i.id); toast.success('تم حذف الصنف'); }
  };

  const getWhName = (id) => warehouses.find(w => w.id === id)?.name || '-';

  return (
    <div>
      <PageHeader
        title="الأصناف والمخزون"
        subtitle={`${buItems.length} صنف • قيمة المخزون: ${formatCurrency(totalValue)} • ${lowStockCount} صنف بكمية منخفضة`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ إضافة صنف</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو الكود..." />
        <select className="form-control" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">جميع الفئات</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="form-control" style={{ width: 180 }} value={whFilter} onChange={e => setWhFilter(e.target.value)}>
          <option value="">جميع المستودعات</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={showLowStock} onChange={e => setShowLowStock(e.target.checked)} />
          المخزون المنخفض فقط
        </label>
      </FilterBar>

      {lowStockCount > 0 && (
        <div className="alert alert-warning mb-4">
          <span>⚠️</span>
          <span>تنبيه: يوجد {lowStockCount} صنف بكمية أقل من الحد الأدنى المطلوب</span>
        </div>
      )}

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد أصناف" message="ابدأ بإضافة أصنافك وبضائعك" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة صنف</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الكود</th><th>الاسم</th><th>الفئة</th><th>المستودع</th>
                  <th>الوحدة</th><th>الكمية</th><th>سعر الشراء</th><th>سعر البيع</th><th>القيمة الإجمالية</th><th>الحالة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(item => {
                  const isLow = item.quantity <= item.minQuantity;
                  return (
                    <tr key={item.id}>
                      <td className="font-bold text-muted">{item.code}</td>
                      <td className="font-bold">{item.name}</td>
                      <td><span className="badge badge-muted">{item.category}</span></td>
                      <td className="text-muted">{getWhName(item.warehouseId)}</td>
                      <td className="text-muted">{item.unit}</td>
                      <td className={`number-cell font-bold ${isLow ? 'amount-negative' : ''}`}>{item.quantity}</td>
                      <td className="number-cell">{formatCurrency(item.purchasePrice)}</td>
                      <td className="number-cell">{formatCurrency(item.salePrice)}</td>
                      <td className="number-cell amount-positive">{formatCurrency((item.quantity || 0) * (item.purchasePrice || 0))}</td>
                      <td>{isLow ? <span className="badge badge-danger">مخزون منخفض</span> : <span className="badge badge-success">متوفر</span>}</td>
                      <td>
                        <div className="table-actions">
                          <IconBtn onClick={() => openEdit(item)} title="تعديل" color="ghost">✏️</IconBtn>
                          <IconBtn onClick={() => handleDelete(item)} title="حذف" color="ghost">🗑️</IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={8} className="font-bold">إجمالي قيمة المخزون</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(totalValue)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة صنف جديد' : 'تعديل الصنف'} size="lg">
        <ItemForm initial={selected || {}} warehouses={warehouses} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
