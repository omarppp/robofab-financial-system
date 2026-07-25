import { useState } from 'react';
import { useStore, INVOICE_STATUSES, EXPENSE_CATEGORIES } from '../store/useStore';
import { formatCurrency, formatDate, today, calcSubtotal } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, StatusBadge, toast, SummaryRow } from '../components/UI';
import { confirm } from '../components/UI';

const INVOICE_TYPE_LABELS = { sale: 'فاتورة مبيعات', purchase: 'فاتورة شراء', expense: 'فاتورة مصروفات' };
const DELIVERY_TYPES = ['توصيل', 'استلام من المقر', 'شحن', 'بريد'];

/* ── Invoice item row — no inventory column ── */
function InvoiceItemRow({ item, index, onUpdate, onRemove, accounts }) {
  const set = (k, v) => onUpdate(index, { ...item, [k]: v });
  const total = (parseFloat(item.quantity || 0) * parseFloat(item.unitPrice || 0)).toFixed(2);
  return (
    <tr>
      <td style={{ width: 36, textAlign: 'center' }}>
        <button onClick={() => onRemove(index)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 15 }}>✕</button>
      </td>
      <td>
        <input
          value={item.name}
          onChange={e => set('name', e.target.value)}
          placeholder="اسم الصنف أو الخدمة"
          className="inv-item-input"
        />
      </td>
      <td style={{ minWidth: 150 }}>
        <select value={item.accountId || ''} onChange={e => set('accountId', e.target.value)} className="inv-item-select">
          <option value="">-- حساب --</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </td>
      <td style={{ width: 90 }}>
        <input type="number" value={item.quantity} onChange={e => set('quantity', e.target.value)} min="0.001" step="0.001" className="inv-item-input" style={{ textAlign: 'center' }} />
      </td>
      <td style={{ width: 120 }}>
        <input type="number" value={item.unitPrice} onChange={e => set('unitPrice', e.target.value)} min="0" step="0.01" className="inv-item-input" style={{ textAlign: 'center' }} />
      </td>
      <td className="inv-item-total">{total}</td>
    </tr>
  );
}

