import * as store from './store.js';
import { SPECIES, byId, treeMarkup, treeSVG } from './trees.js';
import { forestSVG } from './forest.js';
import * as sound from './sound.js';
import { startOf, shift, range, periodLabel, clock, duration, LOCALE, dayKey } from './time.js';
import * as platform from './platform.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => `&#${c.charCodeAt(0)};`);

const S = store.load();

const MIN_MIN = 10, MAX_MIN = 120;      // حدود العد التنازلي بالدقائق
const SW_MIN = 10 * 60, SW_MAX = 180 * 60; // ساعة الإيقاف: أقل جلسة تنحسب وأطول جلسة
const CANCEL_WINDOW = 10;               // ثواني أول الجلسة تقدر تلغي بدون ما تذبل
const PAUSE_MAX = { short: 5 * 60, prayer: 20 * 60 };
const RING = 2 * Math.PI * 128;

const MOTTOS_IDLE = ['ازرع اليوم، وقطوفك بكرة', 'خذ وقتك، واصرفه صح', 'جلسة وحدة تكفي عشان تبدأ', 'الجوال يقدر ينتظر'];
const MOTTOS_RUN = ['شجرتك تكبر 🌱', 'خلك مع اللي بين يديك', 'كل دقيقة تفرق', 'هدوء… أنت ماشي صح', 'ركّز، الشجرة معك'];

// phase: idle | running | paused | done | dead
let phase = S.active ? (S.active.pauseAt ? 'paused' : 'running') : 'idle';
let last = null;        // آخر جلسة انتهت (للعرض بعد النهاية)
let ticker = null, wakeLock = null, actionsSig = '';

/* ---------------- أدوات عامة ---------------- */

function toast(msg, ms = 2600) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

function openSheet(html, bind) {
  $('#sheet').innerHTML = html;
  $('#modal').classList.add('open');
  bind?.($('#sheet'));
}
const closeSheet = () => $('#modal').classList.remove('open');
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') closeSheet(); });

function confirmSheet({ title, text = '', ok, cancel = 'رجوع', danger = false }) {
  return new Promise(res => {
    openSheet(`<h3>${title}</h3><p>${text}</p>
      <div class="actions">
        <button class="btn primary big" data-a="cancel">${cancel}</button>
        <button class="btn ghost ${danger ? 'danger' : ''}" data-a="ok">${ok}</button>
      </div>`, el => {
      el.addEventListener('click', e => {
        const a = e.target.closest('[data-a]')?.dataset.a;
        if (!a) return;
        closeSheet();
        res(a === 'ok');
      });
    });
  });
}

function notify(title, body) {
  if (S.settings.notify) platform.notifyNow(title, body);
}

const END_TITLE = 'زرعت شجرة جديدة 🌳';

/* تنبيهات الجلسة في التطبيق الأصلي: نهاية الجلسة، و"ارجع لشجرتك" لو طلع */
function armNative() {
  const a = S.active;
  if (!a || !S.settings.notify) return;
  if (a.target) {
    const left = a.target - elapsed();
    platform.scheduleEnd(Date.now() + left * 1000, END_TITLE, `خلصت ${duration(a.target)} تركيز. ارجع واستلم عملاتك`);
  }
  if (a.deep) platform.armGuard('ارجع لشجرتك 🌱', `عندك ${S.settings.grace} ثواني قبل ما تذبل. قفل الشاشة ما يضرها`);
}

function disarmNative() {
  platform.cancelEnd();
  platform.disarmGuard();
}

