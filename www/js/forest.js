// رسم الغابة كقطعة أرض Isometric
import { treeMarkup } from './trees.js';

const TW = 64, TH = 32, DEPTH = 26;

function hash(str) {
  let h = 2166136261;
  for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
}

/**
 * sessions: الجلسات داخل الفترة
 * seed: نص ثابت للفترة عشان ترتيب الأشجار ما يتغير كل مرة
 */
export function forestSVG(sessions, seed, talk = true) {
  const n = Math.max(4, Math.ceil(Math.sqrt(sessions.length * 1.3)));
  const tiles = [];
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) tiles.push([i, j]);
  // توزيع ثابت وعشوائي الشكل
  tiles.sort((a, b) => hash(seed + a) - hash(seed + b));

  const placed = sessions.map((s, k) => ({ s, tile: tiles[k] }))
    .sort((a, b) => (a.tile[0] + a.tile[1]) - (b.tile[0] + b.tile[1]) || a.tile[0] - b.tile[0]);

  const W = n * TW, top = 90;
  const cx = W / 2 + 20;
  const pt = (i, j) => [cx + (i - j) * TW / 2, top + (i + j) * TH / 2];
  const [ax, ay] = pt(0, 0), [bx, by] = pt(n, 0), [ccx, ccy] = pt(n, n), [dx, dy] = pt(0, n);

  let grid = '';
  for (let k = 1; k < n; k++) {
    const [x1, y1] = pt(k, 0), [x2, y2] = pt(k, n), [x3, y3] = pt(0, k), [x4, y4] = pt(n, k);
    grid += `<path d="M${x1} ${y1}L${x2} ${y2}M${x3} ${y3}L${x4} ${y4}"/>`;
  }

  // بعض الزينة على الأرض الفاضية
  let deco = '';
  tiles.slice(sessions.length).forEach(([i, j], k) => {
    if (hash(seed + 'd' + k) % 5) return;
    const [x, y] = pt(i + 0.5, j + 0.5);
    deco += hash(seed + k) % 2
      ? `<path d="M${x - 5} ${y} q2 -7 4 0 q2 -8 4 0 q2 -6 3 0" fill="#5cae4f"/>`
      : `<ellipse cx="${x}" cy="${y}" rx="4" ry="2.4" fill="#b9b3a3"/>`;
  });

  const scale = 0.62;
  const trees = placed.map(({ s, tile: [i, j] }) => {
    const [x, y] = pt(i + 0.5, j + 0.5);
    return `<g transform="translate(${x - 50 * scale} ${y - 110 * scale + 4}) scale(${scale})">
      <ellipse cx="50" cy="110" rx="20" ry="6" fill="#00000026"/>${treeMarkup(s.tree, 1, s.status === 'dead')}</g>`;
  }).join('');

  // شجرة تتكلم
  let bubble = '';
  const alive = placed.filter(p => p.s.status === 'done');
  if (talk && alive.length) {
    const p = alive[hash(seed) % alive.length];
    const [x, y] = pt(p.tile[0] + 0.5, p.tile[1] + 0.5);
    bubble = `<g class="bubble" transform="translate(${x} ${y - 82})">
      <rect x="-62" y="-26" width="124" height="28" rx="14" fill="#fff"/>
      <path d="M-6 1 L0 10 L6 1Z" fill="#fff"/>
      <text x="0" y="-7" text-anchor="middle">ركّز، لا أذبل! 🥺</text></g>`;
  }

  const H = top + n * TH + DEPTH + 30;
  return `<svg class="island" viewBox="0 0 ${W + 40} ${H}" role="img" aria-label="غابتك: ${sessions.length} شجرة">
    <ellipse cx="${cx}" cy="${ccy + DEPTH + 8}" rx="${W * 0.42}" ry="12" fill="#0d3b2a22"/>
    <path d="M${dx} ${dy} L${ccx} ${ccy} L${ccx} ${ccy + DEPTH} L${dx} ${dy + DEPTH}Z" fill="#9b6a45"/>
    <path d="M${ccx} ${ccy} L${bx} ${by} L${bx} ${by + DEPTH} L${ccx} ${ccy + DEPTH}Z" fill="#7d5235"/>
    <path d="M${dx} ${dy + 7} L${ccx} ${ccy + 7} L${bx} ${by + 7}" stroke="#4f9a40" stroke-width="7" fill="none" stroke-linejoin="round"/>
    <path d="M${ax} ${ay} L${bx} ${by} L${ccx} ${ccy} L${dx} ${dy}Z" fill="#8fd16f"/>
    <g stroke="#7cc25f" stroke-width="1">${grid}</g>
    ${deco}${trees}${bubble}
  </svg>`;
}
