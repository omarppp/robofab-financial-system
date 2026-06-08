// ── Egyptian Pound currency formatter ─────────────────────────────────────
export const formatCurrency = (amount, currency = 'ج.م') => {
  const num = parseFloat(amount) || 0;
  return `${num.toLocaleString('ar-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
};

export const formatNumber = (num) =>
  parseFloat(num || 0).toLocaleString('ar-EG', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// ── Egyptian date format: DD/MM/YYYY ──────────────────────────────────────
export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const dd   = String(d.getDate()).padStart(2, '0');
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch { return dateStr; }
};

// Same DD/MM/YYYY format everywhere
export const formatDateShort = formatDate;

export const today = () => new Date().toISOString().split('T')[0];

export const addDays = (date, days) => {
  const d = new Date(date || Date.now());
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export const isOverdue = (dueDate) =>
  dueDate &&
  new Date(dueDate) < new Date() &&
  new Date(dueDate).toDateString() !== new Date().toDateString();

export const calcInvoiceTotal = (items, discount = 0, round = false) => {
  const subtotal = items.reduce(
    (sum, item) => sum + (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)),
    0
  );
  const total = subtotal - (parseFloat(discount) || 0);
  return round ? Math.round(total) : parseFloat(total.toFixed(2));
};

export const calcSubtotal = (items) =>
  items.reduce((sum, item) => sum + (parseFloat(item.quantity || 1) * parseFloat(item.unitPrice || 0)), 0);

export const getMonthName = (monthIndex) => {
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو',
                  'يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  return months[monthIndex];
};

export const getLast6Months = () => {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push({ label: getMonthName(d.getMonth()), year: d.getFullYear(), month: d.getMonth() });
  }
  return months;
};

export const filterByDateRange = (items, dateField, from, to) => {
  if (!from && !to) return items;
  return items.filter(item => {
    const d = new Date(item[dateField]);
    if (from && d < new Date(from)) return false;
    if (to && d > new Date(to + 'T23:59:59')) return false;
    return true;
  });
};

export const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};

export const printElement = (elementId) => {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open('', '_blank');
  win.document.write(
    `<html lang="ar" dir="rtl"><head><meta charset="UTF-8">` +
    `<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap" rel="stylesheet">` +
    `<style>body{font-family:'Cairo',sans-serif;direction:rtl;padding:20px;}*{box-sizing:border-box;}</style>` +
    `</head><body>${el.innerHTML}</body></html>`
  );
  win.document.close();
  win.print();
};

export const exportTableToCSV = (data, headers, filename) => {
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
  ].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
};