function bumpCoins() {
  $$('.coins').forEach(c => { c.querySelector('b').textContent = S.coins.toLocaleString('en'); c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
}

/* ---------------- منطق الجلسة ---------------- */

/** الثواني المحسوبة من الجلسة حتى لحظة معينة (بدون أوقات الإيقاف) */
function elapsed(at = Date.now()) {
  const a = S.active;
  if (!a) return 0;
  const pausedNow = a.pauseAt ? at - a.pauseAt : 0;
  return Math.max(0, (at - a.start - a.pausedMs - pausedNow) / 1000);
}

function startSession() {
  sound.stop();
  S.active = {
    start: Date.now(), mode: S.mode, target: S.mode === 'countdown' ? S.minutes * 60 : null,
    tree: S.unlocked.includes(S.tree) ? S.tree : 'oak', tag: S.tag, deep: S.settings.deep,
    pausedMs: 0, pauseAt: null, pauseKind: null, hiddenAt: null, beat: Date.now(),
  };
  store.save();
  phase = 'running';
  last = null;
  sound.play(S.settings.sound);
  keepAwake(true);
  platform.haptic('tap');
  armNative();
  run();
}

function run() {
  clearInterval(ticker);
  ticker = setInterval(tick, 500);
  tick();
}

function tick() {
  const a = S.active;
  if (!a) { clearInterval(ticker); renderHome(); return; }
  if (a.pauseAt && Date.now() - a.pauseAt >= PAUSE_MAX[a.pauseKind] * 1000) {
    resume();
    toast('خلص وقت الإيقاف، رجعنا للتركيز 🌱');
    return;
  }
  const el = elapsed();
  if (a.target && el >= a.target) return complete();
  if (!a.target && el >= SW_MAX) return complete();
  if (!document.hidden) a.beat = Date.now();
  store.save();
  renderHome();
}

function finish(status, extra = {}) {
  const a = S.active;
  const focusSec = Math.round(status === 'done' && a.target ? a.target : elapsed());
  const isChallenge = a.tree === store.challengeTree();
  const coins = status === 'done' ? Math.floor(focusSec / 60) * 2 * (isChallenge ? 2 : 1) : 0;
  const s = {
    id: a.start.toString(36), start: a.start, end: Date.now(), focusSec, mode: a.mode,
    tree: a.tree, tag: a.tag, status, coins, challenge: status === 'done' && isChallenge, ...extra,
  };
  S.active = null;
  store.addSession(s);
  clearInterval(ticker);
  sound.stop();
  keepAwake(false);
  disarmNative();
  platform.setFocusing(false);
  last = s;
  return s;
}

function complete() {
  const s = finish('done');
  phase = 'done';
  sound.chime();
  bumpCoins();
  platform.haptic('success');
  if (document.hidden) notify(END_TITLE, `${duration(s.focusSec)} تركيز · +${s.coins} عملة`);
  if (s.challenge) toast(`أنجزت تحدي اليوم! ضعف العملات 🎉`);
  renderHome();
}

function kill(reason) {
  finish('dead', { reason });
  phase = 'dead';
  platform.haptic('error');
  renderHome();
}

function cancelSession() {
  S.active = null;
  store.save();
  clearInterval(ticker);
  sound.stop();
  keepAwake(false);
  disarmNative();
  phase = 'idle';
  renderHome();
}

function pause(kind) {
  const a = S.active;
  a.pauseAt = Date.now();
  a.pauseKind = kind;
  store.save();
  phase = 'paused';
  sound.stop();
  disarmNative();
  renderHome();
}

function resume() {
  const a = S.active;
  a.pausedMs += Date.now() - a.pauseAt;
  a.pauseAt = null;
  a.pauseKind = null;
  store.save();
  phase = 'running';
  sound.play(S.settings.sound);
  armNative();
  renderHome();
}

async function giveUp() {
  const ok = await confirmSheet({
    title: 'متأكد تستسلم؟',
    text: 'شجرتك بتذبل وتبقى في غابتك كذكرى. ما عليه، بس لو تقدر كمّل.',
    ok: 'استسلام', cancel: 'أكمل التركيز', danger: true,
  });
  if (ok && S.active) kill('استسلمت');
}

async function endStopwatch() {
  if (elapsed() >= SW_MIN) return complete();
  const ok = await confirmSheet({
    title: 'الجلسة أقل من 10 دقائق',
    text: 'الجلسات القصيرة ما تنزرع لها شجرة. تبي تنهيها بدون ما تنحسب؟',
    ok: 'إنهاء بدون شجرة', cancel: 'أكمل',
  });
  if (ok && S.active) cancelSession();
}

/* الخروج من التطبيق: في التركيز العميق، الغياب أطول من المهلة يذبّل الشجرة.
   قفل الشاشة ما يُحسب خروج: iOS يبلغنا بالقفل بعد ثواني من قفل جهاز عليه رمز دخول */
const LOCK_WINDOW = 20000;

async function judgeAbsence(since) {
  const a = S.active;
  const graceMs = S.settings.grace * 1000;
  const away = Date.now() - since;
  if (!a.deep || away <= graceMs) return false;
  const lockAt = await platform.lastLock();
  if (lockAt >= since - 1000 && lockAt <= since + graceMs + LOCK_WINDOW) return false;
  if (S.active !== a) return true;
  // لو الجلسة كانت بتخلص قبل ما تنتهي المهلة، تنحسب ناجحة
  if (a.target && elapsed(since + graceMs) >= a.target) complete();
  else kill(`غبت عن التطبيق أكثر من ${S.settings.grace} ثواني`);
  return true;
}

document.addEventListener('visibilitychange', async () => {
  const a = S.active;
  if (!a || a.pauseAt) return;
  if (document.hidden) {
    a.hiddenAt = Date.now();
    store.save();
    if (a.deep && !platform.native) notify('ارجع لشجرتك 🌱', `عندك ${S.settings.grace} ثواني قبل ما تذبل`);
  } else if (a.hiddenAt) {
    const since = a.hiddenAt;
    a.hiddenAt = null;
    if (await judgeAbsence(since)) return;
    if (Date.now() - since > 3000) toast(a.deep ? 'رجعت بالوقت، شجرتك سليمة 👍' : 'شجرتك كانت تنتظرك 🌱');
    tick();
  }
});

async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
    else { await wakeLock?.release(); wakeLock = null; }
  } catch { /* غير مدعوم */ }
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && S.active && !wakeLock) keepAwake(true); });

/* ---------------- الشاشة الرئيسية ---------------- */

const previewProgress = min => 0.3 + 0.7 * (min - MIN_MIN) / (MAX_MIN - MIN_MIN);