/* ── Full-page Invoice Editor ── */
function InvoiceEditor({ type, initial = {}, customers, suppliers, accounts, onSave, onCancel }) {
  const [form, setForm] = useState({
    customerId: '', supplierId: '', date: today(),
    description: '', notes: '', discount: 0, status: 'draft',
    hasDelivery: false, deliveryType: '', deliveryDate: '', deliveryNotes: '',
    rounding: false, expenseCategory: '', reference: '',
    ...initial,
    items: initial.items || [{ name: '', quantity: 1, unitPrice: 0, accountId: '' }],
  });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setItem = (idx, item) => setForm(f => ({ ...f, items: f.items.map((it, i) => i === idx ? item : it) }));
  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { name: '', quantity: 1, unitPrice: 0, accountId: '' }] }));
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

  const incomeExpenseAccounts = accounts.filter(a =>
    ['income', 'expense', 'cash', 'bank', 'other', 'transport'].includes(a.type)
  );
  const typeLabel = INVOICE_TYPE_LABELS[type];
  const isEdit = !!initial.id;

  return (
    <div className="invoice-editor">

      {/* ── Page Header ── */}
      <div className="invoice-editor-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-ghost" onClick={onCancel}>← رجوع</button>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>
            {isEdit ? 'تعديل الفاتورة' : `إنشاء ${typeLabel}`}
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={() => submit('draft')}>💾 حفظ كمسودة</button>
          <button className="btn btn-primary" onClick={() => submit('pending')}>✓ حفظ وإصدار</button>
        </div>
      </div>

      {/* ── Basic Info ── */}
      <div className="card invoice-editor-section">
        <div className="invoice-editor-section-title">بيانات الفاتورة</div>
        <div className="form-grid-3">
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
          {type === 'expense' && (
            <>
              <Field label="العميل / المشروع المرتبط">
                <select className="form-control" value={form.customerId} onChange={e => set('customerId', e.target.value)}>
                  <option value="">— بدون ارتباط —</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="فئة المصروف">
                <select className="form-control" value={form.expenseCategory} onChange={e => set('expenseCategory', e.target.value)}>
                  <option value="">اختر الفئة</option>
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </Field>
            </>
          )}
          <Field label="تاريخ الفاتورة" required error={errors.date}>
            <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>
          <Field label="حالة الفاتورة">
            <select className="form-control" value={form.status} onChange={e => set('status', e.target.value)}>
              {Object.entries(INVOICE_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Field>
          <Field label="البيان / الوصف">
            <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف مختصر للفاتورة" />
          </Field>
          <Field label="رقم مرجعي">
            <input className="form-control" value={form.reference || ''} onChange={e => set('reference', e.target.value)} placeholder="رقم المرجع أو الأمر" />
          </Field>
        </div>
      </div>

      {/* ── Items Table ── */}
      <div className="card invoice-editor-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div className="invoice-editor-section-title" style={{ margin: 0 }}>بنود الفاتورة</div>
          {errors.items && <span className="form-error">{errors.items}</span>}
        </div>
        <div style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
          <table className="invoice-items-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}></th>
                <th>الصنف / الخدمة</th>
                <th style={{ width: 180 }}>الحساب</th>
                <th style={{ width: 90, textAlign: 'center' }}>الكمية</th>
                <th style={{ width: 130, textAlign: 'center' }}>سعر الوحدة (ج.م)</th>
                <th style={{ width: 130, textAlign: 'center' }}>الإجمالي (ج.م)</th>
              </tr>
            </thead>
            <tbody>
              {form.items.map((item, idx) => (
                <InvoiceItemRow key={idx} item={item} index={idx} onUpdate={setItem} onRemove={removeItem} accounts={incomeExpenseAccounts} />
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={addItem}>+ إضافة سطر</button>
      </div>

      {/* ── Notes + Totals ── */}
      <div className="invoice-editor-bottom">

        {/* Notes & Options */}
        <div className="card invoice-editor-section">
          <div className="invoice-editor-section-title">ملاحظات وخيارات</div>
          <Field label="ملاحظات">
            <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} placeholder="ملاحظات على الفاتورة" />
          </Field>
          <div style={{ display: 'flex', gap: 24, marginTop: 14, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.rounding} onChange={e => set('rounding', e.target.checked)} />
              تقريب المجموع
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: 'var(--text-secondary)' }}>
              <input type="checkbox" checked={form.hasDelivery} onChange={e => set('hasDelivery', e.target.checked)} />
              يشمل توصيل
            </label>
          </div>
          {form.hasDelivery && (
            <div className="form-grid" style={{ marginTop: 14 }}>
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

        {/* Totals */}
        <div className="card invoice-editor-section">
          <div className="invoice-editor-section-title">الإجماليات</div>
          <div className="invoice-total-section">
            <SummaryRow label="المجموع الفرعي" value={formatCurrency(subtotal)} />
            <div className="invoice-total-row">
              <span style={{ fontWeight: 600 }}>الخصم (ج.م)</span>
              <input
                type="number" value={form.discount} onChange={e => set('discount', e.target.value)} min="0" step="0.01"
                style={{ width: 110, border: '1.5px solid var(--border-light)', borderRadius: 6, padding: '5px 8px', textAlign: 'center', fontFamily: 'inherit', fontSize: 13, outline: 'none', background: 'var(--surface-2)', color: 'var(--text)' }}
              />
            </div>
            <SummaryRow label="الإجمالي النهائي (ج.م)" value={formatCurrency(total)} bold large />
          </div>
        </div>
      </div>

      {/* ── Sticky Bottom Actions ── */}
      <div className="invoice-editor-footer">
        <button className="btn btn-primary" onClick={() => submit('pending')}>✓ حفظ وإصدار</button>
        <button className="btn btn-ghost" onClick={() => submit('draft')}>💾 حفظ كمسودة</button>
        <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
      </div>
    </div>
  );
}

/* ── Print template ── */
function PrintInvoice({ invoice, customers, suppliers, companyName = 'نظام RoboFab المالي', headerUrl = null }) {
  const party = invoice.type === 'sale'
    ? customers.find(c => c.id === invoice.customerId)
    : suppliers.find(s => s.id === invoice.supplierId);
  const typeLabel = INVOICE_TYPE_LABELS[invoice.type] || 'فاتورة';

  return (
    <div id="print-invoice" className="print-invoice" style={{ fontFamily: 'Cairo, sans-serif', direction: 'rtl', padding: 40, maxWidth: 800, margin: '0 auto', background: 'white' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 30, borderBottom: '3px solid #f97316', paddingBottom: 20 }}>
        <div>
          <img src={headerUrl || '/brand/logo.png'} alt="Logo" style={{ width: 80, height: 80, objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#f97316' }}>{typeLabel}</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', marginTop: 4 }}>{companyName}</div>
        </div>
        <div style={{ textAlign: 'left', fontSize: 13, color: '#374151' }}>
          <div><strong>رقم الفاتورة:</strong> {invoice.number}</div>
          <div><strong>التاريخ:</strong> {formatDate(invoice.date)}</div>
          {invoice.reference && <div><strong>المرجع:</strong> {invoice.reference}</div>}
        </div>
      </div>

      {party && (
        <div style={{ background: '#f9fafb', padding: 16, borderRadius: 8, marginBottom: 24, border: '1px solid #e5e7eb' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6 }}>{invoice.type === 'sale' ? 'بيانات العميل' : 'بيانات المورد'}</div>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{party.name}</div>
          {party.phone && <div style={{ fontSize: 13, color: '#6b7280' }}>📞 {party.phone}</div>}
          {party.address && <div style={{ fontSize: 13, color: '#6b7280' }}>📍 {party.address}</div>}
        </div>
      )}
      {invoice.expenseCategory && (
        <div style={{ marginBottom: 12, fontSize: 13, color: '#374151' }}><strong>فئة المصروف:</strong> {invoice.expenseCategory}</div>
      )}
      {invoice.description && (
        <div style={{ marginBottom: 16, fontSize: 13, color: '#374151' }}><strong>البيان:</strong> {invoice.description}</div>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#f97316', color: 'white' }}>
            <th style={{ padding: 10, textAlign: 'right', fontSize: 12 }}>#</th>
            <th style={{ padding: 10, textAlign: 'right', fontSize: 12 }}>الصنف / الخدمة</th>
            <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>الكمية</th>
            <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>سعر الوحدة</th>
            <th style={{ padding: 10, textAlign: 'center', fontSize: 12 }}>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {(invoice.items || []).map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#f9fafb' : 'white' }}>
              <td style={{ padding: 10, fontSize: 13 }}>{i + 1}</td>
              <td style={{ padding: 10, fontSize: 13, fontWeight: 500 }}>{item.name}</td>
              <td style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>{item.quantity}</td>
              <td style={{ padding: 10, textAlign: 'center', fontSize: 13 }}>{formatCurrency(item.unitPrice)}</td>
              <td style={{ padding: 10, textAlign: 'center', fontSize: 13, fontWeight: 700 }}>{formatCurrency(parseFloat(item.quantity) * parseFloat(item.unitPrice))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: 300 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 14 }}>
            <span>المجموع الفرعي</span><span style={{ fontWeight: 700 }}>{formatCurrency(invoice.subtotal)}</span>
          </div>
          {invoice.discount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #e5e7eb', fontSize: 14, color: '#dc2626' }}>
              <span>الخصم</span><span style={{ fontWeight: 700 }}>- {formatCurrency(invoice.discount)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 18, fontWeight: 800, color: '#f97316', borderTop: '2px solid #f97316', marginTop: 4 }}>
            <span>الإجمالي النهائي</span><span>{formatCurrency(invoice.total)}</span>
          </div>
        </div>
      </div>

      {invoice.notes && <div style={{ marginTop: 20, padding: 12, background: '#fef3c7', borderRadius: 8, fontSize: 13 }}><strong>ملاحظات:</strong> {invoice.notes}</div>}
      {invoice.hasDelivery && (
        <div style={{ marginTop: 12, padding: 12, background: '#e0f2fe', borderRadius: 8, fontSize: 13 }}>
          <strong>بيانات التوصيل:</strong> {invoice.deliveryType} {invoice.deliveryDate ? `— ${formatDate(invoice.deliveryDate)}` : ''} {invoice.deliveryNotes ? `— ${invoice.deliveryNotes}` : ''}
        </div>
      )}
      <div style={{ marginTop: 40, textAlign: 'center', color: '#9ca3af', fontSize: 11, borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
        تم إصدار هذه الفاتورة بواسطة نظام RoboFab المالي
      </div>
    </div>
  );
}

/* ── Main Invoices page ── */
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
  const [editorMode, setEditorMode] = useState(null); // null | 'add' | 'edit'

  const bu = store.currentBusinessUnit;
  const invoices = store.invoices.filter(i => i.type === type && (i.businessUnitId || 'main') === bu);
  const filtered = invoices.filter(inv => {
    if (search && !inv.number?.includes(search) && !inv.description?.includes(search)) return false;
    if (statusFilter && inv.status !== statusFilter) return false;
    if (dateFrom && new Date(inv.date) < new Date(dateFrom)) return false;
    if (dateTo && new Date(inv.date) > new Date(dateTo)) return false;
    return true;
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalAmount = filtered.reduce((s, i) => s + (parseFloat(i.total) || 0), 0);

  const openAdd  = () => { setSelected(null); setEditorMode('add'); };
  const openEdit = (inv) => { setSelected(inv); setEditorMode('edit'); setModal(null); };
  const openView = (inv) => { setSelected(inv); setModal('view'); };

  const handleSave = (form) => {
    if (editorMode === 'add') {
      store.addInvoice({ ...form, type });
      toast.success('تم إنشاء الفاتورة بنجاح');
    } else {
      store.updateInvoice(selected.id, { ...form, type });
      toast.success('تم تحديث الفاتورة');
    }
    setEditorMode(null);
    setSelected(null);
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
    if (inv.type === 'expense' && inv.customerId) return store.customers.find(c => c.id === inv.customerId)?.name || '-';
    return '-';
  };

  const typeLabel = INVOICE_TYPE_LABELS[type];

  /* ── Full-page editor replaces list view ── */
  if (editorMode) {
    return (
      <InvoiceEditor
        type={type}
        initial={editorMode === 'edit' && selected ? selected : {}}
        customers={store.customers.filter(c => (c.businessUnitId || 'main') === bu)}
        suppliers={store.suppliers.filter(s => (s.businessUnitId || 'main') === bu)}
        accounts={store.accounts}
        onSave={handleSave}
        onCancel={() => { setEditorMode(null); setSelected(null); }}
      />
    );
  }

  /* ── List view ── */
  return (
    <div>
      <PageHeader
        title={typeLabel}
        subtitle={`${filtered.length} فاتورة • الإجمالي: ${formatCurrency(totalAmount)}`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ فاتورة جديدة</button>}
      />

      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث برقم الفاتورة أو البيان..." />
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
                  {type !== 'expense' && <th>{type === 'sale' ? 'العميل' : 'المورد'}</th>}
                  {type === 'expense' && <th>العميل / المشروع</th>}
                  <th>البيان</th>
                  {type === 'expense' && <th>الفئة</th>}
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
                    <td>{getPartyName(inv)}</td>
                    <td className="text-muted">{inv.description || '-'}</td>
                    {type === 'expense' && <td className="text-muted">{inv.expenseCategory || '-'}</td>}
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
                <tr style={{ background: 'var(--surface-3)' }}>
                  <td colSpan={type === 'expense' ? 5 : 4} className="font-bold">الإجمالي الكلي</td>
                  <td className="number-cell font-bold amount-positive">{formatCurrency(totalAmount)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* View Modal — read-only, no overlay issues for simple view */}
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
            {(type !== 'expense' || selected.customerId) && (
              <div style={{ marginBottom: 16, padding: 14, background: 'var(--surface-3)', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }}>
                <strong>{type === 'sale' ? 'العميل: ' : type === 'purchase' ? 'المورد: ' : 'العميل / المشروع: '}</strong>
                {getPartyName(selected)}
              </div>
            )}
            {type === 'expense' && selected.expenseCategory && (
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>فئة المصروف: </strong>{selected.expenseCategory}
              </div>
            )}
            {selected.reference && (
              <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>رقم المرجع: </strong>{selected.reference}
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
            {selected.notes && <div style={{ marginTop: 12, padding: 12, background: 'var(--surface-3)', borderRadius: 8, fontSize: 13, border: '1px solid var(--border)' }}><strong>ملاحظات:</strong> {selected.notes}</div>}
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
