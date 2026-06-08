import { useState } from 'react';
import { useStore, INVOICE_STATUSES, ACCOUNT_TYPES } from '../store/useStore';
import { formatCurrency, formatDate, today, addDays, calcSubtotal } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, StatusBadge, toast, SummaryRow } from '../components/UI';
import { confirm } from '../components/UI';

const INVOICE_TYPE_LABELS = { sale: 'فاتورة مبيعات', purchase: 'فاتورة شراء', expense: 'فاتورة مصروفات' };
const DELIVERY_TYPES = ['توصيل', 'استلام من المقر', 'شحن', 'بريد'];

function InvoiceItemRow({ item, index, onUpdate, onRemove, items: inventoryItems, accounts }) {
  const set = (k, v) => onUpdate(index, { ...item, [k]: v });
  const total = (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2);
  return (
    <tr>
      <td style={{ width: 40, textAlign: 'center' }}>
        <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16 }}>✕</button>
      </td>
      <td>
        <input value={item.name} onChange={e => set('name', e.target.value)} placeholder="اسم الصنف أو الخدمة" style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'right', padding: '4px' }} />
      </td>
      <td>
        <select value={item.accountId || ''} onChange={e => set('accountId', e.target.value)} style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 12, outline: 'none', textAlign: 'right' }}>
          <option value="">-- حساب --</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </td>
      <td>
        <select value={item.itemId || ''} onChange={e => {
          const inv = inventoryItems.find(i => i.id === e.target.value);
          if (inv) onUpdate(index, { ...item, itemId: inv.id, name: item.name || inv.name, unitPrice: inv.salePrice || item.unitPrice });
          else set('itemId', e.target.value);
        }} style={{ border: 'none', background: 'transparent', width: '100%', fontFamily: 'inherit', fontSize: 12, outline: 'none' }}>
          <option value="">-- صنف --</option>
          {inventoryItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      </td>
      <td><input type="number" value={item.quantity} onChange={e => set('quantity', e.target.value)} min="0.001" step="0.001" style={{ border: 'none', background: 'transparent', width: 70, fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }} /></td>
      <td><input type="number" value={item.unitPrice} onChange={e => set('unitPrice', e.target.value)} min="0" step="0.01" style={{ border: 'none', background: 'transparent', width: 90, fontFamily: 'inherit', fontSize: 13, outline: 'none', textAlign: 'center' }} /></td>
      <td style={{ fontWeight: 700, textAlign: 'center', color: '#1e3a5f', background: '#f8fafc' }}>{total}</td>
    </tr>
  );
}

