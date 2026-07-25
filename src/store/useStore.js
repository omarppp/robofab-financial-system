/**
 * Zustand store – NO localStorage persistence.
 * Data lives in Firestore. loadFromFirestore() hydrates the store on login.
 * Every mutation also writes back to Firestore in the background.
 *
 * Firestore collection mapping:
 *   accounts          → financialAccounts
 *   transfers         → accountTransfers
 *   items             → inventoryItems
 *   warehouseTransfers→ warehouseTransfers
 *   all others        → same name as Zustand key
 *
 * Business Unit Architecture:
 *   currentBusinessUnit is persisted in localStorage.
 *   All new records get businessUnitId = currentBusinessUnit.
 *   Old records without businessUnitId default to 'main'.
 *   Computed methods filter by (x.businessUnitId || 'main') === currentBusinessUnit.
 */
import { create } from 'zustand';
import { saveDoc, removeDoc, loadCollection } from '../lib/firestoreService';

// ---- Exported constants ----

export const ACCOUNT_TYPES = {
  cash:       'خزنة نقدية',
  bank:       'حساب بنكي',
  income:     'دخل / إيرادات',
  expense:    'مصروفات تشغيل',
  transport:  'مصروفات نقل',
  capital:    'رأس المال',
  custody:    'عهدة',
  receivable: 'ذمم مدينة',
  payable:    'ذمم دائنة',
  other:      'أخرى',
};

export const EXPENSE_CATEGORIES = [
  'خامات ومواد',
  'مصاريف تشغيل',
  'نقل وشحن',
  'صيانة',
  'رواتب وأجور',
  'عهدة',
  'كهرباء ومرافق',
  'تسويق وإعلان',
  'مصاريف إدارية',
  'مشروع عميل',
  'أخرى',
];

export const INVOICE_STATUSES = {
  draft:     { label: 'مسودة',          color: 'muted'   },
  pending:   { label: 'معلقة',          color: 'warning' },
  partial:   { label: 'مدفوعة جزئياً', color: 'info'    },
  paid:      { label: 'مدفوعة',         color: 'success' },
  overdue:   { label: 'متأخرة',         color: 'danger'  },
  cancelled: { label: 'ملغاة',          color: 'danger'  },
};

export const ORDER_STATUSES = {
  new:        { label: 'جديد',         color: 'info'    },
  processing: { label: 'قيد التنفيذ', color: 'warning' },
  completed:  { label: 'مكتمل',        color: 'success' },
  cancelled:  { label: 'ملغي',         color: 'danger'  },
};

export const PRODUCTION_STATUSES = {
  new:        { label: 'جديد',         color: 'info'    },
  inprogress: { label: 'قيد الإنتاج', color: 'warning' },
  completed:  { label: 'مكتمل',        color: 'success' },
  cancelled:  { label: 'ملغي',         color: 'danger'  },
};

export const QUOTATION_STATUSES = {
  open:     { label: 'مفتوحة',  color: 'info'    },
  accepted: { label: 'مقبولة', color: 'success' },
  rejected: { label: 'مرفوضة', color: 'danger'  },
  expired:  { label: 'منتهية', color: 'muted'   },
};

export const REPAIR_ORDER_STATUSES = {
  received:         { label: 'تم الاستلام',             color: 'muted'   },
  inspecting:       { label: 'قيد الفحص',               color: 'info'    },
  'pending-approval': { label: 'بانتظار موافقة العميل', color: 'warning' },
  repairing:        { label: 'قيد الإصلاح',             color: 'purple'  },
  ready:            { label: 'جاهز للتسليم',            color: 'success' },
  delivered:        { label: 'تم التسليم',               color: 'muted'   },
  cancelled:        { label: 'ملغي',                     color: 'danger'  },
};

export const PARTNER_TRANSACTION_TYPES = {
  deposit:    { label: 'إضافة مبلغ',   color: 'success', sign: 1  },
  withdrawal: { label: 'سحب مبلغ',     color: 'danger',  sign: -1 },
  expense:    { label: 'تسجيل مصروف', color: 'warning', sign: -1 },
  settlement: { label: 'تسوية رصيد',  color: 'info',    sign: 0  },
};

export const PARTNER_EXPENSE_CATEGORIES = [
  'انتقالات', 'مشتريات', 'أدوات', 'صيانة', 'شحن',
  'تسويق', 'مصروف شخصي', 'مصروف إداري', 'أخرى',
];

