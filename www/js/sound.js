// أصوات خلفية تتولد بالكود (بدون ملفات صوت، فحجم التطبيق يبقى صغير)

export const SOUNDS = [
  { id: 'none', name: 'بدون', icon: '🔇' },
  { id: 'rain', name: 'مطر', icon: '🌧️' },
  { id: 'wind', name: 'رياح', icon: '🍃' },
  { id: 'waves', name: 'أمواج', icon: '🌊' },
];

let ctx, nodes = [];

function noise(type) {
  const len = ctx.sampleRate * 4;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0, b = [0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (type === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
    else { // وردي
      b[0] = 0.99886 * b[0] + w * 0.0555179; b[1] = 0.99332 * b[1] + w * 0.0750759;
      b[2] = 0.969 * b[2] + w * 0.153852; b[3] = 0.8665 * b[3] + w * 0.3104856;
      b[4] = 0.55 * b[4] + w * 0.5329522; b[5] = -0.7616 * b[5] - w * 0.016898;
      d[i] = (b[0] + b[1] + b[2] + b[3] + b[4] + b[5] + b[6] + w * 0.5362) * 0.11; b[6] = w * 0.115926;
    }
  }
  const src = ctx.createBufferSource();
  src.buffer = buf; src.loop = true;
  return src;
}

function lfo(freq, depth, target) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.value = freq; g.gain.value = depth;
  o.connect(g).connect(target); o.start();
  nodes.push(o);
}

export function play(id) {
  stop();
  if (id === 'none') return;
  ctx ||= new (window.AudioContext || window.webkitAudioContext)();
  ctx.resume();
  const out = ctx.createGain();
  out.gain.value = 0;
  out.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 1.5);
  out.connect(ctx.destination);

  const src = noise(id === 'rain' ? 'pink' : 'brown');
  const f = ctx.createBiquadFilter();
  if (id === 'rain') { f.type = 'highpass'; f.frequency.value = 400; }
  if (id === 'wind') { f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8; lfo(0.13, 250, f.frequency); }
  if (id === 'waves') { f.type = 'lowpass'; f.frequency.value = 700; }
  const amp = ctx.createGain();
  amp.gain.value = id === 'waves' ? 0.6 : 0.8;
  if (id === 'waves') lfo(0.09, 0.45, amp.gain);
  src.connect(f).connect(amp).connect(out);
  src.start();
  nodes.push(src, out);
}

export function stop() {
  nodes.forEach(n => { try { n.stop?.(); n.disconnect(); } catch { /* موقف من قبل */ } });
  nodes = [];
}

/** نغمة قصيرة لنهاية الجلسة */
export function chime() {
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((hz, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), t = ctx.currentTime + i * 0.18;
      o.type = 'sine'; o.frequency.value = hz;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.03);
      g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
      o.connect(g).connect(ctx.destination); o.start(t); o.stop(t + 1.3);
    });
  } catch { /* الصوت غير متاح */ }
}