function renderHome() {
  const home = $('#home');
  const a = S.active;
  const mode = a?.mode || (last ? last.mode : S.mode);
  const focusing = phase === 'running' || phase === 'paused';
  home.classList.toggle('idle', phase === 'idle');
  home.classList.toggle('stopwatch', S.mode === 'stopwatch');
  document.body.classList.toggle('focusing', focusing && current === 'home');
  if (focusing !== renderHome.wasFocusing) { renderHome.wasFocusing = focusing; platform.setFocusing(focusing && current === 'home'); }

  $$('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === S.mode));
  $$('.coins b').forEach(b => { b.textContent = S.coins.toLocaleString('en'); });

  // الشجرة والحلقة
  let treeId = S.tree, progress, dead = false, frac, timeText;
  const el = elapsed();
  if (phase === 'idle') {
    progress = S.mode === 'countdown' ? previewProgress(S.minutes) : 0.3;
    frac = S.mode === 'countdown' ? S.minutes / MAX_MIN : 0;
    timeText = S.mode === 'countdown' ? clock(S.minutes * 60) : '00:00';
  } else if (focusing) {
    treeId = a.tree;
    progress = a.target ? el / a.target : Math.min(1, el / 3600);
    frac = a.target ? el / a.target : (el % 3600) / 3600;
    timeText = a.target ? clock(a.target - el) : clock(el);
  } else {
    treeId = last.tree;
    dead = phase === 'dead';
    progress = dead ? Math.max(0.3, last.focusSec / (last.mode === 'countdown' ? 60 * 25 : 3600)) : 1;
    frac = dead ? 0 : 1;
    timeText = clock(last.focusSec);
  }
  $('#potTree').innerHTML = treeMarkup(treeId, progress, dead);
  const ring = $('#ringFill');
  ring.style.strokeDasharray = RING;
  ring.style.strokeDashoffset = RING * (1 - Math.min(1, frac));
  const ang = (frac * 360 - 90) * Math.PI / 180;
  $('#knob').setAttribute('cx', 150 + 128 * Math.cos(ang));
  $('#knob').setAttribute('cy', 150 + 128 * Math.sin(ang));
  $('#timer').textContent = timeText;

  // الوسم
  const tag = store.tagById(a?.tag || (last && phase !== 'idle' ? last.tag : S.tag));
  $('#tagChip i').style.background = tag.color;
  $('#tagChip span').textContent = tag.name;

  // النصوص
  const sp = byId(treeId);
  let motto, status;
  if (phase === 'idle') {
    motto = MOTTOS_IDLE[new Date().getDate() % MOTTOS_IDLE.length];
    status = S.mode === 'countdown' ? `اسحب الدائرة للوقت · اضغط الشجرة لتغييرها (${sp.name})` : `ساعة إيقاف · أقل جلسة 10 دقائق (${sp.name})`;
  } else if (phase === 'running') {
    motto = MOTTOS_RUN[Math.floor(el / 20) % MOTTOS_RUN.length];
    status = a.deep ? `🔒 تركيز عميق · لا تطلع أكثر من ${S.settings.grace} ثواني` : '🍃 وضع مرن · تقدر تتنقل بين التطبيقات';
  } else if (phase === 'paused') {
    motto = a.pauseKind === 'prayer' ? 'تقبّل الله 🤲' : 'خذ نفس… الشجرة سليمة';
    status = `إيقاف مؤقت · يتبقى ${clock(PAUSE_MAX[a.pauseKind] - (Date.now() - a.pauseAt) / 1000)}`;
  } else if (phase === 'done') {
    motto = `زرعت ${sp.name}! 🌳`;
    status = `+${last.coins} عملة${last.challenge ? ' (ضعف التحدي)' : ''} · ${duration(last.focusSec)} تركيز`;
  } else {
    motto = 'شجرتك ذبلت 🥀';
    status = `${last.reason}. ما عليه، الجاية أحسن.`;
  }
  $('#motto').textContent = motto;
  $('#status').textContent = status;

  renderActions(el);

  // الأزرار السفلية
  const deep = a ? a.deep : S.settings.deep;
  $('#deepChip').textContent = deep ? '🔒 تركيز عميق' : '🍃 وضع مرن';
  const snd = sound.SOUNDS.find(x => x.id === S.settings.sound);
  $('#soundChip').textContent = `${snd.icon} ${snd.name === 'بدون' ? 'بدون صوت' : snd.name}`;

  renderChallenge();
}

function renderActions(el) {
  const a = S.active;
  const inCancel = phase === 'running' && el < CANCEL_WINDOW;
  const cancelLeft = Math.ceil(CANCEL_WINDOW - el);
  const sig = [phase, a?.mode, inCancel && cancelLeft, S.settings.pause, S.settings.prayer].join('|');
  if (sig === actionsSig) return;
  actionsSig = sig;

  let html = '';
  if (phase === 'idle') html = `<button class="btn primary big" data-act="start">ازرع 🌱</button>`;
  else if (phase === 'running') {
    if (inCancel) html = `<button class="btn ghost" data-act="cancel">إلغاء (${cancelLeft})</button>`;
    else if (a.mode === 'stopwatch') html = `<div class="row"><button class="btn primary" data-act="end">إنهاء الجلسة</button><button class="btn" data-act="giveup">استسلام</button></div>`;
    else html = `<button class="btn" data-act="giveup">استسلام</button>`;
    const pauses = [
      S.settings.pause && `<button class="btn small" data-act="pause">⏸ إيقاف 5 د</button>`,
      S.settings.prayer && `<button class="btn small" data-act="prayer">🕌 وقت الصلاة</button>`,
    ].filter(Boolean).join('');
    if (pauses && !inCancel) html += `<div class="row">${pauses}</div>`;
  } else if (phase === 'paused') html = `<button class="btn primary big" data-act="resume">▶ كمّل التركيز</button>`;
  else html = `<button class="btn primary big" data-act="again">${phase === 'done' ? 'ازرع مرة ثانية' : 'حاول مرة ثانية'}</button>
      <div class="row"><button class="btn small" data-go="breathe">🍃 استراحة</button><button class="btn small" data-go="forest">🌳 غابتي</button></div>`;
  $('#actions').innerHTML = html;
}

function renderChallenge() {
  const id = store.challengeTree(), sp = byId(id);
  const doneToday = S.sessions.some(s => s.challenge && dayKey(s.end) === dayKey());
  $('#challenge').innerHTML = `${treeSVG(id, 1)}
    <div><b>${doneToday ? 'أنجزت تحدي اليوم ✓' : `تحدي اليوم: ازرع ${sp.name}`}</b>
    <small>${doneToday ? 'تقدر تكرره، والعملات تتضاعف كل مرة' : 'ضعف العملات · اضغط عشان تختارها'}</small></div>`;
}

$('#actions').addEventListener('click', e => {
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (!act) return;
  ({
    start: startSession, again: startSession, cancel: cancelSession, giveup: giveUp,
    end: endStopwatch, resume, pause: () => pause('short'), prayer: () => pause('prayer'),
  })[act]?.();
});

function toIdle() {
  if (phase === 'done' || phase === 'dead') { phase = 'idle'; last = null; }
}

$('#modeSeg').addEventListener('click', e => {
  const m = e.target.closest('[data-mode]')?.dataset.mode;
  if (!m || S.active) return;
  S.mode = m; toIdle(); store.save(); renderHome();
});

$('#deepChip').addEventListener('click', () => {
  if (S.active) return;
  S.settings.deep = !S.settings.deep; store.save(); toIdle(); renderHome();
  toast(S.settings.deep ? `تركيز عميق: لو طلعت أكثر من ${S.settings.grace} ثواني تذبل الشجرة` : 'وضع مرن: تقدر تطلع وترجع بدون عقوبة');
});

$('#soundChip').addEventListener('click', () => {
  const i = sound.SOUNDS.findIndex(x => x.id === S.settings.sound);
  S.settings.sound = sound.SOUNDS[(i + 1) % sound.SOUNDS.length].id;
  store.save();
  if (phase === 'running') sound.play(S.settings.sound);
  else if (S.settings.sound !== 'none') { sound.play(S.settings.sound); clearTimeout(soundPreview); soundPreview = setTimeout(() => phase !== 'running' && sound.stop(), 2500); }
  else sound.stop();
  renderHome();
});
let soundPreview;

$('#challenge').addEventListener('click', () => {
  if (S.active) return;
  S.tree = store.challengeTree(); toIdle(); store.save(); renderHome();
  toast(`اخترت ${byId(S.tree).name} 🌱`);
});

/* سحب الدائرة لتحديد المدة (كل 5 دقائق) */
(() => {
  const dial = $('#dial');
  let dragging = false;
  const setFrom = e => {
    const r = dial.getBoundingClientRect();
    const x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
    let deg = Math.atan2(y, x) * 180 / Math.PI + 90;
    if (deg < 0) deg += 360;
    let m = Math.round(deg / 360 * MAX_MIN / 5) * 5;
    if (m === 0 && S.minutes > 60) m = MAX_MIN;
    m = Math.max(MIN_MIN, Math.min(MAX_MIN, m));
    if (m !== S.minutes) { S.minutes = m; platform.haptic('tick'); renderHome(); }
  };
  dial.addEventListener('pointerdown', e => {
    if (phase !== 'idle' && phase !== 'done' && phase !== 'dead') return;
    if (S.mode !== 'countdown') return;
    const r = dial.getBoundingClientRect();
    const dist = Math.hypot(e.clientX - r.left - r.width / 2, e.clientY - r.top - r.height / 2) / (r.width / 2);
    if (dist < 0.72) return; // الضغط على الشجرة يفتح الاختيار
    toIdle();
    dragging = true;
    dial.setPointerCapture(e.pointerId);
    setFrom(e);
  });
  dial.addEventListener('pointermove', e => dragging && setFrom(e));
  const stop = () => { if (dragging) { dragging = false; store.save(); } };
  dial.addEventListener('pointerup', stop);
  dial.addEventListener('pointercancel', stop);
})();

/* اختيار الشجرة */
$('#treeHit').addEventListener('click', () => {
  if (S.active) return;
  openSheet(`<h3>اختر نبتتك</h3><p>الأنواع المقفلة تفتحها من المتجر</p>
    <div class="pick-grid">${SPECIES.map(sp => {
      const owned = S.unlocked.includes(sp.id);
      return `<button data-id="${sp.id}" class="${sp.id === S.tree ? 'on' : ''} ${owned ? '' : 'locked'}">
        ${treeSVG(sp.id, 1)}<span>${owned ? sp.name : '🔒 ' + sp.price}</span></button>`;
    }).join('')}</div>`, el => {
    el.addEventListener('click', e => {
      const id = e.target.closest('[data-id]')?.dataset.id;
      if (!id) return;
      closeSheet();
      if (!S.unlocked.includes(id)) { go('shop'); highlightShop(id); return; }
      S.tree = id; toIdle(); store.save(); renderHome();
    });
  });
});

/* اختيار الوسم */
$('#tagChip').addEventListener('click', () => {
  if (S.active) return;
  openSheet(`<h3>وش بتسوي الحين؟</h3><p>الوسم يساعدك تعرف وين يروح وقتك</p>
    <div class="pick-list">${S.tags.map(t => `<button data-id="${t.id}" class="${t.id === S.tag ? 'on' : ''}">
      <i class="dot" style="background:${t.color}"></i>${esc(t.name)}</button>`).join('')}
      <button data-manage>＋ إدارة الوسوم</button></div>`, el => {
    el.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      closeSheet();
      if (b.hasAttribute('data-manage')) return go('tags');
      S.tag = b.dataset.id; toIdle(); store.save(); renderHome();
    });
  });
});