export const BUSINESS_UNITS = {
  main:        { label: 'النشاط الرئيسي',  short: 'الرئيسي',  color: '#10b981' },
  chandeliers: { label: 'بيع النجف',        short: 'النجف',    color: '#f59e0b' },
  holders:     { label: 'الهولدرات',         short: 'هولدرات', color: '#3b82f6' },
  joystick:    { label: 'سيستم الجويستيك', short: 'جويستيك', color: '#8b5cf6' },
};

// Per-business invoice prefixes
const INVOICE_PREFIXES = {
  main:        { sale: 'INV',    purchase: 'PUR',    expense: 'EXP'    },
  chandeliers: { sale: 'CH-INV', purchase: 'CH-PUR', expense: 'CH-EXP' },
  holders:     { sale: 'HD-INV', purchase: 'HD-PUR', expense: 'HD-EXP' },
  joystick:    { sale: 'JS-INV', purchase: 'JS-INV', expense: 'JS-EXP' },
};

// Fixed partner records (auto-initialized on first load)
const DEFAULT_PARTNERS = [
  { id: 'partner-abdelrahman', name: 'عبدالرحمن محمد'  },
  { id: 'partner-omar-nady',   name: 'عمر نادي'         },
  { id: 'partner-omar-hamed',  name: 'عمر حامد'         },
  { id: 'partner-mahmoud',     name: 'محمود عبدالرازق' },
];

export const CURRENCY = { code: 'EGP', symbol: 'ج.م', name: 'الجنيه المصري' };

export const PAYMENT_METHODS = {
  cash:     'نقدي',
  bank:     'تحويل بنكي',
  instapay: 'InstaPay',
  vodafone: 'فودافون كاش',
  etisalat: 'اتصالات كاش',
  orange:   'أورنج كاش',
  wepay:    'WE Pay',
  fawry:    'فوري',
  card:     'بطاقة بنكية',
  check:    'شيك',
  custody:  'عهدة',
  other:    'أخرى',
};

export const EGYPTIAN_BANKS = [
  'البنك الأهلي المصري', 'بنك مصر', 'بنك القاهرة',
  'البنك التجاري الدولي CIB', 'بنك QNB الأهلي', 'بنك الإسكندرية',
  'البنك العربي الإفريقي الدولي', 'بنك أبوظبي الأول مصر',
  'بنك الإمارات دبي الوطني مصر', 'بنك فيصل الإسلامي',
  'المصرف المتحد', 'HSBC مصر', 'بنك كريدي أجريكول مصر',
  'بنك قناة السويس', 'بنك التعمير والإسكان', 'بنك البركة',
  'بنك أبوظبي التجاري مصر', 'بنك الكويت الوطني مصر',
  'بنك SAIB', 'بنك MIDBANK', 'بنك أبوظبي الإسلامي مصر', 'أخرى',
];

export const ROLES = {
  owner:     { label: 'مالك النظام',   permissions: ['all'] },
  manager:   { label: 'مدير',          permissions: ['all'] },
  accountant:{ label: 'محاسب',         permissions: ['invoices','accounts','payments','reports','customers','suppliers'] },
  sales:     { label: 'موظف مبيعات',  permissions: ['invoices','quotations','customers'] },
  warehouse: { label: 'موظف مستودع',  permissions: ['inventory','warehouses','production'] },
  viewer:    { label: 'مشاهد',         permissions: ['reports','dashboard'] },
};

// ---- Internal helpers ----

const genId  = () => Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
const genNum = (prefix, list) => {
  const nums = list.map(i => parseInt(i.number?.replace(/\D/g, '') || '0')).filter(n => !isNaN(n));
  const next = nums.length ? Math.max(...nums) + 1 : 1001;
  return `${prefix}${next}`;
};
const now = () => new Date().toISOString().split('T')[0];

// businessUnitId filter helper
const buOf = x => x.businessUnitId || 'main';

// ---- Firestore collection name mapping ----
const FS = {
  accounts:           'financialAccounts',
  transfers:          'accountTransfers',
  items:              'inventoryItems',
  warehouseTransfers: 'warehouseTransfers',
  customers:          'customers',
  suppliers:          'suppliers',
  invoices:           'invoices',
  quotations:         'quotations',
  payments:           'payments',
  receipts:           'receipts',
  warehouses:         'warehouses',
  employees:          'employees',
  productionOrders:   'productionOrders',
  assets:             'assets',
  salesOrders:        'salesOrders',
  purchaseOrders:     'purchaseOrders',
  partners:           'partners',
  partnerTransactions:'partnerTransactions',
  repairOrders:       'repairOrders',
};

