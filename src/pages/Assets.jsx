import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

const ASSET_TYPES = ['أصل ثابت', 'أصل غير ملموس', 'معدات', 'آلات', 'مركبات', 'مباني', 'أراضي', 'أجهزة كمبيوتر', 'أثاث', 'علامة تجارية', 'براءة اختراع', 'أخرى'];
const ASSET_STATUSES = { active: { label: 'نشط', color: 'success' }, inactive: { label: 'غير نشط', color: 'muted' }, disposed: { label: 'مُستبعد', color: 'danger' }, maintenance: { label: 'صيانة', color: 'warning' } };

function AssetForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({
    name: '', type: 'أصل ثابت', purchaseDate: today(), purchaseValue: 0,
    currentValue: 0, usefulLife: '', status: 'active', notes: '', description: '', ...initial
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'اسم الأصل مطلوب';
    if (!form.purchaseDate) e.date = 'تاريخ الشراء مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div className="form-grid">
        <Field label="اسم الأصل" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="مثال: سيارة التوصيل، آلة الإنتاج" />
        </Field>
        <Field label="نوع الأصل">
          <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
            {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="تاريخ الشراء" required error={errors.date}>
          <input type="date" className="form-control" value={form.purchaseDate} onChange={e => set('purchaseDate', e.target.value)} />
        </Field>
        <Field label="قيمة الشراء">
          <input type="number" className="form-control" value={form.purchaseValue} onChange={e => set('purchaseValue', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="القيمة الحالية">
          <input type="number" className="form-control" value={form.currentValue} onChange={e => set('currentValue', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="العمر الإنتاجي (سنوات)">
          <input type="number" className="form-control" value={form.usefulLife} onChange={e => set('usefulLife', e.target.value)} min="1" placeholder="عدد السنوات" />
        </Field>
        <Field label="الحالة">
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(ASSET_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
        <Field label="الوصف">
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف الأصل" />
        </Field>
        <Field label="ملاحظات" span={2}>
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ الأصل</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Assets() {
  const { assets, addAsset, updateAsset, deleteAsset } = useStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = assets.filter(a => {
    if (search && !a.name.includes(search)) return false;
    if (typeFilter && a.type !== typeFilter) return false;
    return true;
  });

  const totalValue = filtered.reduce((s, a) => s + (parseFloat(a.currentValue) || 0), 0);
  const totalPurchaseValue = filtered.reduce((s, a) => s + (parseFloat(a.purchaseValue) || 0), 0);
  const depreciation = totalPurchaseValue - totalValue;

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (a) => { setSelected(a); setModal('edit'); };

  const handleSave = (form) => {
    if (modal === 'add') { addAsset(form); toast.success('تم إضافة الأصل'); }
    else { updateAsset(selected.id, form); toast.success('تم التحديث'); }
    setModal(null);
  };

  const handleDelete = async (a) => {
    const ok = await confirm('حذف الأصل', `هل أنت متأكد من حذف "${a.name}"؟`);
    if (ok) { deleteAsset(a.id); toast.success('تم الحذف'); }
  };

  return (
    <div>
      <PageHeader
        title="الأصول الثابتة والمعنوية"
        subtitle={`${assets.length} أصل • القيمة الحالية: ${formatCurrency(totalValue)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ إضافة أصل</button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16 }}>
          <div className="text-sm text-muted">إجمالي تكلفة الشراء</div>
          <div className="font-heavy" style={{ fontSize: 20, marginTop: 4 }}>{formatCurrency(totalPurchaseValue)}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="text-sm text-muted">القيمة الحالية الإجمالية</div>
          <div className="font-heavy amount-positive" style={{ fontSize: 20, marginTop: 4 }}>{formatCurrency(totalValue)}</div>
        </div>
        <div className="card" style={{ padding: 16 }}>
          <div className="text-sm text-muted">إجمالي الاستهلاك</div>
          <div className="font-heavy amount-negative" style={{ fontSize: 20, marginTop: 4 }}>{formatCurrency(depreciation)}</div>
        </div>
      </div>

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث في الأصول..." />
        <select className="form-control" style={{ width: 180 }} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">جميع الأنواع</option>
          {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا توجد أصول" message="ابدأ بتسجيل أصول شركتك" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة أصل</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الرقم</th><th>اسم الأصل</th><th>النوع</th><th>تاريخ الشراء</th>
                  <th>قيمة الشراء</th><th>القيمة الحالية</th><th>الاستهلاك</th><th>الحالة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(asset => {
                  const dep = (parseFloat(asset.purchaseValue) || 0) - (parseFloat(asset.currentValue) || 0);
                  const status = ASSET_STATUSES[asset.status];
                  return (
                    <tr key={asset.id}>
                      <td className="font-bold text-muted">{asset.number}</td>
                      <td className="font-bold">{asset.name}</td>
                      <td><span className="badge badge-muted">{asset.type}</span></td>
                      <td>{formatDate(asset.purchaseDate)}</td>
                      <td className="number-cell">{formatCurrency(asset.purchaseValue)}</td>
                      <td className="number-cell amount-positive">{formatCurrency(asset.currentValue)}</td>
                      <td className="number-cell amount-negative">{formatCurrency(dep)}</td>
                      <td>{status ? <span className={`badge badge-${status.color}`}>{status.label}</span> : '-'}</td>
                      <td>
                        <div className="table-actions">
                          <IconBtn onClick={() => openEdit(asset)} title="تعديل" color="ghost">✏️</IconBtn>
                          <IconBtn onClick={() => handleDelete(asset)} title="حذف" color="ghost">🗑️</IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={4} className="font-bold">الإجمالي</td>
                  <td className="number-cell font-bold">{formatCurrency(totalPurchaseValue)}</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(totalValue)}</td>
                  <td className="number-cell font-bold amount-negative">{formatCurrency(depreciation)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة أصل جديد' : 'تعديل الأصل'} size="lg">
        <AssetForm initial={selected || {}} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>
    </div>
  );
}