/* ---------------- التنقل ---------------- */

let current = 'home';
function go(name) {
  current = name;
  $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
  $$('.drawer [data-go]').forEach(b => b.classList.toggle('on', b.dataset.go === name));
  document.body.classList.remove('drawer-open');
  document.body.classList.toggle('calm', name === 'breathe');
  if (name !== 'breathe') stopBreathing();
  window.scrollTo(0, 0);
  ({ home: renderHome, forest: renderForest, stats: renderStats, shop: renderShop, tags: renderTags, settings: renderSettings })[name]?.();
  if (name !== 'home') document.body.classList.remove('focusing');
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-open-drawer]')) document.body.classList.add('drawer-open');
  const g = e.target.closest('[data-go]');
  if (g) go(g.dataset.go);
});
$('#scrim').addEventListener('click', () => document.body.classList.remove('drawer-open'));

/* ---------------- الفترات (غابتي والإحصائيات) ---------------- */

const PERIODS = [['day', 'يوم'], ['week', 'أسبوع'], ['month', 'شهر'], ['year', 'سنة']];
const view = { forest: { p: 'day', d: new Date() }, stats: { p: 'week', d: new Date() } };

function renderPeriodControls(screen, rerender) {
  const v = view[screen];
  const box = $(`.periods[data-for="${screen}"]`);
  box.innerHTML = PERIODS.map(([id, n]) => `<button data-p="${id}" class="${v.p === id ? 'on' : ''}">${n}</button>`).join('');
  box.onclick = e => { const p = e.target.dataset.p; if (p) { v.p = p; v.d = new Date(); rerender(); } };
  const isNow = startOf(v.p, v.d).getTime() === startOf(v.p).getTime();
  const nav = $(`.period-nav[data-for="${screen}"]`);
  nav.innerHTML = `<button data-n="-1" aria-label="السابق">›</button><b>${periodLabel(v.p, v.d)}</b>
    <button data-n="1" aria-label="التالي" ${isNow ? 'disabled' : ''}>‹</button>`;
  nav.onclick = e => { const n = +e.target.dataset.n; if (n) { v.d = shift(v.p, v.d, n); rerender(); } };
}

