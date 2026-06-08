import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { formatCurrency, formatDate, today } from '../utils/helpers';
import { Modal, EmptyState, SearchInput, PageHeader, Field, FilterBar, IconBtn, toast } from '../components/UI';
import { confirm } from '../components/UI';

function EmployeeForm({ initial = {}, onSave, onClose }) {
  const [form, setForm] = useState({ name: '', position: '', phone: '', salary: 0, notes: '', ...initial });
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'الاسم مطلوب';
    setErrors(e); return !Object.keys(e).length;
  };
  return (
    <div>
      <div className="form-grid">
        <Field label="اسم الموظف" required error={errors.name}>
          <input className={`form-control ${errors.name ? 'error' : ''}`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="الاسم الكامل" />
        </Field>
        <Field label="المسمى الوظيفي">
          <input className="form-control" value={form.position} onChange={e => set('position', e.target.value)} placeholder="مثال: محاسب، مدير مبيعات" />
        </Field>
        <Field label="رقم الهاتف">
          <input className="form-control" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="05xxxxxxxx" />
        </Field>
        <Field label="الراتب الشهري">
          <input type="number" className="form-control" value={form.salary} onChange={e => set('salary', e.target.value)} min="0" step="0.01" />
        </Field>
        <Field label="ملاحظات" span={2}>
          <textarea className="form-control" value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => { if (validate()) onSave(form); }}>💾 حفظ</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

function TransactionForm({ employee, accounts, onSave, onClose }) {
  const [form, setForm] = useState({ type: 'advance', amount: '', date: today(), accountId: accounts[0]?.id || '', description: '', notes: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const txnTypes = [
    { value: 'advance', label: 'سلفة' },
    { value: 'deduction', label: 'خصم' },
    { value: 'salary', label: 'صرف راتب' },
    { value: 'custody', label: 'عهدة' },
    { value: 'other', label: 'أخرى' },
  ];
  return (
    <div>
      <div className="form-grid">
        <Field label="نوع المعاملة">
          <select className="form-control" value={form.type} onChange={e => set('type', e.target.value)}>
            {txnTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="المبلغ">
          <input type="number" className="form-control" value={form.amount} onChange={e => set('amount', e.target.value)} min="0.01" step="0.01" />
        </Field>
        <Field label="التاريخ">
          <input type="date" className="form-control" value={form.date} onChange={e => set('date', e.target.value)} />
        </Field>
        <Field label="الحساب">
          <select className="form-control" value={form.accountId} onChange={e => set('accountId', e.target.value)}>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </Field>
        <Field label="الوصف" span={2}>
          <input className="form-control" value={form.description} onChange={e => set('description', e.target.value)} placeholder="وصف المعاملة" />
        </Field>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={() => onSave(form)}>✓ تسجيل المعاملة</button>
        <button className="btn btn-ghost" onClick={onClose}>إلغاء</button>
      </div>
    </div>
  );
}

export default function Employees() {
  const { employees, addEmployee, updateEmployee, deleteEmployee, payments, accounts, addPayment } = useStore();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [selected, setSelected] = useState(null);

  const filtered = employees.filter(e => !search || e.name.includes(search) || e.position?.includes(search));

  const openAdd = () => { setSelected(null); setModal('add'); };
  const openEdit = (e) => { setSelected(e); setModal('edit'); };
  const openView = (e) => { setSelected(e); setModal('view'); };
  const openTxn = (e) => { setSelected(e); setModal('txn'); };

  const handleSave = (form) => {
    if (modal === 'add') { addEmployee(form); toast.success('تم إضافة الموظف'); }
    else { updateEmployee(selected.id, form); toast.success('تم التحديث'); }
    setModal(null);
  };

  const handleTxn = (form) => {
    const amt = parseFloat(form.amount) || 0;
    addPayment({ ...form, employeeId: selected.id, description: `${getTypLabel(form.type)} - ${selected.name}` });
    const updates = {};
    if (form.type === 'advance') updates.totalAdvances = (selected.totalAdvances || 0) + amt;
    if (form.type === 'deduction') updates.totalDeductions = (selected.totalDeductions || 0) + amt;
    updateEmployee(selected.id, updates);
    toast.success('تم تسجيل المعاملة');
    setModal(null);
  };

  const getTypLabel = (t) => ({ advance: 'سلفة', deduction: 'خصم', salary: 'راتب', custody: 'عهدة', other: 'أخرى' })[t] || t;
  const getEmpPayments = (id) => payments.filter(p => p.employeeId === id);
  const handleDelete = async (e) => {
    const ok = await confirm('حذف الموظف', `هل أنت متأكد من حذف "${e.name}"؟`);
    if (ok) { deleteEmployee(e.id); toast.success('تم الحذف'); }
  };

  return (
    <div>
      <PageHeader
        title="إدارة الموظفين"
        subtitle={`${employees.length} موظف`}
        actions={<button className="btn btn-primary" onClick={openAdd}>+ موظف جديد</button>}
      />
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} placeholder="بحث بالاسم أو المسمى الوظيفي..." />
      </FilterBar>

      <div className="card">
        {filtered.length === 0 ? (
          <EmptyState title="لا يوجد موظفون" message="ابدأ بإضافة بيانات الموظفين" action={<button className="btn btn-primary" onClick={openAdd}>+ إضافة موظف</button>} />
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>الموظف</th><th>المسمى الوظيفي</th><th>الهاتف</th>
                  <th>الراتب</th><th>السلف</th><th>الخصومات</th><th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <tr key={emp.id}>
                    <td className="font-bold" style={{ cursor: 'pointer', color: 'var(--primary-light)' }} onClick={() => openView(emp)}>{emp.name}</td>
                    <td className="text-muted">{emp.position || '-'}</td>
                    <td>{emp.phone || '-'}</td>
                    <td className="number-cell">{formatCurrency(emp.salary || 0)}</td>
                    <td className="number-cell amount-negative">{formatCurrency(emp.totalAdvances || 0)}</td>
                    <td className="number-cell amount-negative">{formatCurrency(emp.totalDeductions || 0)}</td>
                    <td>
                      <div className="table-actions">
                        <IconBtn onClick={() => openTxn(emp)} title="معاملة مالية" color="ghost">💳</IconBtn>
                        <IconBtn onClick={() => openEdit(emp)} title="تعديل" color="ghost">✏️</IconBtn>
                        <IconBtn onClick={() => handleDelete(emp)} title="حذف" color="ghost">🗑️</IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal open={modal === 'add' || modal === 'edit'} onClose={() => setModal(null)} title={modal === 'add' ? 'إضافة موظف جديد' : 'تعديل بيانات الموظف'}>
        <EmployeeForm initial={selected || {}} onSave={handleSave} onClose={() => setModal(null)} />
      </Modal>

      <Modal open={modal === 'txn'} onClose={() => setModal(null)} title={`معاملة مالية: ${selected?.name}`}>
        {selected && <TransactionForm employee={selected} accounts={accounts} onSave={handleTxn} onClose={() => setModal(null)} />}
      </Modal>

      <Modal open={modal === 'view'} onClose={() => setModal(null)} title={`ملف الموظف: ${selected?.name}`} size="lg"
        footer={
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={() => { setModal('txn'); }}>+ معاملة مالية</button>
            <button className="btn btn-ghost" onClick={() => openEdit(selected)}>✏️ تعديل</button>
            <button className="btn btn-ghost" onClick={() => setModal(null)}>إغلاق</button>
          </div>
        }
      >
        {selected && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">الراتب</div><div className="font-heavy" style={{ fontSize: 16 }}>{formatCurrency(selected.salary || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">السلف</div><div className="font-heavy amount-negative" style={{ fontSize: 16 }}>{formatCurrency(selected.totalAdvances || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">الخصومات</div><div className="font-heavy amount-negative" style={{ fontSize: 16 }}>{formatCurrency(selected.totalDeductions || 0)}</div></div>
              <div className="card" style={{ padding: 14 }}><div className="text-sm text-muted">الرصيد</div><div className="font-heavy amount-positive" style={{ fontSize: 16 }}>{formatCurrency(selected.balance || 0)}</div></div>
            </div>
            <div className="card mb-4" style={{ padding: 14, fontSize: 13 }}>
              <div><span className="text-muted">المسمى: </span><strong>{selected.position || '-'}</strong></div>
              <div><span className="text-muted">الهاتف: </span><strong>{selected.phone || '-'}</strong></div>
              {selected.notes && <div><span className="text-muted">ملاحظات: </span>{selected.notes}</div>}
            </div>
            <div className="card-title" style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>سجل المعاملات المالية</div>
            <div className="table-container">
              <table className="table">
                <thead><tr><th>الرقم</th><th>التاريخ</th><th>المبلغ</th><th>الوصف</th></tr></thead>
                <tbody>
                  {getEmpPayments(selected.id).length === 0 ? (
                    <tr><td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)' }}>لا توجد معاملات مسجلة</td></tr>
                  ) : getEmpPayments(selected.id).map(p => (
                    <tr key={p.id}>
                      <td className="font-bold">{p.number}</td>
                      <td>{formatDate(p.date)}</td>
                      <td className="number-cell amount-negative">{formatCurrency(p.amount)}</td>
                      <td>{p.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
