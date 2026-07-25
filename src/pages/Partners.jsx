import { useState } from 'react';
import { useStore, PARTNER_TRANSACTION_TYPES, PARTNER_EXPENSE_CATEGORIES } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, PageHeader, Field, IconBtn, FilterBar, toast } from '../components/UI';
import { confirm } from '../components/UI';

const PAYMENT_METHODS = ['نقدي', 'تحويل بنكي', 'محفظة إلكترونية', 'شيك'];

/* ── Transaction form ── */
function TransactionForm({ partner, currentBalance, onSave, onClose }) {
  const [form, setForm] = useState({
    type: 'deposit', amount: '', date: today(),
    description: '', category: '', paymentMethod: 'نقدي', notes: '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const previewBalance = () => {
    const amt = parseFloat(form.amount) || 0;
    const t = form.type;
    if (t === 'deposit')    return currentBalance + amt;
    if (t === 'withdrawal') return currentBalance - amt;
    if (t === 'expense')    return currentBalance - amt;
    if (t === 'settlement') return amt;
    return currentBalance;
  };

  const handleSave = () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error('أدخل مبلغاً صحيحاً'); return; }
    onSave({ ...form, partnerId: partner.id });
  };

  return (
    <div>
      <div className="form-grid">
        <Field label="نوع العملية" required span={2}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(PARTNER_TRANSACTION_TYPES).map(([key, { label, color }]) => (
              <button
                key={key}
                onClick={() => set('type', key)}
                className={`btn btn-sm ${form.type === key ? `btn-${color}` : 'btn-ghost'}`}
                style={{ minWidth: 110 }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="المبلغ (ج.م)" required>
          <input type="number" className="form-control" value={form.amount} onChange={e => set('amount', e.target.value)} min="0.01" step="0.01" placeholder="0.00" dir="ltr" />
        </Field>
        <Field label="التاريخ" required>
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>

        {form.type === 'expense' && (
          <Field label="فئة المصروف">
            <select className="form-control" value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">اختر الفئة</option>
              {PARTNER_EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
        )}

        <Field label="طريقة الدفع">
          <select className="form-control" value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
            {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </Field>

        <Field label="البيان" span={2}>
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف العملية" />
        </Field>
        <Field label="ملاحظات" span={2}>
          <input className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="ملاحظات إضافية" />
        </Field>
      </div>

      {/* Balance Preview */}
      <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, marginTop: 8, border: '1px solid var(--border)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 10 }}>معاينة الرصيد</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>الرصيد الحالي</span>
          <span className="font-bold">{formatCurrency(currentBalance)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
          <span>العملية ({PARTNER_TRANSACTION_TYPES[form.type]?.label})</span>
          <span className={`font-bold ${PARTNER_TRANSACTION_TYPES[form.type]?.sign === 1 ? 'amount-positive' : 'amount-negative'}`}>
            {PARTNER_TRANSACTION_TYPES[form.type]?.sign === 1 ? '+' : form.type === 'settlement' ? '=' : '-'} {formatCurrency(parseFloat(form.amount) || 0)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800, borderTop: '1px solid var(--border)', paddingTop: 8, color: 'var(--primary)' }}>
          <span>الرصيد بعد العملية</span>
          <span>{formatCurrency(previewBalance())}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleSave}>💾 تسجيل العملية</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

/* ── Partner Detail View ── */
function PartnerDetail({ partner, transactions, onBack, onAddTxn, onCancelTxn }) {
  const [typeFilter, setTypeFilter] = useState('');
  const balance = transactions
    .filter(t => t.partnerId === partner.id && t.status !== 'cancelled')
    .reduce((bal, t) => {
      if (t.type === 'deposit')    return bal + parseFloat(t.amount || 0);
      if (t.type === 'withdrawal') return bal - parseFloat(t.amount || 0);
      if (t.type === 'expense')    return bal - parseFloat(t.amount || 0);
      if (t.type === 'settlement') return parseFloat(t.amount || 0);
      return bal;
    }, 0);

  const allTxns = transactions
    .filter(t => t.partnerId === partner.id)
    .filter(t => !typeFilter || t.type === typeFilter)
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const deposits    = transactions.filter(t => t.partnerId === partner.id && t.type === 'deposit'    && t.status !== 'cancelled').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const withdrawals = transactions.filter(t => t.partnerId === partner.id && t.type === 'withdrawal' && t.status !== 'cancelled').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
  const expenses    = transactions.filter(t => t.partnerId === partner.id && t.type === 'expense'    && t.status !== 'cancelled').reduce((s, t) => s + parseFloat(t.amount || 0), 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={onBack}>← رجوع</button>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--text)' }}>{partner.name}</h1>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <div className="card" style={{ padding: 16, borderRight: '4px solid var(--primary)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>الرصيد الحالي</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: balance >= 0 ? 'var(--success-dark)' : 'var(--danger-dark)', marginTop: 4 }}>{formatCurrency(balance)}</div>
        </div>
        <div className="card" style={{ padding: 16, borderRight: '4px solid var(--success)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي الإضافات</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--success-dark)', marginTop: 4 }}>{formatCurrency(deposits)}</div>
        </div>
        <div className="card" style={{ padding: 16, borderRight: '4px solid var(--danger)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي السحوبات</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--danger-dark)', marginTop: 4 }}>{formatCurrency(withdrawals)}</div>
        </div>
        <div className="card" style={{ padding: 16, borderRight: '4px solid var(--warning)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>إجمالي المصروفات</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--warning-dark)', marginTop: 4 }}>{formatCurrency(expenses)}</div>
        </div>
      </div>

      {/* Actions + Filter */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn btn-sm ${!typeFilter ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTypeFilter('')}>الكل</button>
          {Object.entries(PARTNER_TRANSACTION_TYPES).map(([key, { label }]) => (
            <button key={key} className={`btn btn-sm ${typeFilter === key ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTypeFilter(key)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={onAddTxn}>+ تسجيل عملية</button>
      </div>

      {/* Transactions Table */}
      <div className="card">
        {allTxns.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>لا توجد معاملات</div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr><th>التاريخ</th><th>النوع</th><th>المبلغ</th><th>الفئة</th><th>البيان</th><th>طريقة الدفع</th><th>الحالة</th><th>الإجراءات</th></tr>
              </thead>
              <tbody>
                {allTxns.map(t => {
                  const info = PARTNER_TRANSACTION_TYPES[t.type] || { label: t.type, color: 'muted' };
                  return (
                    <tr key={t.id} style={{ opacity: t.status === 'cancelled' ? 0.5 : 1 }}>
                      <td>{formatDate(t.date)}</td>
                      <td><span className={`badge badge-${info.color}`}>{info.label}</span></td>
                      <td className={`number-cell font-bold ${info.sign >= 0 ? 'amount-positive' : 'amount-negative'}`}>{formatCurrency(t.amount)}</td>
                      <td className="text-muted">{t.category || '-'}</td>
                      <td className="text-muted">{t.description || '-'}</td>
                      <td className="text-muted">{t.paymentMethod || '-'}</td>
                      <td>
                        {t.status === 'cancelled'
                          ? <span className="badge badge-danger">ملغي</span>
                          : <span className="badge badge-success">نشط</span>}
                      </td>
                      <td>
                        {t.status !== 'cancelled' && (
                          <IconBtn onClick={() => onCancelTxn(t)} title="إلغاء" color="ghost">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14"><path d="M18 6L6 18M6 6l12 12"/></svg>
                          </IconBtn>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Partners Page ── */
export default function Partners() {
  const { partners, partnerTransactions, addPartnerTransaction, cancelPartnerTransaction, getPartnerBalance } = useStore();
  const [view, setView] = useState('list'); // 'list' | 'detail'
  const [selectedPartner, setSelectedPartner] = useState(null);
  const [modal, setModal] = useState(false);

  const handleSelectPartner = (p) => {
    setSelectedPartner(p);
    setView('detail');
  };

  const handleAddTxn = (form) => {
    addPartnerTransaction(form);
    toast.success('تم تسجيل العملية بنجاح');
    setModal(false);
  };

  const handleCancelTxn = async (t) => {
    const ok = await confirm('إلغاء العملية', 'هل أنت متأكد من إلغاء هذه العملية؟ سيتم عكس تأثيرها على الرصيد.');
    if (ok) { cancelPartnerTransaction(t.id); toast.success('تم إلغاء العملية'); }
  };

  const currentBalance = selectedPartner ? (getPartnerBalance?.(selectedPartner.id) ?? 0) : 0;

  if (view === 'detail' && selectedPartner) {
    return (
      <>
        <PartnerDetail
          partner={selectedPartner}
          transactions={partnerTransactions}
          onBack={() => setView('list')}
          onAddTxn={() => setModal(true)}
          onCancelTxn={handleCancelTxn}
        />
        <Modal open={modal} onClose={() => setModal(false)} title={`تسجيل عملية — ${selectedPartner.name}`} size="lg">
          <TransactionForm
            partner={selectedPartner}
            currentBalance={currentBalance}
            onSave={handleAddTxn}
            onClose={() => setModal(false)}
          />
        </Modal>
      </>
    );
  }

  // Partners list view
  return (
    <div>
      <PageHeader
        title="الشركاء"
        subtitle={`${partners.length} شركاء`}
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {partners.length === 0 ? (
          <div className="card" style={{ gridColumn: '1/-1', padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
            جاري تحميل بيانات الشركاء...
          </div>
        ) : partners.map(p => {
          const balance = getPartnerBalance?.(p.id) ?? 0;
          const deposits    = partnerTransactions.filter(t => t.partnerId === p.id && t.type === 'deposit'    && t.status !== 'cancelled').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
          const withdrawals = partnerTransactions.filter(t => t.partnerId === p.id && t.type === 'withdrawal' && t.status !== 'cancelled').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
          const expenses    = partnerTransactions.filter(t => t.partnerId === p.id && t.type === 'expense'    && t.status !== 'cancelled').reduce((s, t) => s + parseFloat(t.amount || 0), 0);
          return (
            <div
              key={p.id}
              className="card"
              style={{ padding: 20, cursor: 'pointer', transition: 'box-shadow 0.15s', borderRight: '4px solid var(--primary)' }}
              onClick={() => handleSelectPartner(p)}
              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(16,185,129,0.15)'}
              onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)' }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {partnerTransactions.filter(t => t.partnerId === p.id && t.status !== 'cancelled').length} معاملة
                  </div>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: balance >= 0 ? 'var(--success-dark)' : 'var(--danger-dark)' }}>
                  {formatCurrency(balance)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, fontSize: 11, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(34,197,94,0.1)', color: '#16a34a', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                  إضافات: {formatCurrency(deposits)}
                </span>
                <span style={{ background: 'rgba(239,68,68,0.1)', color: '#dc2626', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                  سحوبات: {formatCurrency(withdrawals)}
                </span>
                <span style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', padding: '2px 8px', borderRadius: 8, fontWeight: 600 }}>
                  مصروفات: {formatCurrency(expenses)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