const inRange = (screen) => {
  const [a, b] = range(view[screen].p, view[screen].d);
  return S.sessions.filter(s => s.end >= a && s.end < b);
};

function renderForest() {
  renderPeriodControls('forest', renderForest);
  const list = inRange('forest');
  const v = view.forest;
  $('#forestView').innerHTML = list.length
    ? forestSVG(list, v.p + startOf(v.p, v.d).getTime())
    : forestSVG([], 'empty', false) + `<p class="empty">ما زرعت شي هنا للحين. أول شجرة تبدأ بجلسة وحدة 🌱</p>`;
  const alive = list.filter(s => s.status === 'done');
  $('#forestSummary').innerHTML = `
    <div class="stat"><b>${alive.length}</b><small>شجرة حية</small></div>
    <div class="stat"><b>${list.length - alive.length}</b><small>ذابلة</small></div>
    <div class="stat"><b>${duration(alive.reduce((t, s) => t + s.focusSec, 0))}</b><small>تركيز</small></div>`;
  $('#timeline').innerHTML = list.slice().reverse().slice(0, 60).map(s => {
    const t = store.tagById(s.tag);
    const when = new Date(s.start).toLocaleTimeString(LOCALE, { hour: 'numeric', minute: '2-digit' });
    const date = v.p === 'day' ? '' : new Date(s.start).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' }) + ' · ';
    return `<li>${treeSVG(s.tree, 1, s.status === 'dead')}
      <div class="meta"><b>${byId(s.tree).name}${s.status === 'dead' ? ' · ذبلت' : ''}</b>
      <small><i class="dot" style="background:${t.color}"></i>${esc(t.name)} · ${duration(s.focusSec)}</small></div>
      <span class="when">${date}${when}</span></li>`;
  }).join('') || '';
}