const fsave   = (key, id, data) => saveDoc(FS[key],  id, data).catch(console.error);
const fremove = (key, id)       => removeDoc(FS[key], id).catch(console.error);

// ---- Store ----

export const useStore = create((set, get) => ({
  // ---- Loading / error state ----
  dataLoaded:  false,
  loadingData: false,
  dataError:   null,

  // ---- Business unit (persisted in localStorage) ----
  currentBusinessUnit: localStorage.getItem('bu') || 'main',
  setBusinessUnit: (unit) => {
    set({ currentBusinessUnit: unit });
    localStorage.setItem('bu', unit);
  },

  // ---- Collections ----
  accounts:           [],
  customers:          [],
  suppliers:          [],
  items:              [],
  warehouses:         [],
  employees:          [],
  invoices:           [],
  quotations:         [],
  payments:           [],
  receipts:           [],
  transfers:          [],
  warehouseTransfers: [],
  productionOrders:   [],
  assets:             [],
  salesOrders:        [],
  purchaseOrders:     [],
  partners:           [],
  partnerTransactions:[],
  repairOrders:       [],

  // ---- UI state ----
  sidebarCollapsed: false,
  toggleSidebar: () => set(s => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  // ---- Firestore hydration ----
  loadFromFirestore: async () => {
    if (get().loadingData) return;
    const DEV = import.meta.env.DEV;
    set({ loadingData: true, dataError: null });

    const loadLog = async (storeKey, colName) => {
      if (DEV) console.log(`[Store] Loading: ${colName}`);
      const data = await loadCollection(colName);
      if (DEV) console.log(`[Store] ✓ ${colName} — ${data.length} docs`);
      return data;
    };

    try {
      if (DEV) console.log('[Store] Starting Firestore hydration…');
      const [
        accounts, customers, suppliers, items, warehouses, employees,
        invoices, quotations, payments, receipts, transfers,
        warehouseTransfers, productionOrders, assets, salesOrders, purchaseOrders,
        partners, partnerTransactions, repairOrders,
      ] = await Promise.all([
        loadLog('accounts',           FS.accounts),
        loadLog('customers',          FS.customers),
        loadLog('suppliers',          FS.suppliers),
        loadLog('items',              FS.items),
        loadLog('warehouses',         FS.warehouses),
        loadLog('employees',          FS.employees),
        loadLog('invoices',           FS.invoices),
        loadLog('quotations',         FS.quotations),
        loadLog('payments',           FS.payments),
        loadLog('receipts',           FS.receipts),
        loadLog('transfers',          FS.transfers),
        loadLog('warehouseTransfers', FS.warehouseTransfers),
        loadLog('productionOrders',   FS.productionOrders),
        loadLog('assets',             FS.assets),
        loadLog('salesOrders',        FS.salesOrders),
        loadLog('purchaseOrders',     FS.purchaseOrders),
        loadLog('partners',           FS.partners),
        loadLog('partnerTransactions',FS.partnerTransactions),
        loadLog('repairOrders',       FS.repairOrders),
      ]);

      if (DEV) console.log('[Store] ✓ All collections loaded');

      // Auto-initialize 4 default partners if none exist
      let loadedPartners = partners;
      if (partners.length === 0) {
        const ts = now();
        loadedPartners = DEFAULT_PARTNERS.map(p => ({ ...p, createdAt: ts, notes: '' }));
        loadedPartners.forEach(p => saveDoc(FS.partners, p.id, p).catch(console.error));
        if (DEV) console.log('[Store] Partners auto-initialized');
      }

      set({
        accounts, customers, suppliers, items, warehouses, employees,
        invoices, quotations, payments, receipts, transfers,
        warehouseTransfers, productionOrders, assets, salesOrders, purchaseOrders,
        partners: loadedPartners, partnerTransactions, repairOrders,
        dataLoaded: true, loadingData: false, dataError: null,
      });
    } catch (err) {
      console.error('[Store] loadFromFirestore failed:', err);
      const code = err?.code || '';
      let dataError;
      if (code === 'permission-denied') {
        dataError = 'ليس لديك صلاحية للوصول إلى هذه البيانات. تحقق من إعدادات Firestore Security Rules.';
      } else if (code === 'unavailable' || err?.message?.includes('network')) {
        dataError = 'تعذّر الاتصال بقاعدة البيانات. تحقق من الاتصال بالإنترنت.';
      } else {
        dataError = `حدث خطأ أثناء تحميل البيانات. ${code ? `(${code})` : ''}`;
      }
      set({ loadingData: false, dataLoaded: true, dataError });
    }
  },

  retryLoad: () => set({ dataLoaded: false, dataError: null, loadingData: false }),

  clearStore: () => set({
    accounts: [], customers: [], suppliers: [], items: [], warehouses: [],
    employees: [], invoices: [], quotations: [], payments: [], receipts: [],
    transfers: [], warehouseTransfers: [], productionOrders: [], assets: [],
    salesOrders: [], purchaseOrders: [],
    partners: [], partnerTransactions: [], repairOrders: [],
    dataLoaded: false, loadingData: false, dataError: null,
  }),

  // ---- ACCOUNTS ----
  addAccount: (data) => {
    const bu = get().currentBusinessUnit;
    const account = { ...data, id: genId(), balance: parseFloat(data.balance) || 0, createdAt: now(), active: true, businessUnitId: bu };
    set(s => ({ accounts: [...s.accounts, account] }));
    fsave('accounts', account.id, account);
    return account;
  },
  updateAccount: (id, data) => {
    set(s => ({ accounts: s.accounts.map(a => a.id === id ? { ...a, ...data } : a) }));
    const updated = get().accounts.find(a => a.id === id);
    if (updated) fsave('accounts', id, updated);
  },
  deleteAccount: (id) => {
    set(s => ({ accounts: s.accounts.filter(a => a.id !== id) }));
    fremove('accounts', id);
  },
  adjustAccountBalance: (id, amount) => {
    set(s => ({
      accounts: s.accounts.map(a => a.id === id ? { ...a, balance: (a.balance || 0) + amount } : a),
    }));
    const updated = get().accounts.find(a => a.id === id);
    if (updated) fsave('accounts', id, updated);
  },

  // ---- TRANSFERS ----
  addTransfer: (data) => {
    const transfer = {
      ...data, id: genId(),
      number: genNum('TRF', get().transfers),
      amount: parseFloat(data.amount),
      createdAt: now(), date: data.date || now(),
    };
    set(s => ({
      transfers: [...s.transfers, transfer],
      accounts: s.accounts.map(a => {
        if (a.id === data.fromAccountId) return { ...a, balance: (a.balance || 0) - parseFloat(data.amount) };
        if (a.id === data.toAccountId)   return { ...a, balance: (a.balance || 0) + parseFloat(data.amount) };
        return a;
      }),
    }));
    fsave('transfers', transfer.id, transfer);
    const from = get().accounts.find(a => a.id === data.fromAccountId);
    const to   = get().accounts.find(a => a.id === data.toAccountId);
    if (from) fsave('accounts', from.id, from);
    if (to)   fsave('accounts', to.id, to);
    return transfer;
  },

  // ---- CUSTOMERS ----
  addCustomer: (data) => {
    const bu = get().currentBusinessUnit;
    const customer = { ...data, id: genId(), balance: 0, totalInvoices: 0, totalPaid: 0, active: true, createdAt: now(), businessUnitId: bu };
    set(s => ({ customers: [...s.customers, customer] }));
    fsave('customers', customer.id, customer);
    return customer;
  },
  updateCustomer: (id, data) => {
    set(s => ({ customers: s.customers.map(c => c.id === id ? { ...c, ...data } : c) }));
    const updated = get().customers.find(c => c.id === id);
    if (updated) fsave('customers', id, updated);
  },
  deleteCustomer: (id) => {
    set(s => ({ customers: s.customers.filter(c => c.id !== id) }));
    fremove('customers', id);
  },

  // ---- SUPPLIERS ----
  addSupplier: (data) => {
    const bu = get().currentBusinessUnit;
    const supplier = { ...data, id: genId(), balance: 0, totalPurchases: 0, totalPaid: 0, active: true, createdAt: now(), businessUnitId: bu };
    set(s => ({ suppliers: [...s.suppliers, supplier] }));
    fsave('suppliers', supplier.id, supplier);
    return supplier;
  },
  updateSupplier: (id, data) => {
    set(s => ({ suppliers: s.suppliers.map(s2 => s2.id === id ? { ...s2, ...data } : s2) }));
    const updated = get().suppliers.find(s => s.id === id);
    if (updated) fsave('suppliers', id, updated);
  },
  deleteSupplier: (id) => {
    set(s => ({ suppliers: s.suppliers.filter(s2 => s2.id !== id) }));
    fremove('suppliers', id);
  },

  // ---- ITEMS ----
  addItem: (data) => {
    const bu = get().currentBusinessUnit;
    const item = { ...data, id: genId(), code: data.code || genNum('ITM', get().items), quantity: parseFloat(data.quantity) || 0, active: true, createdAt: now(), businessUnitId: bu };
    set(s => ({ items: [...s.items, item] }));
    fsave('items', item.id, item);
    return item;
  },
  updateItem: (id, data) => {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, ...data } : i) }));
    const updated = get().items.find(i => i.id === id);
    if (updated) fsave('items', id, updated);
  },
  deleteItem: (id) => {
    set(s => ({ items: s.items.filter(i => i.id !== id) }));
    fremove('items', id);
  },
  adjustItemQuantity: (id, qty) => {
    set(s => ({ items: s.items.map(i => i.id === id ? { ...i, quantity: Math.max(0, (i.quantity || 0) + qty) } : i) }));
    const updated = get().items.find(i => i.id === id);
    if (updated) fsave('items', id, updated);
  },

  // ---- WAREHOUSES ----
  addWarehouse: (data) => {
    const warehouse = { ...data, id: genId(), active: true, createdAt: now() };
    set(s => ({ warehouses: [...s.warehouses, warehouse] }));
    fsave('warehouses', warehouse.id, warehouse);
    return warehouse;
  },
  updateWarehouse: (id, data) => {
    set(s => ({ warehouses: s.warehouses.map(w => w.id === id ? { ...w, ...data } : w) }));
    const updated = get().warehouses.find(w => w.id === id);
    if (updated) fsave('warehouses', id, updated);
  },
  deleteWarehouse: (id) => {
    set(s => ({ warehouses: s.warehouses.filter(w => w.id !== id) }));
    fremove('warehouses', id);
  },
  addWarehouseTransfer: (data) => {
    const t = { ...data, id: genId(), number: genNum('WTF', get().warehouseTransfers), createdAt: now(), date: data.date || now() };
    set(s => ({
      warehouseTransfers: [...s.warehouseTransfers, t],
      items: s.items.map(i => {
        if (i.id === data.itemId && i.warehouseId === data.fromWarehouseId)
          return { ...i, quantity: Math.max(0, (i.quantity || 0) - parseFloat(data.quantity)) };
        return i;
      }),
    }));
    fsave('warehouseTransfers', t.id, t);
    const srcItem = get().items.find(i => i.id === data.itemId && i.warehouseId === data.fromWarehouseId);
    if (srcItem) fsave('items', srcItem.id, srcItem);
    const destItem = get().items.find(i => i.id === data.itemId && i.warehouseId === data.toWarehouseId);
    if (destItem) {
      get().adjustItemQuantity(destItem.id, parseFloat(data.quantity));
    } else {
      const origin = get().items.find(i => i.id === data.itemId);
      if (origin) get().addItem({ ...origin, id: undefined, warehouseId: data.toWarehouseId, quantity: parseFloat(data.quantity) });
    }
    return t;
  },

  // ---- EMPLOYEES ----
  addEmployee: (data) => {
    const employee = { ...data, id: genId(), balance: 0, totalAdvances: 0, totalDeductions: 0, active: true, createdAt: now() };
    set(s => ({ employees: [...s.employees, employee] }));
    fsave('employees', employee.id, employee);
    return employee;
  },
  updateEmployee: (id, data) => {
    set(s => ({ employees: s.employees.map(e => e.id === id ? { ...e, ...data } : e) }));
    const updated = get().employees.find(e => e.id === id);
    if (updated) fsave('employees', id, updated);
  },
  deleteEmployee: (id) => {
    set(s => ({ employees: s.employees.filter(e => e.id !== id) }));
    fremove('employees', id);
  },

  // ---- INVOICES ----
  addInvoice: (data) => {
    const bu = get().currentBusinessUnit;
    const prefixes = INVOICE_PREFIXES[bu] || INVOICE_PREFIXES.main;
    const prefix = prefixes[data.type] || 'INV';
    // Numbering is per business unit + type for correct sequences
    const buTypeInvoices = get().invoices.filter(i => buOf(i) === bu && i.type === data.type);
    const invoice = {
      ...data, id: genId(),
      number:     genNum(prefix, buTypeInvoices),
      status:     data.status || 'draft',
      paidAmount: 0,
      createdAt:  now(),
      date:       data.date || now(),
      businessUnitId: bu,
    };
    set(s => ({ invoices: [...s.invoices, invoice] }));
    fsave('invoices', invoice.id, invoice);
    if (invoice.status === 'paid' || invoice.status === 'pending') {
      get()._processInvoiceEffect(invoice);
    }
    return invoice;
  },
  updateInvoice: (id, data) => {
    set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, ...data } : i) }));
    const updated = get().invoices.find(i => i.id === id);
    if (updated) fsave('invoices', id, updated);
  },
  approveInvoice: (id) => {
    const invoice = get().invoices.find(i => i.id === id);
    if (!invoice) return;
    set(s => ({ invoices: s.invoices.map(i => i.id === id ? { ...i, status: 'pending' } : i) }));
    const updated = get().invoices.find(i => i.id === id);
    if (updated) fsave('invoices', id, updated);
    get()._processInvoiceEffect({ ...invoice, status: 'pending' });
  },
  _processInvoiceEffect: (invoice) => {
    const total = parseFloat(invoice.total) || 0;
    if (invoice.type === 'sale') {
      const cust = get().customers.find(c => c.id === invoice.customerId);
      if (cust) get().updateCustomer(invoice.customerId, {
        totalInvoices: (cust.totalInvoices || 0) + total,
        balance:       (cust.balance || 0) + total,
      });
      invoice.items?.forEach(item => {
        if (item.itemId) get().adjustItemQuantity(item.itemId, -parseFloat(item.quantity || 0));
      });
    } else if (invoice.type === 'purchase') {
      const supp = get().suppliers.find(s => s.id === invoice.supplierId);
      if (supp) get().updateSupplier(invoice.supplierId, {
        totalPurchases: (supp.totalPurchases || 0) + total,
        balance:        (supp.balance || 0) + total,
      });
      invoice.items?.forEach(item => {
        if (item.itemId) get().adjustItemQuantity(item.itemId, parseFloat(item.quantity || 0));
      });
    }
  },
  deleteInvoice: (id) => {
    set(s => ({ invoices: s.invoices.filter(i => i.id !== id) }));
    fremove('invoices', id);
  },

  // ---- QUOTATIONS ----
  addQuotation: (data) => {
    const bu = get().currentBusinessUnit;
    const q = { ...data, id: genId(), number: genNum('QUO', get().quotations.filter(i => buOf(i) === bu)), status: 'open', createdAt: now(), date: data.date || now(), businessUnitId: bu };
    set(s => ({ quotations: [...s.quotations, q] }));
    fsave('quotations', q.id, q);
    return q;
  },
  updateQuotation: (id, data) => {
    set(s => ({ quotations: s.quotations.map(q => q.id === id ? { ...q, ...data } : q) }));
    const updated = get().quotations.find(q => q.id === id);
    if (updated) fsave('quotations', id, updated);
  },
  deleteQuotation: (id) => {
    set(s => ({ quotations: s.quotations.filter(q => q.id !== id) }));
    fremove('quotations', id);
  },
  convertQuotationToInvoice: (id) => {
    const q = get().quotations.find(q => q.id === id);
    if (!q) return;
    const invoice = get().addInvoice({ ...q, type: 'sale', quotationId: id, status: 'draft' });
    get().updateQuotation(id, { status: 'accepted', invoiceId: invoice.id });
    return invoice;
  },

  // ---- PAYMENTS ----
  addPayment: (data) => {
    const bu = get().currentBusinessUnit;
    const payment = { ...data, id: genId(), number: genNum('PAY', get().payments), amount: parseFloat(data.amount), createdAt: now(), date: data.date || now(), businessUnitId: bu };
    set(s => ({ payments: [...s.payments, payment] }));
    fsave('payments', payment.id, payment);
    get().adjustAccountBalance(data.accountId, -parseFloat(data.amount));
    if (data.supplierId) {
      const supp = get().suppliers.find(s => s.id === data.supplierId);
      if (supp) get().updateSupplier(data.supplierId, {
        totalPaid: (supp.totalPaid || 0) + parseFloat(data.amount),
        balance:   Math.max(0, (supp.balance || 0) - parseFloat(data.amount)),
      });
    }
    if (data.customerId) {
      const cust = get().customers.find(c => c.id === data.customerId);
      if (cust) get().updateCustomer(data.customerId, {
        totalPaid: (cust.totalPaid || 0) + parseFloat(data.amount),
      });
    }
    return payment;
  },
  deletePayment: (id) => {
    set(s => ({ payments: s.payments.filter(p => p.id !== id) }));
    fremove('payments', id);
  },

  // ---- RECEIPTS ----
  addReceipt: (data) => {
    const bu = get().currentBusinessUnit;
    const receipt = { ...data, id: genId(), number: genNum('REC', get().receipts), amount: parseFloat(data.amount), createdAt: now(), date: data.date || now(), businessUnitId: bu };
    set(s => ({ receipts: [...s.receipts, receipt] }));
    fsave('receipts', receipt.id, receipt);
    get().adjustAccountBalance(data.accountId, parseFloat(data.amount));
    if (data.customerId) {
      const cust = get().customers.find(c => c.id === data.customerId);
      if (cust) get().updateCustomer(data.customerId, {
        totalPaid: (cust.totalPaid || 0) + parseFloat(data.amount),
        balance:   Math.max(0, (cust.balance || 0) - parseFloat(data.amount)),
      });
    }
    return receipt;
  },
  deleteReceipt: (id) => {
    set(s => ({ receipts: s.receipts.filter(r => r.id !== id) }));
    fremove('receipts', id);
  },

  // ---- SALES & PURCHASE ORDERS ----
  addSalesOrder: (data) => {
    const bu = get().currentBusinessUnit;
    const o = { ...data, id: genId(), number: genNum('SO', get().salesOrders.filter(i => buOf(i) === bu)), status: 'new', createdAt: now(), date: data.date || now(), businessUnitId: bu };
    set(s => ({ salesOrders: [...s.salesOrders, o] }));
    fsave('salesOrders', o.id, o);
    return o;
  },
  updateSalesOrder: (id, data) => {
    set(s => ({ salesOrders: s.salesOrders.map(o => o.id === id ? { ...o, ...data } : o) }));
    const updated = get().salesOrders.find(o => o.id === id);
    if (updated) fsave('salesOrders', id, updated);
  },
  addPurchaseOrder: (data) => {
    const bu = get().currentBusinessUnit;
    const o = { ...data, id: genId(), number: genNum('PO', get().purchaseOrders.filter(i => buOf(i) === bu)), status: 'new', createdAt: now(), date: data.date || now(), businessUnitId: bu };
    set(s => ({ purchaseOrders: [...s.purchaseOrders, o] }));
    fsave('purchaseOrders', o.id, o);
    return o;
  },
  updatePurchaseOrder: (id, data) => {
    set(s => ({ purchaseOrders: s.purchaseOrders.map(o => o.id === id ? { ...o, ...data } : o) }));
    const updated = get().purchaseOrders.find(o => o.id === id);
    if (updated) fsave('purchaseOrders', id, updated);
  },

  // ---- PRODUCTION ORDERS ----
  addProductionOrder: (data) => {
    const bu = get().currentBusinessUnit;
    const o = { ...data, id: genId(), number: genNum('PRD', get().productionOrders.filter(i => buOf(i) === bu)), status: 'new', createdAt: now(), date: data.date || now(), businessUnitId: bu };
    set(s => ({ productionOrders: [...s.productionOrders, o] }));
    fsave('productionOrders', o.id, o);
    return o;
  },
  updateProductionOrder: (id, data) => {
    const prev = get().productionOrders.find(o => o.id === id);
    set(s => ({ productionOrders: s.productionOrders.map(o => o.id === id ? { ...o, ...data } : o) }));
    const updated = get().productionOrders.find(o => o.id === id);
    if (updated) fsave('productionOrders', id, updated);
    if (data.status === 'completed' && prev?.status !== 'completed') {
      const order = { ...prev, ...data };
      if (order.productItemId) get().adjustItemQuantity(order.productItemId, parseFloat(order.quantity || 0));
      order.materials?.forEach(m => { if (m.itemId) get().adjustItemQuantity(m.itemId, -parseFloat(m.quantity || 0)); });
    }
  },
  deleteProductionOrder: (id) => {
    set(s => ({ productionOrders: s.productionOrders.filter(o => o.id !== id) }));
    fremove('productionOrders', id);
  },

  // ---- ASSETS ----
  addAsset: (data) => {
    const asset = { ...data, id: genId(), number: genNum('AST', get().assets), createdAt: now() };
    set(s => ({ assets: [...s.assets, asset] }));
    fsave('assets', asset.id, asset);
    return asset;
  },
  updateAsset: (id, data) => {
    set(s => ({ assets: s.assets.map(a => a.id === id ? { ...a, ...data } : a) }));
    const updated = get().assets.find(a => a.id === id);
    if (updated) fsave('assets', id, updated);
  },
  deleteAsset: (id) => {
    set(s => ({ assets: s.assets.filter(a => a.id !== id) }));
    fremove('assets', id);
  },

  // ---- PARTNERS ----
  addPartnerTransaction: (data) => {
    const id = genId();
    const record = { id, ...data, amount: parseFloat(data.amount) || 0, status: 'active', createdAt: now() };
    set(s => ({ partnerTransactions: [...s.partnerTransactions, record] }));
    fsave('partnerTransactions', id, record);
    return id;
  },
  cancelPartnerTransaction: (id) => {
    set(s => ({ partnerTransactions: s.partnerTransactions.map(t => t.id === id ? { ...t, status: 'cancelled' } : t) }));
    fsave('partnerTransactions', id, { status: 'cancelled' });
  },

  // ---- REPAIR ORDERS (Joystick) ----
  addRepairOrder: (data) => {
    const bu = get().currentBusinessUnit;
    const buRepairs = get().repairOrders.filter(r => buOf(r) === bu);
    const id = genId();
    const record = {
      id,
      number:        genNum('JS-REP', buRepairs),
      ...data,
      status:        data.status || 'received',
      businessUnitId: bu,
      createdAt:     now(),
      receivedDate:  data.receivedDate || now(),
    };
    set(s => ({ repairOrders: [...s.repairOrders, record] }));
    fsave('repairOrders', id, record);
    return id;
  },
  updateRepairOrder: (id, changes) => {
    set(s => ({ repairOrders: s.repairOrders.map(r => r.id === id ? { ...r, ...changes } : r) }));
    const updated = get().repairOrders.find(r => r.id === id);
    if (updated) fsave('repairOrders', id, updated);
  },
  deleteRepairOrder: (id) => {
    set(s => ({ repairOrders: s.repairOrders.filter(r => r.id !== id) }));
    fremove('repairOrders', id);
  },

  // ---- COMPUTED / DERIVED (all filtered by currentBusinessUnit) ----
  getTotalSales: () => {
    const bu = get().currentBusinessUnit;
    return get().invoices.filter(i => buOf(i) === bu && i.type === 'sale' && i.status !== 'cancelled' && i.status !== 'draft').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  },
  getTotalPurchases: () => {
    const bu = get().currentBusinessUnit;
    return get().invoices.filter(i => buOf(i) === bu && i.type === 'purchase' && i.status !== 'cancelled' && i.status !== 'draft').reduce((s, i) => s + (parseFloat(i.total) || 0), 0);
  },
  getTotalExpenses: () => {
    const bu = get().currentBusinessUnit;
    return get().invoices.filter(i => buOf(i) === bu && i.type === 'expense' && i.status !== 'cancelled').reduce((s, i) => s + (parseFloat(i.total) || 0), 0)
         + get().payments.filter(p => buOf(p) === bu).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  },
  getTotalReceipts: () => {
    const bu = get().currentBusinessUnit;
    return get().receipts.filter(r => buOf(r) === bu).reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  },
  getTotalPayments: () => {
    const bu = get().currentBusinessUnit;
    return get().payments.filter(p => buOf(p) === bu).reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  },
  getCashBalance: () => {
    const bu = get().currentBusinessUnit;
    return get().accounts.filter(a => buOf(a) === bu && a.type === 'cash').reduce((s, a) => s + (a.balance || 0), 0);
  },
  getBankBalance: () => {
    const bu = get().currentBusinessUnit;
    return get().accounts.filter(a => buOf(a) === bu && a.type === 'bank').reduce((s, a) => s + (a.balance || 0), 0);
  },
  getStockValue: () => {
    const bu = get().currentBusinessUnit;
    return get().items.filter(i => buOf(i) === bu).reduce((s, i) => s + ((i.quantity || 0) * (i.purchasePrice || 0)), 0);
  },
  getCustomerReceivables: () => {
    const bu = get().currentBusinessUnit;
    return get().customers.filter(c => buOf(c) === bu).reduce((s, c) => s + (c.balance || 0), 0);
  },
  getSupplierPayables: () => {
    const bu = get().currentBusinessUnit;
    return get().suppliers.filter(sp => buOf(sp) === bu).reduce((s, sp) => s + (sp.balance || 0), 0);
  },

  // Partner balance calculation (pure, no stored balance)
  getPartnerBalance: (partnerId) => {
    return get().partnerTransactions
      .filter(t => t.partnerId === partnerId && t.status === 'active')
      .reduce((bal, t) => {
        if (t.type === 'deposit')    return bal + (parseFloat(t.amount) || 0);
        if (t.type === 'withdrawal') return bal - (parseFloat(t.amount) || 0);
        if (t.type === 'expense')    return bal - (parseFloat(t.amount) || 0);
        if (t.type === 'settlement') return (parseFloat(t.amount) || 0);
        return bal;
      }, 0);
  },
}));
