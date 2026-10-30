// طبقة تربط التطبيق بمزايا iOS الأصلية لما يشتغل داخل التطبيق،
// وترجع لبدائل الويب لما يشتغل في المتصفح
import { Capacitor, registerPlugin } from '../vendor/capacitor-core.js';

export const native = Capacitor.isNativePlatform();

const Haptics = registerPlugin('Haptics');
const LocalNotifications = registerPlugin('LocalNotifications');
const StatusBar = registerPlugin('StatusBar');
const SplashScreen = registerPlugin('SplashScreen');
const FocusGuard = registerPlugin('FocusGuard');

const END_ID = 1001; // تنبيه نهاية الجلسة

const quiet = p => p?.catch?.(() => {});

/** اهتزاز خفيف: tick عند تحريك الدائرة، success/warning/error للأحداث */
export function haptic(kind = 'tick') {
  if (native) {
    if (kind === 'tick') return quiet(Haptics.impact({ style: 'LIGHT' }));
    if (kind === 'tap') return quiet(Haptics.impact({ style: 'MEDIUM' }));
    return quiet(Haptics.notification({ type: kind.toUpperCase() }));
  }
  const pattern = { tick: 4, tap: 10, success: [20, 40, 20], warning: 30, error: [80, 60, 80] }[kind];
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export async function notificationsAllowed() {
  if (native) {
    try { return (await LocalNotifications.checkPermissions()).display === 'granted'; } catch { return false; }
  }
  return 'Notification' in window && Notification.permission === 'granted';
}

export async function askNotifications() {
  if (native) {
    try { return (await LocalNotifications.requestPermissions()).display === 'granted'; } catch { return false; }
  }
  if (!('Notification' in window)) return false;
  return (await Notification.requestPermission()) === 'granted';
}

/** تنبيه فوري (في المتصفح فقط؛ في التطبيق التنبيهات تنجدول مسبقًا) */
export function notifyNow(title, body) {
  if (native || !('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icons/icon.svg', tag: 'ghars' };
  if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then(r => r.showNotification(title, opts));
  else try { new Notification(title, opts); } catch { /* غير مدعوم */ }
}

/** يجدول تنبيه نهاية الجلسة، عشان يوصل حتى لو التطبيق في الخلفية */
export function scheduleEnd(atMs, title, body) {
  if (!native) return;
  quiet(LocalNotifications.schedule({
    notifications: [{ id: END_ID, title, body, schedule: { at: new Date(atMs), allowWhileIdle: true } }],
  }));
}

export function cancelEnd() {
  if (native) quiet(LocalNotifications.cancel({ notifications: [{ id: END_ID }] }));
}

/** يشغّل مراقبة الخروج: تنبيه "ارجع لشجرتك" لو طلع المستخدم */
export function armGuard(title, body) {
  if (native) quiet(FocusGuard.arm({ title, body }));
}

export function disarmGuard() {
  if (native) quiet(FocusGuard.disarm());
}

/** وقت آخر قفل للجهاز (ميلي ثانية)، أو 0 */
export async function lastLock() {
  if (!native) return 0;
  try { return (await FocusGuard.lastLock()).at || 0; } catch { return 0; }
}

export function boot() {
  if (!native) {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
    return;
  }
  document.documentElement.classList.add('native');
  quiet(StatusBar.setStyle({ style: 'LIGHT' }));
  quiet(SplashScreen.hide());
}

export function setFocusing(on) {
  if (native) quiet(StatusBar.setStyle({ style: on ? 'DARK' : 'LIGHT' }));
}