$('#shareForest').addEventListener('click', async () => {
  const list = inRange('forest').filter(s => s.status === 'done');
  const text = `زرعت ${list.length} شجرة في غابتي (${periodLabel(view.forest.p, view.forest.d)}) بـ ${duration(list.reduce((t, s) => t + s.focusSec, 0))} تركيز 🌳 #غرس`;
  try {
    if (navigator.share) return await navigator.share({ text });
  } catch (err) { if (err.name === 'AbortError') return; }
  try { await navigator.clipboard.writeText(text); toast('نسخت النص، شاركه وين ما تبي'); }
  catch { toast(text, 5000); }
});

function renderStats() {
  renderPeriodControls('stats', renderStats);
  const v = view.stats;
  const list = inRange('stats');
  const done = list.filter(s => s.status === 'done');
  const total = done.reduce((t, s) => t + s.focusSec, 0);
  const rate = list.length ? Math.round(done.length / list.length * 100) : 0;
  $('#statsTop').innerHTML = `
    <div class="stat"><b>${duration(total)}</b><small>وقت التركيز</small></div>
    <div class="stat"><b>${done.length}</b><small>جلسة ناجحة</small></div>
    <div class="stat"><b>${rate}%</b><small>نسبة النجاح</small></div>
    <div class="stat"><b>${store.streak()} 🔥</b><small>أيام متتالية</small></div>`;

  // الأعمدة
  const s0 = startOf(v.p, v.d);
  let buckets = [];
  if (v.p === 'day') buckets = Array.from({ length: 24 }, (_, h) => ({ label: h % 6 ? '' : String(h), key: h }));
  if (v.p === 'week') buckets = Array.from({ length: 7 }, (_, i) => { const d = shift('day', s0, i); return { label: d.toLocaleDateString(LOCALE, { weekday: 'short' }), key: dayKey(d) }; });
  if (v.p === 'month') {
    const n = new Date(s0.getFullYear(), s0.getMonth() + 1, 0).getDate();
    buckets = Array.from({ length: n }, (_, i) => ({ label: (i + 1) % 5 === 1 ? String(i + 1) : '', key: i + 1 }));
  }
  if (v.p === 'year') buckets = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1), key: i }));
  const keyOf = s => {
    const d = new Date(s.start);
    return v.p === 'day' ? d.getHours() : v.p === 'week' ? dayKey(d) : v.p === 'month' ? d.getDate() : d.getMonth();
  };
  const sums = new Map();
  done.forEach(s => sums.set(keyOf(s), (sums.get(keyOf(s)) || 0) + s.focusSec));
  const max = Math.max(1, ...sums.values());
  $('#bars').innerHTML = buckets.map((b, i) => {
    const val = sums.get(b.key) || 0;
    return `<div class="col ${val ? '' : 'zero'}" data-i="${i}" data-v="${val}">
      <i style="height:${Math.max(1.5, val / max * 100)}%"></i><span>${b.label}</span></div>`;
  }).join('');
  $('#bars').onclick = e => {
    const col = e.target.closest('.col');
    $$('#bars .col').forEach(c => { c.classList.remove('sel'); c.querySelector('.tip')?.remove(); });
    if (!col) return;
    col.classList.add('sel');
    col.insertAdjacentHTML('afterbegin', `<span class="tip">${duration(+col.dataset.v)}</span>`);
  };

  // الوسوم
  const byTag = new Map();
  done.forEach(s => byTag.set(s.tag, (byTag.get(s.tag) || 0) + s.focusSec));
  const rows = [...byTag].sort((a, b) => b[1] - a[1]);
  if (!rows.length) { $('#donut').innerHTML = `<p class="empty">ما فيه بيانات للفترة هذي.</p>`; return; }
  const C = 2 * Math.PI * 46;
  let off = 0;
  const arcs = rows.map(([id, sec]) => {
    const len = sec / total * C;
    const arc = `<circle cx="65" cy="65" r="46" fill="none" stroke="${store.tagById(id).color}" stroke-width="20"
      stroke-dasharray="${Math.max(0, len - 1.5)} ${C}" stroke-dashoffset="${-off}" transform="rotate(-90 65 65)"/>`;
    off += len;
    return arc;
  }).join('');
  $('#donut').innerHTML = `<svg viewBox="0 0 130 130">${arcs}
      <text x="65" y="70" text-anchor="middle" font-size="15" font-weight="700" fill="#114836">${duration(total)}</text></svg>
    <ul class="legend">${rows.map(([id, sec]) => { const t = store.tagById(id); return `<li><span><i class="dot" style="background:${t.color}"></i>${esc(t.name)}</span><b>${Math.round(sec / total * 100)}%</b></li>`; }).join('')}</ul>`;
}

