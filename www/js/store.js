// حفظ البيانات محليًا (يشتغل بدون نت)
import { dayKey } from './time.js';
import { SPECIES } from './trees.js';

const KEY = 'ghars:v1';

const defaults = () => ({
  coins: 0,
  unlocked: ['oak', 'cactus'],
  tree: 'oak',
  tag: 'study',
  minutes: 25,
  mode: 'countdown',
  tags: [
    { id: 'study', name: 'دراسة', color: '#4c9eeb' },
    { id: 'work', name: 'عمل', color: '#f2994a' },
    { id: 'read', name: 'قراءة', color: '#9b6bd6' },
    { id: 'quran', name: 'قرآن', color: '#27ae60' },
    { id: 'sport', name: 'رياضة', color: '#eb5757' },
  ],
  sessions: [],
  active: null,
  settings: { deep: true, grace: 10, pause: true, prayer: true, sound: 'none', notify: false },
});

let state;

export function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY));
    const d = defaults();
    state = raw ? { ...d, ...raw, settings: { ...d.settings, ...raw.settings } } : d;
  } catch { state = defaults(); }
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* التخزين غير متاح */ }
}

export const get = () => state;

export function reset() { state = defaults(); save(); return state; }

export function importData(json) {
  const d = JSON.parse(json);
  if (!Array.isArray(d.sessions) || !Array.isArray(d.tags)) throw new Error('ملف غير صالح');
  state = { ...defaults(), ...d, active: null };
  save();
}

export const tagById = id => state.tags.find(t => t.id === id) || { id, name: 'بدون وسم', color: '#9aa7a1' };

export function addSession(s) {
  state.sessions.push(s);
  state.coins += s.coins;
  save();
}

/** أيام متتالية فيها جلسة ناجحة، تنتهي اليوم أو أمس */
export function streak() {
  const days = new Set(state.sessions.filter(s => s.status === 'done').map(s => dayKey(s.end)));
  const d = new Date();
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (days.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

/** شجرة تحدي اليوم: ثابتة طول اليوم، من الأنواع المفتوحة */
export function challengeTree() {
  const pool = SPECIES.filter(s => state.unlocked.includes(s.id));
  const k = dayKey();
  let h = 0;
  for (const ch of k) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return pool[h % pool.length].id;
}