function InvoiceForm({ type, initial = {}, customers, suppliers, accounts, items: inventoryItems, onSave, onClose }) {
  const isQuick = (k) => ['sale', 'purchase', 'expense'].includes(type);
  const [form, setForm] = useState({
    customerId: '', supplierId: '', date: today(), dueDate: addDays(today(), 30),
    description: '', notes: '', discount: 0, status: 'draft',
    hasDelivery: false, deliveryType: '', deliveryDate: '', deliveryNotes: '',
    rounding: false, ...initial,
    items: initial.items || [{ name: '', quantity: 1, unitPrice: 0, accountId: '', itemId: '' }],
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, item) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? item : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unitPrice: 0, accountId: '', itemId: '' }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const subtotal = calcSubtotal(form.items);
  const discount = parseFloat(form.discount) || 0;
  const total = form.rounding ? Math.round(subtotal - discount) : parseFloat((subtotal - discount).toFixed(2));

  const validate = () => {
    const e = {};
    if (type === 'sale' && !form.customerId) e.party = 'العميل مطلوب';
    if (type === 'purchase' && !form.supplierId) e.party = 'المورد مطلوب';
    if (!form.date) e.date = 'التاريخ مطلوب';
    if (form.items.length === 0) e.items = 'أضف عنصراً على الأقل';
    if (form.items.some(i => !i.name.trim())) e.items = 'أدخل اسم الصنف لجميع الأسطر';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = (status) => {
    if (!validate()) return;
    onSave({ ...form, total, subtotal, status: status || form.status });
  };

  const partyOptions = type === 'sale' ? customers.map(c => ({ value: c.id, label: c.name }))
    : type === 'purchase' ? suppliers.map(s => ({ value: s.id, label: s.name })) : [];

  const incomeExpenseAccounts = accounts.filter(a => ['income', 'expense', 'cash', 'bank', 'other', 'transport'].includes(a.type));

  return (
    <div>
      {/* Header Info */}
      <div className="form-grid" style={{ marginBottom: 20 }}>
        {type === 'sale' && (
          <Field label="العميل" required error={errors.party}>
            <select className={`form-control ${errors.party ? 'error' : ''}`} value={form.customerId} onChange={e => set('customerId', e.target.value)}>
              <option value="">اختر العميل</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {type === 'purchase' && (
          <Field label="المورد" required error={errors.party}>
            <select className={`form-control ${errors.party ? 'error' : ''}`} value={form.supplierId} onChange={e => set('supplierId', e.target.value)}>
              <option value="">اختر المورد</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
        )}
        <Field label="تاريخ الفاتورة" required error={errors.date}>
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="تاريخ الاستحقاق">
          <input type="date" className="form-control" value={form.dueDate} onChange={e => set('dueDate', e.target.value)} />
        </Field>
        <Field label="وصف الفاتورة">
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للفاتورة" />
        </Field>
        <Field label="حالة الفاتورة">
          <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
            {Object.entries(INVOICE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </Field>
      </div>

      {/* Items Table */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>بنود الفاتورة</strong>
          {errors.items && <span className="form-error">{errors.items}</span>}
        </div>
        <div className="table-container" style={{ border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>الصنف / الخدمة</th>
                <th>الحساب</th>
                <th>الصنف من المخزون</th>
                <th>الكمية</th>
                <th>سعر الوحدة</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => (
                <InvoiceItemRow key={idx} item={item} index={idx} onUpdate={setItem} onRemove={removeItem} items={inventoryItems} accounts={incomeExpenseAccounts} />
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline btn-sm mt-2" onClick={addItem}>+ إضافة سطر</button>
      </div>

      {/* Totals + Options */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <Field label="ملاحظات">
            <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="ملاحظات على الفاتورة" />
          </Field>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.rounding} onChange={e => set('rounding', e.target.checked)} />
              تقريب المجموع
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={form.hasDelivery} onChange={e => set('hasDelivery', e.target.checked)} />
              يشمل توصيل
            </label>
          </div>
          {form.hasDelivery && (
            <div className="form-grid mt-2">
              <Field label="نوع التوصيل">
                <select className="form-control" value={form.deliveryType} onChange={e => set('deliveryType', e.target.value)}>
                  <option value="">اختر النوع</option>
                  {DELIVERY_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="تاريخ التوصيل">
                <input type="date" className="form-control" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)} />
              </Field>
              <Field label="ملاحظات التوصيل" span={2}>
                <input className="form-control" value={form.deliveryNotes} onChange={e => set('deliveryNotes', e.target.value)} placeholder="تفاصيل التوصيل" />
              </Field>
            </div>
          )}
        </div>
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

      <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
        <button className="btn btn-primary" onClick={() => submit('pending')}>✓ حفظ وإصدار</button>
        <button className="btn btn-ghost" onClick={() => submit('draft')}>💾 حفظ كمسودة</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

function PrintInvoice({ invoice, customers, suppliers, companyName = 'نظام RoboFab المالي', headerUrl = null }) {
  const party = invoice.type === 'sale'
    ? customers.find(c => c.id === invoice.customerId)
    : suppliers.find(s => s.id === invoice.supplierId);
  const typeLabel = INVOICE_TYPE_LABELS[invoice.type] || 'فاتورة';

  return (
    <div id="print-invoice" className="print-invoice" style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', padding: 40, maxWidth: 800, margin: '0 auto', background: 'white' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, borderBottom: '3px solid #1e3a5f', paddingBottom: 20 }}>
        <div>
          <img src={headerUrl || '/logo.png'} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#1e3a5f' }}>{typeLabel}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1e3a5f', marginTop: 4 }}>{companyName}</div>
        </div>
        <div style={{ textAlign: 'left', fontSize: 13 }}>
          <div><strong>رقم الفاتورة:</strong> {invoice.number}</div>
          <div><strong>التاريخ:</strong> {formatDate(invoice.date)}</div>
          {invoice.dueDate && <div><strong>الاستحقاق:</strong> {formatDate(invoice.dueDate)}</div>}
        </div>
      </div>

      {/* Party Info */}
      {party && (
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, marginBottom: 24 }}>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>{invoice.type === 'sale' ? 'بيانات العميل' : 'بيانات المورد'}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{party.name}</div>
          {party.phone && <div style={{ fontSize: 13, color: '#64748b' }}>📞 {party.phone}</div>}
          {party.address && <div style={{ fontSize: 13, color: '#64748b' }}>📍 {party.address}</div>}
        </div>
      )}

      {/* Description */}
      {invoice.description && <div style={{ marginBottom: 16, fontSize: 13, color: '#64748b' }}><strong>الوصف:</strong> {invoice.description}</div>}

      {/* Items */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#1e3a5f', color: 'white' }}>
            <th style={{ padding: 10, textAlign: 'right', fontSize: 12 }}>#</th>
            <th style={{ padding: 10, textAlign: 'right', fontSize: 12 }}>الصنف / الخدمة</th>
            <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>الكمية</th>
            <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>سعر الوحدة</th>
            <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f8fafc' : 'white' }}>
              <td style={{ padding: 10, fontSize: 13 }}>{i + 1}</td>
              <td style={{ padding: 10, fontSize: 13, fontWeight: 500 }}>{item.name}</td>
              <td style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>{item.quantity}</td>
              <td style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ padding: 10, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unitPrice))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: 14 }}>
            <span>المجموع الفرعي</span><span style={{ fontWeight: 700 }}>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e2e8f0', fontSize: 14, color: '#dc2626' }}>
              <span>الخصم</span><span style={{ fontWeight: 700 }}>- {formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontWeight: 800, color: '#1e3a5f', borderTop: '2px solid #1e3a5f', marginTop: 4 }}>
            <span>الإجمالي النهائي</span><span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && <div style={{ marginTop: 20, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 13 }}><strong>ملاحظات:</strong> {invoice.notes}</div>}
      {invoice.hasDelivery && (
        <div style={{ marginTop: 12, padding: 12, background: '#e0f2fe', borderRadius: 8, fontSize: 13 }}>
          <strong>بيانات التوصيل:</strong> {invoice.deliveryType} {invoice.deliveryDate ? `- ${formatDate(invoice.deliveryDate)}` : ''} {invoice.deliveryNotes ? `- ${invoice.deliveryNotes}` : ''}
        </div>
      )}

      <div style={{ marginTop: 40, textAlign: 'center', color: '#94a3b8', fontSize: 11, borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
        تم إصدار هذه الفاتورة بواسطة نظام RoboFab المالي
      </div>
    </div>
  );
}

export default function Invoices({ type = 'sale' }) {
  const store = useStore();
  const invoiceHeaderUrl = '/brand/logo.png';
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);
  const [printInv, setPrintInv] = useState(null);

  const invoices = store.invoices.filter(i => i.type === type);
  const filtered = invoices.filter(inv => {
    if (search && !inv.number?.includes(search) && !inv.description?.includes(search)) return false;
    if (statusFilter && inv.status !== statusFilter) return false;
    if (dateFrom && new Date(inv.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(inv.date) > new Date(dateTo)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalAmount = filtered.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (inv) => { setSelected(inv); setModal('edit'); };
  const openView = (inv) => { setSelected(inv); setModal('view'); };

  const handleSave = (form) => {
    if (modal === 'add') {
      const inv = store.addInvoice({ ...form, type });
      toast.success('تم إنشاء الفاتورة بنجاح');
    } else {
      store.updateInvoice(selected.id, { ...form, type });
      toast.success('تم تحديث الفاتورة');
    }
    setModal(null);
  };

  const handleDelete = async (inv) => {
    const ok = await confirm('حذف الفاتورة', `هل أنت متأكد من حذف الفاتورة ${inv.number}؟`);
    if (ok) { store.deleteInvoice(inv.id); toast.success('تم حذف الفاتورة'); }
  };

  const handlePrint = (inv) => {
    setPrintInv(inv);
    setTimeout(() => {
      const win = window.open('', '_blank', 'width=900,height=700');
      const el = document.getElementById('print-invoice');
      if (!el || !win) return;
      win.document.write(`<html lang="ar" dir="rtl"><head><meta charset="UTF-8"><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet"><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Cairo',sans-serif;direction:rtl;}</style></head><body>${el.outerHTML}</body></html>`);
      win.document.close();
      setTimeout(() => { win.print(); setPrintInv(null); }, 800);
    }, 100);
  };

  const getPartyName = (inv) => {
    if (inv.type === 'sale') return store.customers.find(c => c.id === inv.customerId)?.name || '-';
    if (inv.type === 'purchase') return store.suppliers.find(s => s.id === inv.supplierId)?.name || '-';
    return '-';
  };

  const typeLabel = INVOICE_TYPE_LABELS[type];

  return (
    <div>
      <PageHeader
        title={typeLabel}
        subtitle={`${filtered.length} فاتورة • الإجمالي: ${formatCurrency(totalAmount)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ فاتورة جديدة</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو الوصف..." />
        <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">جميع الحالات</option>
          {Object.entries(INVOICE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <input type="date" className="form-control" style={{ width: 150 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <input type="date" className="form-control" style={{ width: 150 }} value={dateTo} onChange={e => setDateTo(e.target.value)} />
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title={`لا توجد ${typeLabel}`} message="ابدأ بإنشاء فاتورتك الأولى" action={<button className="btn btn-primary" onClick={openAdd}>+ فاتورة جديدة</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>رقم الفاتورة</th>
                  <th>التاريخ</th>
                  <th>الاستحقاق</th>
                  {type !== 'expense' && <th>{type === 'sale' ? 'العميل' : 'المورد'}</th>}
                  <th>الوصف</th>
                  <th>الإجمالي</th>
                  <th>الحالة</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-bold" style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => openView(inv)}>{inv.number}</td>
                    <td>{formatDate(inv.date)}</td>
                    <td>{inv.dueDate ? formatDate(inv.dueDate) : '-'}</td>
                    {type !== 'expense' && <td>{getPartyName(inv)}</td>}
                    <td className="text-muted">{inv.description || '-'}</td>
                    <td className="number-cell">{formatCurrency(inv.total)}</td>
                    <td><StatusBadge status={inv.status} map={INVOICE_STATUSES} /></td>
                    <td>
                      <div className="table-actions">
                        <IconBtn onClick={() => handlePrint(inv)} title="طباعة" color="ghost">🖨️</IconBtn>
                        <IconBtn onClick={() => openEdit(inv)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(inv)} title="حذف" color="ghost">🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#f8fafc' }}>
                  <td colSpan={type !== 'expense' ? 5 : 4} className="font-bold">الإجمالي الكلي</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(totalAmount)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? `إنشاء ${typeLabel}` : `تعديل الفاتورة`} size="xl">
        <InvoiceForm
          type={type} initial={selected || {}}
          customers={store.customers} suppliers={store.suppliers}
          accounts={store.accounts} items={store.items}
          onSave={handleSave} onClose={() => setModal(null)}
        />
      </Modal>

      {/* View Modal */}
      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`عرض الفاتورة: ${selected?.number}`} size="xl"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => handlePrint(selected)}>🖨️ طباعة</button>
            <button className="btn btn-ghost" onClick={() => openEdit(selected)}>✏️ تعديل</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إغلاق</button>
          </div>
        }
      >
        {selected && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 12 }}><div className="text-sm text-muted">رقم الفاتورة</div><div className="font-bold" style={{ color: 'var(--primary)' }}>{selected.number}</div></div>
              <div className="card" style={{ padding: 12 }}><div className="text-sm text-muted">التاريخ</div><div className="font-bold">{formatDate(selected.date)}</div></div>
              <div className="card" style={{ padding: 12 }}><div className="text-sm text-muted">الإجمالي</div><div className="font-bold amount-positive">{formatCurrency(selected.total)}</div></div>
              <div className="card" style={{ padding: 12 }}><div className="text-sm text-muted">الحالة</div><StatusBadge status={selected.status} map={INVOICE_STATUSES} /></div>
            </div>
            {type !== 'expense' && (
              <div style={{ marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 8, fontSize: 13 }}>
                <strong>{type === 'sale' ? 'العميل: ' : 'المورد: '}</strong>{getPartyName(selected)}
              </div>
            )}
            <div className="table-container">
              <table className="table">
                <thead><tr><th>الصنف</th><th>الكمية</th><th>سعر الوحدة</th><th>الإجمالي</th></tr></thead>
                <tbody>
                  {(selected.items || []).map((item, i) => (
                    <tr key={i}>
                      <td>{item.name}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="number-cell text-center">{formatCurrency(item.unitPrice)}</td>
                      <td className="number-cell font-bold">{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unitPrice))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ width: 280 }}>
                <SummaryRow label="المجموع الفرعي" value={formatCurrency(selected.subtotal)} />
                {selected.discount > 0 && <SummaryRow label="الخصم" value={`- ${formatCurrency(selected.discount)}`} />}
                <SummaryRow label="الإجمالي النهائي" value={formatCurrency(selected.total)} bold large />
              </div>
            </div>
            {selected.notes && <div className="mt-3" style={{ padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 13 }}><strong>ملاحظات:</strong> {selected.notes}</div>}
          </div>
        )}
      </Modal>

      {/* Hidden Print Area */}
      {printInv && (
        <div style={{ position: 'absolute', left: -9999, top: 0 }}>
          <PrintInvoice invoice={printInv} customers={store.customers} suppliers={store.suppliers} headerUrl={invoiceHeaderUrl} />
        </div>
      )}
    </div>
  );
}
