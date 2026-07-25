import { useState, useMemo } from 'react';
import { useStore, REPAIR_ORDER_STATUSES } from '../store/useStore';
import { formatDate, formatCurrency, today } from '../utils/helpers';
import {
  Wrench, Plus, Search, Eye, Edit2, Trash2, Printer,
  ChevronRight, X, Save, Package,
} from 'lucide-react';

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const info = REPAIR_ORDER_STATUSES[status] || { label: status, color: 'muted' };
  return <span className={`badge badge-${info.color}`}>{info.label}</span>;
}

// ─── Device types ─────────────────────────────────────────────────────────────
const DEVICE_TYPES = [
  'جهاز PlayStation 4',
  'جهاز PlayStation 5',
  'جهاز Xbox One',
  'جهاز Xbox Series',
  'جهاز Nintendo Switch',
  'يد تحكم PS4',
  'يد تحكم PS5',
  'يد تحكم Xbox',
  'يد تحكم Nintendo',
  'شاشة',
  'أخرى',
];

const STATUS_ORDER = ['received', 'inspecting', 'pending-approval', 'repairing', 'ready', 'delivered', 'cancelled'];

// ─── Print Component ───────────────────────────────────────────────────────────
function PrintRepairOrder({ order, customers, onClose }) {
  const customer = customers.find(c => c.id === order.customerId);
  const handlePrint = () => window.print();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">معاينة طباعة أمر الصيانة</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary" onClick={handlePrint} style={{ gap: 6 }}>
              <Printer size={14} /> طباعة
            </button>
            <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div className="modal-body">
          <div className="print-area" id="repair-print">
            <div className="print-header">
              <div className="print-company">
                <div className="print-company-name">سيستم الجويستيك</div>
                <div className="print-company-sub">إصلاح وصيانة أجهزة الألعاب الإلكترونية</div>
              </div>
              <div className="print-invoice-meta" style={{ textAlign: 'left' }}>
                <div className="print-invoice-num">أمر صيانة: {order.number}</div>
                <div className="print-invoice-date">تاريخ الاستلام: {formatDate(order.receivedDate)}</div>
                {order.expectedDelivery && (
                  <div>موعد التسليم المتوقع: {formatDate(order.expectedDelivery)}</div>
                )}
                <div style={{ marginTop: 4 }}><StatusBadge status={order.status} /></div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, margin: '16px 0', padding: 12, background: '#f8fafc', borderRadius: 8 }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>بيانات العميل</div>
                <div><strong>الاسم:</strong> {customer?.name || '-'}</div>
                {customer?.phone && <div><strong>الهاتف:</strong> {customer.phone}</div>}
                {customer?.address && <div><strong>العنوان:</strong> {customer.address}</div>}
              </div>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>بيانات الجهاز</div>
                <div><strong>نوع الجهاز:</strong> {order.deviceType || '-'}</div>
                {order.deviceSerial && <div><strong>الرقم التسلسلي:</strong> {order.deviceSerial}</div>}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>الشكوى / العطل</div>
              <div style={{ padding: '8px 12px', background: '#fef9f0', borderRadius: 6, border: '1px solid #fde68a' }}>{order.complaint || '-'}</div>
            </div>

            {order.inspectionResult && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>نتيجة الفحص</div>
                <div style={{ padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, border: '1px solid #bbf7d0' }}>{order.inspectionResult}</div>
              </div>
            )}

            {order.requiredRepair && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 6, color: '#374151' }}>الإصلاح المطلوب</div>
                <div style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, border: '1px solid #bae6fd' }}>{order.requiredRepair}</div>
              </div>
            )}

            {order.partsUsed && order.partsUsed.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 8, color: '#374151' }}>قطع الغيار المستخدمة</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>القطعة</th>
                      <th style={{ textAlign: 'center' }}>الكمية</th>
                      <th style={{ textAlign: 'center' }}>السعر</th>
                      <th style={{ textAlign: 'center' }}>الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.partsUsed.map((p, i) => (
                      <tr key={i}>
                        <td>{p.name}</td>
                        <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                        <td style={{ textAlign: 'center' }}>{formatCurrency(p.price)}</td>
                        <td style={{ textAlign: 'center' }}>{formatCurrency((p.quantity || 1) * (p.price || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <div style={{ background: '#f0fdf4', border: '2px solid #10b981', borderRadius: 10, padding: '12px 24px', minWidth: 200, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>تكلفة الإصلاح</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{formatCurrency(order.repairCost)}</div>
              </div>
            </div>

            {order.technicianNotes && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, color: '#374151' }}>ملاحظات الفني</div>
                <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>{order.technicianNotes}</div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, marginTop: 40, paddingTop: 16, borderTop: '1px solid #e5e7eb' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #374151', paddingTop: 8, marginTop: 30, color: '#6b7280', fontSize: 12 }}>توقيع العميل</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ borderTop: '1px solid #374151', paddingTop: 8, marginTop: 30, color: '#6b7280', fontSize: 12 }}>توقيع الفني</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Repair Order Form ────────────────────────────────────────────────────────
function RepairOrderForm({ order, customers, onSave, onCancel }) {
  const isEdit = !!order?.id;

  const [form, setForm] = useState({
    customerId: order?.customerId || '',
    deviceType: order?.deviceType || '',
    deviceSerial: order?.deviceSerial || '',
    complaint: order?.complaint || '',
    inspectionResult: order?.inspectionResult || '',
    requiredRepair: order?.requiredRepair || '',
    repairCost: order?.repairCost || '',
    receivedDate: order?.receivedDate || today(),
    expectedDelivery: order?.expectedDelivery || '',
    deliveryDate: order?.deliveryDate || '',
    status: order?.status || 'received',
    technicianNotes: order?.technicianNotes || '',
    customerNotes: order?.customerNotes || '',
    partsUsed: order?.partsUsed || [],
  });

  const [errors, setErrors] = useState({});

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const addPart = () => setF('partsUsed', [...form.partsUsed, { name: '', quantity: 1, price: '' }]);
  const updatePart = (i, k, v) => setF('partsUsed', form.partsUsed.map((p, idx) => idx === i ? { ...p, [k]: v } : p));
  const removePart = (i) => setF('partsUsed', form.partsUsed.filter((_, idx) => idx !== i));

  const partsTotal = form.partsUsed.reduce((s, p) => s + (parseFloat(p.quantity) || 1) * (parseFloat(p.price) || 0), 0);

  const validate = () => {
    const e = {};
    if (!form.customerId) e.customerId = 'اختر العميل';
    if (!form.deviceType) e.deviceType = 'اختر نوع الجهاز';
    if (!form.complaint.trim()) e.complaint = 'أدخل الشكوى';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    onSave({ ...form, repairCost: parseFloat(form.repairCost) || 0 });
  };

  const Field = ({ label, error, children, required }) => (
    <div className="form-group">
      <label className="form-label">{label}{required && <span style={{ color: '#ef4444', marginRight: 2 }}>*</span>}</label>
      {children}
      {error && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 3 }}>{error}</div>}
    </div>
  );

  return (
    <div style={{ padding: '0 0 32px' }}>
      {/* Status stepper */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {STATUS_ORDER.filter(s => s !== 'cancelled').map((s, i, arr) => {
          const info = REPAIR_ORDER_STATUSES[s];
          const isActive = form.status === s;
          const isPast = STATUS_ORDER.indexOf(form.status) > STATUS_ORDER.indexOf(s);
          return (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <div
                onClick={() => setF('status', s)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  background: isActive ? '#10b981' : isPast ? '#d1fae5' : '#f1f5f9',
                  color: isActive ? '#fff' : isPast ? '#065f46' : '#64748b',
                  border: isActive ? '2px solid #10b981' : '2px solid transparent',
                }}
              >
                {info.label}
              </div>
              {i < arr.length - 1 && <ChevronRight size={14} style={{ color: '#94a3b8', margin: '0 2px', flexShrink: 0 }} />}
            </div>
          );
        })}
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <ChevronRight size={14} style={{ color: '#94a3b8', margin: '0 2px' }} />
          <div
            onClick={() => setF('status', 'cancelled')}
            style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap',
              background: form.status === 'cancelled' ? '#ef4444' : '#f1f5f9',
              color: form.status === 'cancelled' ? '#fff' : '#64748b',
              border: form.status === 'cancelled' ? '2px solid #ef4444' : '2px solid transparent',
            }}
          >
            ملغي
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="العميل" error={errors.customerId} required>
          <select className="form-control" value={form.customerId} onChange={e => setF('customerId', e.target.value)}>
            <option value="">اختر العميل...</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>

        <Field label="نوع الجهاز" error={errors.deviceType} required>
          <select className="form-control" value={form.deviceType} onChange={e => setF('deviceType', e.target.value)}>
            <option value="">اختر نوع الجهاز...</option>
            {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        <Field label="الرقم التسلسلي">
          <input className="form-control" value={form.deviceSerial}
            onChange={e => setF('deviceSerial', e.target.value)} placeholder="اختياري" />
        </Field>

        <Field label="تكلفة الإصلاح">
          <input className="form-control" type="number" value={form.repairCost}
            onChange={e => setF('repairCost', e.target.value)} placeholder="0.00" />
        </Field>

        <Field label="تاريخ الاستلام">
          <input className="form-control" type="date" value={form.receivedDate}
            onChange={e => setF('receivedDate', e.target.value)} />
        </Field>

        <Field label="التاريخ المتوقع للتسليم">
          <input className="form-control" type="date" value={form.expectedDelivery}
            onChange={e => setF('expectedDelivery', e.target.value)} />
        </Field>

        {['delivered', 'cancelled'].includes(form.status) && (
          <Field label="تاريخ التسليم الفعلي">
            <input className="form-control" type="date" value={form.deliveryDate}
              onChange={e => setF('deliveryDate', e.target.value)} />
          </Field>
        )}
      </div>

      <Field label="الشكوى / العطل" error={errors.complaint} required>
        <textarea className="form-control" rows={3} value={form.complaint}
          onChange={e => setF('complaint', e.target.value)} placeholder="وصف تفصيلي للعطل..." />
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Field label="نتيجة الفحص">
          <textarea className="form-control" rows={3} value={form.inspectionResult}
            onChange={e => setF('inspectionResult', e.target.value)} placeholder="نتيجة الفحص الفني..." />
        </Field>
        <Field label="الإصلاح المطلوب">
          <textarea className="form-control" rows={3} value={form.requiredRepair}
            onChange={e => setF('requiredRepair', e.target.value)} placeholder="تفاصيل الإصلاح..." />
        </Field>
      </div>

      {/* Parts Used */}
      <div className="card" style={{ padding: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#374151' }}>
            <Package size={14} style={{ marginLeft: 6, verticalAlign: 'middle' }} />
            قطع الغيار المستخدمة
          </div>
          <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={addPart}>
            <Plus size={13} /> إضافة قطعة
          </button>
        </div>
        {form.partsUsed.length === 0 && (
          <div style={{ textAlign: 'center', color: '#94a3b8', padding: '12px 0', fontSize: 13 }}>لا توجد قطع غيار مضافة</div>
        )}
        {form.partsUsed.map((p, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 120px 36px', gap: 8, marginBottom: 8 }}>
            <input className="form-control" value={p.name} onChange={e => updatePart(i, 'name', e.target.value)} placeholder="اسم القطعة" />
            <input className="form-control" type="number" value={p.quantity} onChange={e => updatePart(i, 'quantity', e.target.value)} placeholder="الكمية" min={1} />
            <input className="form-control" type="number" value={p.price} onChange={e => updatePart(i, 'price', e.target.value)} placeholder="السعر" />
            <button className="btn btn-ghost" style={{ color: '#ef4444', padding: '6px 8px' }} onClick={() => removePart(i)}>
              <X size={14} />
            </button>
          </div>
        ))}
        {form.partsUsed.length > 0 && (
          <div style={{ textAlign: 'left', fontWeight: 700, color: '#10b981', marginTop: 8, paddingTop: 8, borderTop: '1px solid #e2e8f0' }}>
            إجمالي القطع: {formatCurrency(partsTotal)}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
        <Field label="ملاحظات الفني">
          <textarea className="form-control" rows={3} value={form.technicianNotes}
            onChange={e => setF('technicianNotes', e.target.value)} placeholder="ملاحظات داخلية..." />
        </Field>
        <Field label="ملاحظات العميل">
          <textarea className="form-control" rows={3} value={form.customerNotes}
            onChange={e => setF('customerNotes', e.target.value)} placeholder="طلبات / ملاحظات العميل..." />
        </Field>
      </div>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
        <button className="btn btn-ghost" onClick={onCancel}>إلغاء</button>
        <button className="btn btn-primary" onClick={handleSubmit}>
          <Save size={14} /> {isEdit ? 'حفظ التعديلات' : 'إنشاء أمر الصيانة'}
        </button>
      </div>
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────
function ViewModal({ order, customers, onClose, onEdit, onPrint }) {
  const customer = customers.find(c => c.id === order.customerId);
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">أمر صيانة: {order.number}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" style={{ fontSize: 12 }} onClick={onPrint}><Printer size={14} /> طباعة</button>
            <button className="btn btn-primary" style={{ fontSize: 12 }} onClick={onEdit}><Edit2 size={14} /> تعديل</button>
            <button className="btn btn-ghost" onClick={onClose}><X size={16} /></button>
          </div>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatusBadge status={order.status} />
            <span style={{ color: '#64748b', fontSize: 13 }}>الاستلام: {formatDate(order.receivedDate)}</span>
            {order.expectedDelivery && <span style={{ color: '#64748b', fontSize: 13 }}>المتوقع: {formatDate(order.expectedDelivery)}</span>}
            {order.deliveryDate && <span style={{ color: '#10b981', fontSize: 13 }}>التسليم: {formatDate(order.deliveryDate)}</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>العميل</div>
              <div style={{ fontWeight: 700 }}>{customer?.name || '-'}</div>
              {customer?.phone && <div style={{ fontSize: 13, color: '#64748b' }}>{customer.phone}</div>}
            </div>
            <div className="card" style={{ padding: 12 }}>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>الجهاز</div>
              <div style={{ fontWeight: 700 }}>{order.deviceType || '-'}</div>
              {order.deviceSerial && <div style={{ fontSize: 13, color: '#64748b' }}>S/N: {order.deviceSerial}</div>}
            </div>
          </div>

          <InfoRow label="الشكوى" value={order.complaint} highlight="warning" />
          {order.inspectionResult && <InfoRow label="نتيجة الفحص" value={order.inspectionResult} highlight="success" />}
          {order.requiredRepair && <InfoRow label="الإصلاح المطلوب" value={order.requiredRepair} highlight="info" />}

          {order.partsUsed && order.partsUsed.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>قطع الغيار</div>
              <table className="table" style={{ fontSize: 13 }}>
                <thead><tr><th>القطعة</th><th style={{ textAlign: 'center' }}>الكمية</th><th style={{ textAlign: 'center' }}>السعر</th><th style={{ textAlign: 'center' }}>الإجمالي</th></tr></thead>
                <tbody>
                  {order.partsUsed.map((p, i) => (
                    <tr key={i}>
                      <td>{p.name}</td>
                      <td style={{ textAlign: 'center' }}>{p.quantity}</td>
                      <td style={{ textAlign: 'center' }}>{formatCurrency(p.price)}</td>
                      <td style={{ textAlign: 'center' }}>{formatCurrency((p.quantity || 1) * (p.price || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <div style={{ background: '#f0fdf4', border: '2px solid #10b981', borderRadius: 10, padding: '10px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: '#6b7280' }}>تكلفة الإصلاح</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#10b981' }}>{formatCurrency(order.repairCost)}</div>
            </div>
          </div>

          {order.technicianNotes && <InfoRow label="ملاحظات الفني" value={order.technicianNotes} />}
          {order.customerNotes && <InfoRow label="ملاحظات العميل" value={order.customerNotes} />}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, highlight }) {
  const bg = highlight === 'warning' ? '#fef9f0' : highlight === 'success' ? '#f0fdf4' : highlight === 'info' ? '#f0f9ff' : '#f8fafc';
  const border = highlight === 'warning' ? '#fde68a' : highlight === 'success' ? '#bbf7d0' : highlight === 'info' ? '#bae6fd' : '#e2e8f0';
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 13 }}>{label}</div>
      <div style={{ padding: '8px 12px', background: bg, borderRadius: 6, border: `1px solid ${border}`, fontSize: 13 }}>{value || '-'}</div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RepairOrders({ onNavigate }) {
  const store = useStore();
  const bu = store.currentBusinessUnit;

  // Filter to joystick orders only
  const allRepairOrders = useMemo(
    () => store.repairOrders.filter(r => (r.businessUnitId || 'joystick') === 'joystick'),
    [store.repairOrders]
  );

  const buCustomers = useMemo(
    () => store.customers.filter(c => (c.businessUnitId || 'main') === bu),
    [store.customers, bu]
  );

  const [view, setView] = useState('list'); // 'list' | 'add' | 'edit'
  const [selected, setSelected] = useState(null);
  const [viewOrder, setViewOrder] = useState(null);
  const [printOrder, setPrintOrder] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = useMemo(() => {
    let list = allRepairOrders;
    if (statusFilter !== 'all') list = list.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const cust = buCustomers.find(c => c.id === r.customerId);
        return (
          r.number?.toLowerCase().includes(q) ||
          r.deviceType?.toLowerCase().includes(q) ||
          r.complaint?.toLowerCase().includes(q) ||
          cust?.name?.toLowerCase().includes(q)
        );
      });
    }
    if (dateFrom) list = list.filter(r => r.receivedDate >= dateFrom);
    if (dateTo)   list = list.filter(r => r.receivedDate <= dateTo);
    return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [allRepairOrders, statusFilter, search, dateFrom, dateTo, buCustomers]);

  // Stats
  const stats = useMemo(() => {
    const active = allRepairOrders.filter(r => !['delivered', 'cancelled'].includes(r.status));
    const result = {};
    Object.keys(REPAIR_ORDER_STATUSES).forEach(k => {
      result[k] = allRepairOrders.filter(r => r.status === k).length;
    });
    result.active = active.length;
    result.totalRevenue = allRepairOrders
      .filter(r => r.status === 'delivered')
      .reduce((s, r) => s + (parseFloat(r.repairCost) || 0), 0);
    return result;
  }, [allRepairOrders]);

  const handleSave = (data) => {
    if (view === 'edit' && selected?.id) {
      store.updateRepairOrder(selected.id, data);
    } else {
      store.addRepairOrder(data);
    }
    setView('list');
    setSelected(null);
  };

  const handleEdit = (order) => {
    setSelected(order);
    setViewOrder(null);
    setView('edit');
  };

  const handleDelete = (order) => {
    if (!confirm(`هل تريد حذف أمر الصيانة ${order.number}؟`)) return;
    store.deleteRepairOrder(order.id);
  };

  const handleStatusChange = (order, newStatus) => {
    const changes = { status: newStatus };
    if (newStatus === 'delivered' && !order.deliveryDate) changes.deliveryDate = today();
    store.updateRepairOrder(order.id, changes);
  };

  // ── Add / Edit View ────────────────────────────────────────────────────────
  if (view === 'add' || view === 'edit') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <button className="btn btn-ghost" onClick={() => { setView('list'); setSelected(null); }}>
            <ChevronRight size={16} /> العودة
          </button>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1e293b' }}>
            {view === 'edit' ? `تعديل: ${selected?.number}` : 'إنشاء أمر صيانة جديد'}
          </h2>
        </div>
        <div className="card" style={{ padding: 24 }}>
          <RepairOrderForm
            order={selected}
            customers={buCustomers}
            onSave={handleSave}
            onCancel={() => { setView('list'); setSelected(null); }}
          />
        </div>
      </div>
    );
  }

  // ── List View ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Modals */}
      {viewOrder && (
        <ViewModal
          order={viewOrder}
          customers={buCustomers}
          onClose={() => setViewOrder(null)}
          onEdit={() => handleEdit(viewOrder)}
          onPrint={() => { setPrintOrder(viewOrder); setViewOrder(null); }}
        />
      )}
      {printOrder && (
        <PrintRepairOrder
          order={printOrder}
          customers={buCustomers}
          onClose={() => setPrintOrder(null)}
        />
      )}

      {/* Stats Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { key: 'received',   label: 'تم الاستلام',   color: '#64748b' },
          { key: 'repairing',  label: 'قيد الإصلاح',   color: '#8b5cf6' },
          { key: 'ready',      label: 'جاهز',           color: '#10b981' },
          { key: 'delivered',  label: 'تم التسليم',     color: '#3b82f6' },
          { key: 'cancelled',  label: 'ملغي',           color: '#ef4444' },
        ].map(({ key, label, color }) => (
          <div
            key={key}
            className="card"
            style={{ padding: '14px 16px', cursor: 'pointer', borderTop: `3px solid ${color}` }}
            onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
          >
            <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color }}>{stats[key] || 0}</div>
          </div>
        ))}
      </div>

      {/* Revenue card */}
      <div className="card" style={{ padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, color: '#374151' }}>إجمالي إيرادات الصيانة (مسلّمة)</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#10b981' }}>{formatCurrency(stats.totalRevenue)}</div>
      </div>

      {/* Toolbar */}
      <div className="card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              className="form-control"
              style={{ paddingRight: 32 }}
              placeholder="بحث بالرقم أو العميل أو الجهاز..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <select className="form-control" style={{ width: 160 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">كل الحالات</option>
            {Object.entries(REPAIR_ORDER_STATUSES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <input className="form-control" type="date" style={{ width: 140 }} value={dateFrom} onChange={e => setDateFrom(e.target.value)} placeholder="من تاريخ" />
          <input className="form-control" type="date" style={{ width: 140 }} value={dateTo} onChange={e => setDateTo(e.target.value)} placeholder="إلى تاريخ" />

          <button className="btn btn-primary" onClick={() => { setSelected(null); setView('add'); }}>
            <Plus size={14} /> أمر صيانة جديد
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>الرقم</th>
              <th>العميل</th>
              <th>الجهاز</th>
              <th>الشكوى</th>
              <th>الاستلام</th>
              <th>التسليم المتوقع</th>
              <th style={{ textAlign: 'center' }}>التكلفة</th>
              <th style={{ textAlign: 'center' }}>الحالة</th>
              <th style={{ textAlign: 'center' }}>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                  <Wrench size={32} style={{ marginBottom: 8, opacity: 0.4, display: 'block', margin: '0 auto 8px' }} />
                  لا توجد أوامر صيانة
                </td>
              </tr>
            )}
            {filtered.map(order => {
              const customer = buCustomers.find(c => c.id === order.customerId);
              return (
                <tr key={order.id} style={{ cursor: 'pointer' }} onClick={() => setViewOrder(order)}>
                  <td><span style={{ fontWeight: 700, color: '#8b5cf6' }}>{order.number}</span></td>
                  <td>{customer?.name || '-'}</td>
                  <td>{order.deviceType || '-'}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {order.complaint || '-'}
                  </td>
                  <td>{formatDate(order.receivedDate)}</td>
                  <td>{order.expectedDelivery ? formatDate(order.expectedDelivery) : '-'}</td>
                  <td style={{ textAlign: 'center', fontWeight: 600, color: '#10b981' }}>
                    {formatCurrency(order.repairCost)}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <StatusBadge status={order.status} />
                  </td>
                  <td style={{ textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                      {/* Quick next-status button */}
                      {(() => {
                        const idx = STATUS_ORDER.indexOf(order.status);
                        const next = STATUS_ORDER[idx + 1];
                        if (!next || order.status === 'cancelled') return null;
                        return (
                          <button
                            className="btn btn-ghost"
                            title={`تحديث إلى: ${REPAIR_ORDER_STATUSES[next]?.label}`}
                            style={{ fontSize: 11, padding: '4px 8px', color: '#10b981' }}
                            onClick={() => handleStatusChange(order, next)}
                          >
                            {REPAIR_ORDER_STATUSES[next]?.label} →
                          </button>
                        );
                      })()}
                      <button className="btn btn-ghost" title="عرض" style={{ padding: '4px 8px' }} onClick={() => setViewOrder(order)}>
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-ghost" title="تعديل" style={{ padding: '4px 8px' }} onClick={() => handleEdit(order)}>
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-ghost" title="طباعة" style={{ padding: '4px 8px' }} onClick={() => setPrintOrder(order)}>
                        <Printer size={14} />
                      </button>
                      <button className="btn btn-ghost" title="حذف" style={{ padding: '4px 8px', color: '#ef4444' }} onClick={() => handleDelete(order)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={6} style={{ fontWeight: 700 }}>
                  إجمالي ({filtered.length} أمر)
                </td>
                <td style={{ textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                  {formatCurrency(filtered.reduce((s, r) => s + (parseFloat(r.repairCost) || 0), 0))}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
