import React, { useState } from 'react';
import { useStore, ORDER_STATUSES } from '../store/useStore';
import { formatCurrency, formatDate, today, addDays, calcSubtotal } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, StatusBadge, SummaryRow, Tabs, toast } from '../components/UI';
import { confirm } from '../components/UI';

function OrderForm({ type, customers, suppliers, items: invItems, onSave, onClose }) {
  const [form, setForm] = useState({
    customerId: '', supplierId: '', date: today(), deliveryDate: addDays(today(), 7),
    description: '', notes: '', discount: 0, status: 'new',
    items: [{ name: '', quantity: 1, unitPrice: 0 }],
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, item) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? item : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unitPrice: 0 }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = calcSubtotal(form.items);
  const total = parseFloat((subtotal - (parseFloat(form.discount) || 0)).toFixed(2));

  const validate = () => {
    if (type === 'sale' && !form.customerId) { toast.error('العميل مطلوب'); return false; }
    if (type === 'purchase' && !form.supplierId) { toast.error('المورد مطلوب'); return false; }
    if (form.items.some(i => !i.name.trim())) { toast.error('أدخل اسم الصنف لجميع البنود'); return false; }
    return true;
  };

  return (
    <div>
      <div className="form-grid">
        {type === 'sale' && (
          <Field label="العميل" required>
            <select className="form-control" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
              <option value="">اختر العميل</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {type === 'purchase' && (
          <Field label="المورد" required>
            <select className="form-control" value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
              <option value="">اختر المورد</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="تاريخ الأمر"><input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="تاريخ التسليم"><input type="date" className="form-control" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} /></Field>
        <Field label="الوصف"><input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر" /></Field>
      </div>

      <div style={{ margin: '16px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong>البنود</strong>
        </div>
        <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="invoice-items-table">
            <thead><tr><th style={{ width: 40 }}></th><th>الصنف</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
            <tbody>
              {form.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ textAlign: 'center' }}>
                    <button onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>✕</button>
                  </td>
                  <td>
                    <input value={item.name} onChange={e => setItem(idx, { ...item, name: e.target.value })} placeholder="اسم الصنف" style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 13, outline: 'none', padding: 4 }} />
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

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <div style={{ width: 280 }}>
          <SummaryRow label="المجموع الفرعي" value={formatCurrency(subtotal)} />
          <div className="invoice-total-row">
            <span style={{ fontWeight: 600 }}>الخصم</span>
            <input type="number" value={form.discount} onChange={e => set('discount', e.target.value)} min="0" step="0.01" style={{ width: 100, border: '1.5px solid var(--border)', borderRadius: 6, padding: '4px 8px', textAlign: 'center', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          </div>
          <SummaryRow label="الإجمالي" value={formatCurrency(total)} bold large />
        </div>
      </div>

      <Field label="ملاحظات"><textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} /></Field>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave({ ...form, total, subtotal }); }}>💾 حفظ الأمر</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Orders({ initialTab = 'sales' }) {
  const store = useStore();
  const bu = store.currentBusinessUnit;
  const [tab, setTab] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modal, setModal] = useState(false);

  const salesOrders = store.salesOrders.filter(o => {
    if ((o.businessUnitId || 'main') !== bu) return false;
    if (search && !o.number?.includes(search)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const purchaseOrders = store.purchaseOrders.filter(o => {
    if ((o.businessUnitId || 'main') !== bu) return false;
    if (search && !o.number?.includes(search)) return false;
    if (statusFilter && o.status !== statusFilter) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const orders = tab === 'sales' ? salesOrders : purchaseOrders;

  const handleSave = (form) => {
    if (tab === 'sales') { store.addSalesOrder(form); toast.success('تم إنشاء أمر البيع'); }
    else { store.addPurchaseOrder(form); toast.success('تم إنشاء أمر الشراء'); }
    setModal(false);
  };

  const handleStatus = async (order, status) => {
    if (tab === 'sales') store.updateSalesOrder(order.id, { status });
    else store.updatePurchaseOrder(order.id, { status });
    toast.success('تم تحديث حالة الأمر');
  };

  const getParty = (o) => {
    if (tab === 'sales') return store.customers.find(c => c.id === o.customerId)?.name || '-';
    return store.suppliers.find(s => s.id === o.supplierId)?.name || '-';
  };

  return (
    <div>
      <PageHeader
        title={tab === 'sales' ? 'أوامر البيع' : 'أوامر الشراء'}
        subtitle={`${orders.length} أمر`}
        actions={<button className="btn btn-primary" onClick={() => setModal(true)}>+ أمر جديد</button>}
      />

      <Tabs
        tabs={[
          { key: 'sales', label: '📦 أوامر البيع', count: salesOrders.length },
          { key: 'purchase', label: '🛒 أوامر الشراء', count: purchaseOrders.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الأمر..." />
        <select className="form-control" style={{ width: 180 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">جميع الحالات</option>
          {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </FilterBar>

      <div className="card">
        {orders.length === 0 ? (
          <EmptyState title="لا توجد أوامر" message="ابدأ بإنشاء أمر جديد" action={<button className="btn btn-primary" onClick={() => setModal(true)}>+ إنشاء أمر</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الأمر</th><th>التاريخ</th><th>تاريخ التسليم</th>
                  <th>{tab === 'sales' ? 'العميل' : 'المورد'}</th>
                  <th>الوصف</th><th>الإجمالي</th><th>الحالة</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id}>
                    <td className="font-bold">{o.number}</td>
                    <td>{formatDate(o.date)}</td>
                    <td>{o.deliveryDate ? formatDate(o.deliveryDate) : '-'}</td>
                    <td className="font-bold">{getParty(o)}</td>
                    <td className="text-muted">{o.description || '-'}</td>
                    <td className="number-cell">{formatCurrency(o.total)}</td>
                    <td><StatusBadge status={o.status} map={ORDER_STATUSES} /></td>
                    <td>
                      <div className="table-actions">
                        {o.status === 'new' && <IconBtn onClick={() => handleStatus(o, 'processing')} title="بدء التنفيذ" color="ghost">▶️</IconBtn>}
                        {o.status === 'processing' && <IconBtn onClick={() => handleStatus(o, 'completed')} title="إكمال" color="ghost">✅</IconBtn>}
                        <select className="form-control" style={{ width: 130, height: 30, padding: '0 8px', fontSize: 12 }} value={o.status} onChange={e => handleStatus(o, e.target.value)}>
                          {Object.entries(ORDER_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title={tab === 'sales' ? 'أمر بيع جديد' : 'أمر شراء جديد'} size="xl">
        <OrderForm
          type={tab === 'sales' ? 'sale' : 'purchase'}
          customers={store.customers.filter(c => (c.businessUnitId || 'main') === bu)}
          suppliers={store.suppliers.filter(s => (s.businessUnitId || 'main') === bu)}
          items={store.items.filter(i => (i.businessUnitId || 'main') === bu)}
          onSave={handleSave} onClose={() => setModal(false)}
        />
      </Modal>
    </div>
  );
}
