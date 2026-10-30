// أدوات التاريخ والفترات (الأسبوع يبدأ السبت)

export const LOCALE = 'ar-u-ca-gregory-nu-latn';
const DAY = 86400000;

export function startOf(period, d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  if (period === 'week') x.setDate(x.getDate() - ((x.getDay() + 1) % 7));
  if (period === 'month') x.setDate(1);
  if (period === 'year') { x.setMonth(0); x.setDate(1); }
  return x;
}

export function shift(period, d, n) {
  const x = new Date(d);
  if (period === 'day') x.setDate(x.getDate() + n);
  if (period === 'week') x.setDate(x.getDate() + 7 * n);
  if (period === 'month') x.setMonth(x.getMonth() + n);
  if (period === 'year') x.setFullYear(x.getFullYear() + n);
  return x;
}

export const range = (period, d) => {
  const s = startOf(period, d);
  return [s.getTime(), shift(period, s, 1).getTime()];
};

export function periodLabel(period, d) {
  const s = startOf(period, d);
  const today = startOf('day').getTime();
  if (period === 'day') {
    if (s.getTime() === today) return 'اليوم';
    if (s.getTime() === today - DAY) return 'أمس';
    return s.toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  if (period === 'week') {
    const e = new Date(s.getTime() + 6 * DAY);
    return `${s.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })} – ${e.toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' })}`;
  }
  if (period === 'month') return s.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  return String(s.getFullYear());
}

export const dayKey = (d = new Date()) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

export const clock = sec => {
  sec = Math.max(0, Math.round(sec));
  // مثل 120:00 بدل 2:00:00، أوضح لمؤقت تركيز
  return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
};

export const duration = sec => {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60), r = m % 60;
  return r ? `${h} س ${r} د` : `${h} س`;
};
