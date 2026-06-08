import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { useStore, ROLES } from '../store/useStore';
import { toast, Spinner } from '../components/UI';

const DEFAULT_COMPANY = {
  name: 'شركة النظام المالي',
  address: 'القاهرة، جمهورية مصر العربية',
  phone: '01000000000',
  email: 'info@company.eg',
  taxNumber: '',
  crNumber: '',
  invoiceNotes: 'شكراً لتعاملكم معنا',
  invoiceTerms: 'يُرجى الدفع خلال 30 يوماً من تاريخ الفاتورة',
};

export default function Settings() {
  const { user, userProfile } = useAuth();
  const store = useStore();
  const [activeTab, setActiveTab] = useState('company');
  const [companyForm, setCompanyForm] = useState(DEFAULT_COMPANY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'company'));
        if (snap.exists()) {
          setCompanyForm(f => ({ ...f, ...snap.data() }));
        }
      } catch (e) {
        console.error('[Settings] load error:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveCompany = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'company'), companyForm);
      toast.success('تم حفظ بيانات الشركة بنجاح');
    } catch (e) {
      console.error('[Settings] save error:', e);
      toast.error('فشل الحفظ: ' + (e?.message || 'خطأ غير معروف'));
    } finally {
      setSaving(false);
    }
  };

  const setF = (k, v) => setCompanyForm(f => ({ ...f, [k]: v }));

  const tabs = [
    { key: 'company',  label: '🏢 بيانات الشركة' },
    { key: 'invoice',  label: '📄 إعدادات الفواتير' },
    { key: 'system',   label: '⚙️ النظام' },
    { key: 'about',    label: 'ℹ️ عن النظام' },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 12 }}>
        <Spinner />
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>جاري تحميل الإعدادات...</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>الإعدادات</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>إعدادات النظام والشركة والفواتير</div>
      </div>

      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Company Data ── */}
      {activeTab === 'company' && (
        <div className="card">
          <div className="card-title">بيانات الشركة</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'اسم الشركة', key: 'name', placeholder: 'اسم الشركة' },
              { label: 'رقم الهاتف', key: 'phone', placeholder: '01000000000' },
              { label: 'البريد الإلكتروني', key: 'email', placeholder: 'info@company.eg' },
              { label: 'العنوان', key: 'address', placeholder: 'القاهرة، مصر' },
              { label: 'الرقم الضريبي', key: 'taxNumber', placeholder: 'الرقم الضريبي' },
              { label: 'رقم السجل التجاري', key: 'crNumber', placeholder: 'رقم السجل التجاري' },
            ].map(field => (
              <div key={field.key} className="form-group">
                <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{field.label}</label>
                <input className="form-control" value={companyForm[field.key] || ''} onChange={e => setF(field.key, e.target.value)} placeholder={field.placeholder} />
              </div>
            ))}

            {/* Currency – locked */}
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>العملة</label>
              <input className="form-control" value="الجنيه المصري (ج.م)" readOnly disabled style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
            </div>

            {/* Date format – locked */}
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>تنسيق التاريخ</label>
              <input className="form-control" value="يوم/شهر/سنة (DD/MM/YYYY)" readOnly disabled style={{ background: '#f8fafc', cursor: 'not-allowed' }} />
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleSaveCompany} disabled={saving}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ البيانات'}
            </button>
          </div>
        </div>
      )}

      {/* ── Invoice Settings ── */}
      {activeTab === 'invoice' && (
        <div className="card">
          <div className="card-title">إعدادات الفواتير</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, maxWidth: 600 }}>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>ملاحظات افتراضية للفاتورة</label>
              <textarea className="form-control" value={companyForm.invoiceNotes || ''} onChange={e => setF('invoiceNotes', e.target.value)} rows={3} placeholder="شكراً لتعاملكم معنا" />
            </div>
            <div className="form-group">
              <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>شروط الدفع الافتراضية</label>
              <textarea className="form-control" value={companyForm.invoiceTerms || ''} onChange={e => setF('invoiceTerms', e.target.value)} rows={3} placeholder="شروط الدفع" />
            </div>
          </div>
          <div style={{ marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleSaveCompany} disabled={saving}>
              {saving ? '⏳ جاري الحفظ...' : '💾 حفظ الإعدادات'}
            </button>
          </div>
        </div>
      )}

      {/* ── System Info ── */}
      {activeTab === 'system' && (
        <div>
          {/* Current User */}
          <div className="card mb-4">
            <div className="card-title">المستخدم الحالي</div>
            <div style={{ padding: 16, background: '#f8fafc', borderRadius: 8, fontSize: 13, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div><span style={{ color: 'var(--text-muted)' }}>البريد الإلكتروني: </span><strong style={{ direction: 'ltr', display: 'inline-block' }}>{user?.email || '-'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>الدور: </span><strong>{ROLES[userProfile?.role]?.label || userProfile?.role || 'مالك'}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>الحالة: </span><span className={`badge ${userProfile?.isActive ? 'badge-success' : 'badge-danger'}`}>{userProfile?.isActive ? 'نشط' : 'معطل'}</span></div>
              <div><span style={{ color: 'var(--text-muted)' }}>إجمالي العملاء: </span><strong>{store.customers.length}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>إجمالي الفواتير: </span><strong>{store.invoices.length}</strong></div>
              <div><span style={{ color: 'var(--text-muted)' }}>إجمالي الحسابات: </span><strong>{store.accounts.length}</strong></div>
            </div>
          </div>

          {/* Roles Table */}
          <div className="card">
            <div className="card-title">الأدوار والصلاحيات</div>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr><th>الدور</th><th>الاسم</th><th>الصلاحيات</th></tr>
                </thead>
                <tbody>
                  {Object.entries(ROLES).map(([key, role]) => (
                    <tr key={key}>
                      <td><span className="badge badge-primary">{key}</span></td>
                      <td className="font-bold">{role.label}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {role.permissions.map(p => (
                            <span key={p} className="badge badge-muted">{p === 'all' ? 'جميع الصلاحيات' : p}</span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── About ── */}
      {activeTab === 'about' && (
        <div className="card">
          <div style={{ textAlign: 'center', padding: 40 }}>
            <img src="/brand/logo.png" alt="Logo" style={{ width: 100, height: 100, objectFit: 'contain', marginBottom: 20, borderRadius: 12, border: '2px solid var(--border)' }} />
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--primary)', marginBottom: 8 }}>نظام RoboFab المالي</div>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>الإصدار 1.0 | نظام مالي متكامل باللغة العربية للشركات المصرية</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, maxWidth: 600, margin: '0 auto' }}>
              {[
                { icon: '📄', label: 'الفواتير والعروض' },
                { icon: '📊', label: 'التقارير المالية' },
                { icon: '🏦', label: 'الحسابات والتحويلات' },
                { icon: '📦', label: 'المخزون والمستودعات' },
                { icon: '👥', label: 'العملاء والموردون' },
                { icon: '🏭', label: 'أوامر الإنتاج' },
                { icon: '💼', label: 'الموظفون والرواتب' },
                { icon: '🏢', label: 'الأصول الثابتة' },
                { icon: '🛡️', label: 'لوحة التحكم الإدارية' },
              ].map(f => (
                <div key={f.label} className="card" style={{ padding: 16, textAlign: 'center' }}>
                  <div style={{ fontSize: 28, marginBottom: 6 }}>{f.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{f.label}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 30, color: 'var(--text-muted)', fontSize: 12 }}>
              © {new Date().getFullYear()} — جميع الحقوق محفوظة | نظام RoboFab المالي
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