/* ---------------- المتجر ---------------- */

function renderShop() {
  $$('.coins b').forEach(b => { b.textContent = S.coins.toLocaleString('en'); });
  $('#shopGrid').innerHTML = SPECIES.map(sp => {
    const owned = S.unlocked.includes(sp.id), cur = S.tree === sp.id;
    const btn = cur ? `<button class="btn small" disabled>مختارة ✓</button>`
      : owned ? `<button class="btn small" data-pick="${sp.id}">اختيار</button>`
      : `<button class="btn small primary" data-buy="${sp.id}">🪙 ${sp.price}</button>`;
    return `<div class="item ${owned ? '' : 'locked'} ${cur ? 'current' : ''}" id="item-${sp.id}">
      ${treeSVG(sp.id, 1)}<b>${sp.name}</b><p>${sp.desc}</p>${btn}</div>`;
  }).join('');
}

function highlightShop(id) {
  const el = $('#item-' + id);
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el?.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: 600, delay: 300 });
}

$('#shopGrid').addEventListener('click', async e => {
  const pick = e.target.closest('[data-pick]')?.dataset.pick;
  const buy = e.target.closest('[data-buy]')?.dataset.buy;
  if (pick) { S.tree = pick; toIdle(); store.save(); renderShop(); toast(`اخترت ${byId(pick).name} 🌱`); }
  if (buy) {
    const sp = byId(buy);
    if (S.coins < sp.price) return toast(`تحتاج ${sp.price - S.coins} عملة زيادة. تقريبًا ${Math.ceil((sp.price - S.coins) / 50)} جلسات 25 دقيقة`);
    const ok = await confirmSheet({ title: `تفتح ${sp.name}؟`, text: `بـ ${sp.price} عملة. يبقى معك ${S.coins - sp.price}.`, ok: 'افتح', cancel: 'لا، بعدين' });
    if (!ok) return;
    S.coins -= sp.price;
    S.unlocked.push(sp.id);
    S.tree = sp.id;
    toIdle();
    store.save();
    renderShop();
    bumpCoins();
    toast(`${sp.name} صارت في غابتك. ازرعها في جلستك الجاية 🌱`);
  }
});

/* ---------------- الوسوم ---------------- */

const SWATCHES = ['#4c9eeb', '#f2994a', '#9b6bd6', '#27ae60', '#eb5757', '#f2c94c', '#2d9cdb', '#e86fa8', '#56ccf2', '#8d6e63'];
let newColor = SWATCHES[5];

function renderTags() {
  const counts = new Map();
  S.sessions.forEach(s => counts.set(s.tag, (counts.get(s.tag) || 0) + (s.status === 'done' ? s.focusSec : 0)));
  $('#tagList').innerHTML = S.tags.map(t => `<li><i class="dot" style="background:${t.color};width:14px;height:14px"></i>
    <span>${esc(t.name)}</span><small>${duration(counts.get(t.id) || 0)}</small>
    <button class="icon-btn" data-del="${t.id}" aria-label="حذف ${esc(t.name)}" ${S.tags.length < 2 ? 'disabled' : ''}>✕</button></li>`).join('');
  $('#swatches').innerHTML = SWATCHES.map(c => `<button type="button" data-c="${c}" style="background:${c}" class="${c === newColor ? 'on' : ''}" aria-label="لون"></button>`).join('');
}

$('#swatches').addEventListener('click', e => { if (e.target.dataset.c) { newColor = e.target.dataset.c; renderTags(); } });
$('#addTag').addEventListener('submit', e => {
  e.preventDefault();
  const name = e.target.name.value.trim();
  if (!name) return;
  const id = 't' + Date.now().toString(36);
  S.tags.push({ id, name, color: newColor });
  S.tag = id;
  store.save();
  e.target.reset();
  renderTags();
  toast(`أضفت وسم "${name}"`);
});
$('#tagList').addEventListener('click', async e => {
  const id = e.target.closest('[data-del]')?.dataset.del;
  if (!id || S.tags.length < 2) return;
  const t = store.tagById(id);
  const ok = await confirmSheet({ title: `تحذف "${esc(t.name)}"؟`, text: 'الجلسات القديمة تبقى، بس بدون وسم.', ok: 'حذف', danger: true });
  if (!ok) return;
  S.tags = S.tags.filter(x => x.id !== id);
  if (S.tag === id) S.tag = S.tags[0].id;
  store.save();
  renderTags();
});

/* ---------------- مساحة هادئة (تنفس) ---------------- */

const BREATH = [['شهيق', 4, 1.22], ['احبس', 4, 1.22], ['زفير', 6, 0.86]];
let breathTimer = null, breathCycles = 0;

function breathStep(i) {
  const [word, sec, scale] = BREATH[i];
  $('#breatheWord').textContent = word;
  const m = $('#mascot');
  m.style.transitionDuration = sec + 's';
  m.style.transform = `scale(${scale})`;
  const bar = $('#breatheProg');
  bar.style.transition = 'none'; bar.style.width = '0';
  void bar.offsetWidth;
  bar.style.transition = `width ${sec}s linear`; bar.style.width = '100%';
  if (i === 2) breathCycles++;
  breathTimer = setTimeout(() => {
    if (i === 2) $('#breatheCount').textContent = `${breathCycles} ${breathCycles === 1 ? 'دورة' : 'دورات'} · استمر براحتك`;
    breathStep((i + 1) % 3);
  }, sec * 1000);
}

function stopBreathing() {
  clearTimeout(breathTimer);
  breathTimer = null;
  $('#breatheBtn').textContent = 'ابدأ التنفس';
  $('#breatheWord').textContent = breathCycles ? 'أحسنت 🌿' : 'جاهز؟';
  $('#mascot').style.transform = 'scale(1)';
  $('#breatheProg').style.width = '0';
  if (!S.active) sound.stop();
}

$('#breatheBtn').addEventListener('click', () => {
  if (breathTimer) return stopBreathing();
  breathCycles = 0;
  $('#breatheBtn').textContent = 'إيقاف';
  if (!S.active) sound.play('wind');
  breathStep(0);
});

/* ---------------- الإعدادات ---------------- */

function renderSettings() {
  const st = S.settings;
  const sw = (key, title, sub) => `<div class="set-row"><div><b>${title}</b><small>${sub}</small></div>
    <button class="switch ${st[key] ? 'on' : ''}" data-sw="${key}" role="switch" aria-checked="${!!st[key]}" aria-label="${title}"></button></div>`;
  const seg = (key, title, sub, opts) => `<div class="set-row"><div><b>${title}</b><small>${sub}</small></div>
    <div class="mini-seg">${opts.map(([v, n]) => `<button data-set="${key}" data-v="${v}" class="${st[key] == v ? 'on' : ''}">${n}</button>`).join('')}</div></div>`;
  $('#settingsList').innerHTML =
    sw('deep', 'تركيز عميق افتراضيًا', 'لو طلعت من التطبيق وقت الجلسة تذبل شجرتك') +
    seg('grace', 'مهلة الرجوع', 'كم ثانية تقدر تغيب قبل ما تذبل', [[5, '5ث'], [10, '10ث'], [20, '20ث']]) +
    sw('pause', 'الإيقاف المؤقت', 'إيقاف لحد 5 دقائق والشجرة سليمة. طفّه لو تبي صرامة كاملة') +
    sw('prayer', 'إيقاف وقت الصلاة', 'إيقاف لحد 20 دقيقة بدون ما تخسر الشجرة') +
    sw('notify', 'التنبيهات', 'تنبيه لو طلعت وقت الجلسة، وتنبيه لما تخلص') +
    seg('sound', 'الصوت الافتراضي', 'يشتغل مع بداية الجلسة', sound.SOUNDS.map(s => [s.id, s.icon]));
}

$('#settingsList').addEventListener('click', async e => {
  const sw = e.target.closest('[data-sw]')?.dataset.sw;
  const set = e.target.closest('[data-set]');
  if (sw) {
    if (sw === 'notify' && !S.settings.notify) {
      if (!(await platform.askNotifications())) {
        return toast(platform.native ? 'فعّل التنبيهات لغرس من الإعدادات في جوالك' : 'ما تم السماح بالتنبيهات من المتصفح');
      }
    }
    S.settings[sw] = !S.settings[sw];
  }
  if (set) S.settings[set.dataset.set] = set.dataset.set === 'grace' ? +set.dataset.v : set.dataset.v;
  if (sw || set) { store.save(); actionsSig = ''; renderSettings(); }
});

$('#exportBtn').addEventListener('click', async () => {
  if (platform.native) {
    // التحميل المباشر ما يشتغل داخل تطبيق iOS، فننسخ البيانات
    try { await navigator.clipboard.writeText(JSON.stringify(S)); toast('نسخت بياناتك. الصقها في ملاحظة واحفظها'); }
    catch { toast('ما قدرت أنسخ البيانات'); }
    return;
  }
  const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `ghars-${dayKey()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('#importInput').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    store.importData(await file.text());
    location.reload();
  } catch (err) { toast('ما قدرت أقرأ الملف: ' + err.message); }
});

$('#resetBtn').addEventListener('click', async () => {
  const ok = await confirmSheet({ title: 'تمسح كل شي؟', text: 'الغابة والعملات والإحصائيات بتنحذف من الجهاز ولا ترجع.', ok: 'مسح الكل', danger: true });
  if (!ok) return;
  store.reset();
  location.reload();
});

/* ---------------- البداية ---------------- */

// لو التطبيق انقفل أو انعمل له تحديث وسط جلسة
if (S.active) {
  const a = S.active;
  const since = a.hiddenAt || a.beat;
  a.hiddenAt = null;
  if (a.pauseAt) { phase = 'paused'; run(); }
  else {
    phase = 'running';
    judgeAbsence(since).then(ended => { if (!ended) { armNative(); run(); } });
  }
}

go('home');

platform.boot();
