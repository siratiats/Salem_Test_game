// أنواع النباتات ورسمها كـ SVG
// كل شجرة مرسومة في مساحة 100×120 وقاعدتها عند النقطة (50, 110)

export const SPECIES = [
  { id: 'oak', name: 'شجرة', price: 0, desc: 'أول شجرة في غابتك. بسيطة وثابتة.',
    c: { l1: '#4caf50', l2: '#2e8b45', l3: '#8fd88a', t: '#7a4b2c' } },
  { id: 'cactus', name: 'صبّار', price: 0, desc: 'صبور مثلك. يتحمل أطول جلسة.',
    c: { l1: '#5fb36a', l2: '#3f8f50', l3: '#9be0a0', t: '#f06292' } },
  { id: 'palm', name: 'نخلة', price: 300, desc: 'عمّة الشجر. كل جلسة تمرة.',
    c: { l1: '#3e9b4f', l2: '#2c7a3d', l3: '#e09a2d', t: '#9a6a3c' } },
  { id: 'sidr', name: 'سدر', price: 400, desc: 'ظلها واسع وثمرها النبق.',
    c: { l1: '#5aa04a', l2: '#3f7f35', l3: '#f2c94c', t: '#6d4a2f' } },
  { id: 'ghaf', name: 'غاف', price: 500, desc: 'شجرة الصحراء الوطنية. أغصانها تتدلى بهدوء.',
    c: { l1: '#7bb661', l2: '#5a9447', l3: '#b6dc8f', t: '#6b4a33' } },
  { id: 'talh', name: 'طلح', price: 600, desc: 'مظلة خضراء فوق الرمل.',
    c: { l1: '#6aa84f', l2: '#4c8a39', l3: '#f6e27a', t: '#5e4030' } },
  { id: 'arak', name: 'أراك', price: 700, desc: 'شجيرة المسواك، ثمرها الكباث.',
    c: { l1: '#4f9d5c', l2: '#367a45', l3: '#a03a6a', t: '#6d4a2f' } },
  { id: 'rose', name: 'ورد طائفي', price: 900, desc: 'ريحتها تكمّل جلسة صافية.',
    c: { l1: '#4b9a55', l2: '#357a40', l3: '#ec6f9b', t: '#5a7a3a' } },
  { id: 'nuwair', name: 'نوير', price: 1000, desc: 'زهر الربيع اللي يطلع بعد المطر.',
    c: { l1: '#6fbf5a', l2: '#4f9a40', l3: '#ffd23f', t: '#4f9a40' } },
  { id: 'pine', name: 'صنوبر', price: 800, desc: 'يرتفع طبقة فوق طبقة.',
    c: { l1: '#2f8f5b', l2: '#226e45', l3: '#4fb47c', t: '#6b4528' } },
  { id: 'sakura', name: 'كرز', price: 1200, desc: 'زهر وردي يحتفل بتركيزك.',
    c: { l1: '#f7a8c4', l2: '#ec86ac', l3: '#ffd6e5', t: '#6e4636' } },
];

export const byId = id => SPECIES.find(s => s.id === id) || SPECIES[0];

const DEAD = { l1: '#b49a6c', l2: '#93795a', l3: '#cdb88f', t: '#6d5a48' };

const body = {
  oak: c => `
    <rect x="46" y="68" width="8" height="42" rx="3" fill="${c.t}"/>
    <circle cx="36" cy="62" r="16" fill="${c.l2}"/>
    <circle cx="64" cy="62" r="16" fill="${c.l2}"/>
    <circle cx="50" cy="50" r="24" fill="${c.l1}"/>
    <circle cx="42" cy="42" r="9" fill="${c.l3}" opacity=".7"/>`,

  pine: c => `
    <rect x="47" y="90" width="6" height="20" rx="2" fill="${c.t}"/>
    <polygon points="50,52 84,96 16,96" fill="${c.l2}"/>
    <polygon points="50,34 76,74 24,74" fill="${c.l1}"/>
    <polygon points="50,16 68,52 32,52" fill="${c.l3}"/>`,

  palm: c => `
    <path d="M50 110 Q44 80 50 44" stroke="${c.t}" stroke-width="8" fill="none" stroke-linecap="round"/>
    ${[100, 90, 80, 70, 60, 52].map(y => `<path d="M${44 + (110 - y) / 30} ${y} h10" stroke="#00000022" stroke-width="2"/>`).join('')}
    <path d="M50 44 Q28 26 8 44 Q30 36 50 48Z" fill="${c.l2}"/>
    <path d="M50 44 Q72 26 92 44 Q70 36 50 48Z" fill="${c.l2}"/>
    <path d="M50 42 Q34 14 16 20 Q36 24 50 46Z" fill="${c.l1}"/>
    <path d="M50 42 Q66 14 84 20 Q64 24 50 46Z" fill="${c.l1}"/>
    <path d="M50 42 Q48 18 52 8 Q56 24 52 44Z" fill="${c.l1}"/>
    <circle cx="44" cy="52" r="3.4" fill="${c.l3}"/><circle cx="48" cy="55" r="3.4" fill="${c.l3}"/>
    <circle cx="55" cy="53" r="3.4" fill="${c.l3}"/>`,

  sidr: c => `
    <path d="M50 110 Q46 88 52 72 Q56 62 48 56" stroke="${c.t}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M50 76 Q62 70 68 60" stroke="${c.t}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="52" rx="40" ry="20" fill="${c.l2}"/>
    <circle cx="30" cy="46" r="13" fill="${c.l1}"/><circle cx="52" cy="38" r="16" fill="${c.l1}"/>
    <circle cx="72" cy="46" r="12" fill="${c.l1}"/>
    ${[[28, 54], [44, 46], [62, 40], [74, 54], [52, 58], [36, 38]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="${c.l3}"/>`).join('')}`,

  ghaf: c => `
    <path d="M50 110 Q48 84 50 60" stroke="${c.t}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="48" rx="36" ry="24" fill="${c.l2}"/>
    <ellipse cx="50" cy="42" rx="30" ry="18" fill="${c.l1}"/>
    ${[18, 26, 34, 42, 58, 66, 74, 82].map((x, i) => `<path d="M${x} ${52 + (i % 2) * 4} q2 ${14 + (i % 3) * 5} -1 ${22 + (i % 3) * 4}" stroke="${c.l2}" stroke-width="4" fill="none" stroke-linecap="round"/>`).join('')}
    <ellipse cx="42" cy="34" rx="10" ry="5" fill="${c.l3}" opacity=".8"/>`,

  talh: c => `
    <path d="M50 110 L50 74 L34 50 M50 74 L66 48 M50 84 L42 66" stroke="${c.t}" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="50" cy="48" rx="44" ry="11" fill="${c.l2}"/>
    <ellipse cx="50" cy="42" rx="38" ry="10" fill="${c.l1}"/>
    <ellipse cx="44" cy="38" rx="20" ry="5" fill="${c.l3}" opacity=".55"/>`,

  arak: c => `
    <path d="M50 110 Q48 96 40 88 M50 110 Q54 94 62 86" stroke="${c.t}" stroke-width="5" fill="none" stroke-linecap="round"/>
    <circle cx="32" cy="88" r="16" fill="${c.l2}"/><circle cx="68" cy="88" r="16" fill="${c.l2}"/>
    <circle cx="50" cy="76" r="20" fill="${c.l1}"/><circle cx="34" cy="78" r="11" fill="${c.l1}"/>
    <circle cx="66" cy="78" r="11" fill="${c.l1}"/>
    ${[[40, 72], [44, 76], [60, 70], [64, 74], [52, 86], [28, 90], [72, 92]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.8" fill="${c.l3}"/>`).join('')}`,

  rose: c => `
    <path d="M50 110 V70 M50 92 Q36 84 34 70 M50 86 Q64 80 66 64" stroke="${c.t}" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    ${[[42, 94, -30], [58, 90, 30], [40, 78, -20], [60, 74, 20], [48, 64, 0]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="8" ry="4" fill="${c.l1}" transform="rotate(${r} ${x} ${y})"/>`).join('')}
    ${[[50, 62, 10], [34, 66, 8], [66, 60, 8]].map(([x, y, r]) => `
      <circle cx="${x}" cy="${y}" r="${r}" fill="${c.l3}"/>
      <circle cx="${x}" cy="${y}" r="${r * .55}" fill="#00000022"/>
      <circle cx="${x - r * .2}" cy="${y - r * .2}" r="${r * .3}" fill="#ffffff55"/>`).join('')}`,

  nuwair: c => `
    ${[[30, 0], [42, 0], [56, 0], [70, 0]].map(([x], i) => `<path d="M${x} 110 q${i % 2 ? 4 : -4} -18 ${i % 2 ? 2 : -2} -${30 + i * 6}" stroke="${c.l2}" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
    <path d="M20 110 q6 -12 12 0 q6 -14 12 0 q6 -10 12 0 q6 -14 12 0 q6 -12 12 0Z" fill="${c.l1}"/>
    ${[[28, 80, '#ffd23f'], [44, 70, '#c78bff'], [58, 74, '#ffd23f'], [72, 62, '#ffffff'], [36, 92, '#ff9f68']].map(([x, y, col]) =>
      [0, 72, 144, 216, 288].map(a => `<ellipse cx="${x}" cy="${y - 4}" rx="2.8" ry="4.5" fill="${col}" transform="rotate(${a} ${x} ${y})"/>`).join('') +
      `<circle cx="${x}" cy="${y}" r="2.4" fill="#e07b00"/>`).join('')}`,

  cactus: c => `
    <rect x="40" y="36" width="20" height="74" rx="10" fill="${c.l1}"/>
    <path d="M42 76 H30 Q24 76 24 70 V56" stroke="${c.l1}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M58 66 H70 Q76 66 76 60 V48" stroke="${c.l1}" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M50 42 V106" stroke="${c.l2}" stroke-width="2"/>
    <path d="M45 46 V104 M55 46 V104" stroke="${c.l3}" stroke-width="1.5" opacity=".7"/>
    <circle cx="50" cy="34" r="6" fill="${c.t}"/><circle cx="50" cy="34" r="2.4" fill="#ffd23f"/>`,

  sakura: c => `
    <path d="M50 110 Q48 88 50 70 M50 80 Q38 72 32 62 M50 76 Q62 68 68 58" stroke="${c.t}" stroke-width="6" fill="none" stroke-linecap="round"/>
    <circle cx="34" cy="60" r="16" fill="${c.l2}"/><circle cx="66" cy="58" r="16" fill="${c.l2}"/>
    <circle cx="50" cy="46" r="22" fill="${c.l1}"/>
    ${[[38, 44], [56, 38], [64, 54], [44, 58], [30, 62], [52, 50]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3" fill="${c.l3}"/>`).join('')}`,
};

// شتلة صغيرة بورقتين (أول مراحل النمو)
const sprout = (c, k) => `
  <g transform="translate(50 110) scale(${k}) translate(-50 -110)">
    <path d="M50 110 V86" stroke="${c.l2}" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M50 92 Q36 92 30 80 Q44 78 50 92Z" fill="${c.l1}"/>
    <path d="M50 88 Q64 88 70 74 Q56 72 50 88Z" fill="${c.l1}"/>
  </g>`;

const seed = c => `
  <ellipse cx="50" cy="108" rx="9" ry="4" fill="#8a5a3b"/>
  <ellipse cx="50" cy="104" rx="4" ry="3" fill="#a0703c"/>
  <path d="M50 102 q2 -5 5 -6" stroke="${c.l1}" stroke-width="2" fill="none" stroke-linecap="round"/>`;

/** محتوى الشجرة (بدون وسم svg) حسب نسبة النمو من 0 إلى 1 */
export function treeMarkup(id, progress = 1, dead = false) {
  const sp = byId(id);
  const c = dead ? { ...DEAD, l3: sp.id === 'palm' || sp.id === 'sidr' ? DEAD.l2 : DEAD.l3 } : sp.c;
  const p = Math.max(0, Math.min(1, progress));
  let inner;
  if (p < 0.08) inner = seed(c);
  else if (p < 0.25) inner = sprout(c, 0.6 + (p - 0.08) / 0.17 * 0.6);
  else {
    const s = 0.45 + 0.55 * ((p - 0.25) / 0.75);
    inner = `<g transform="translate(50 110) scale(${s.toFixed(3)}) translate(-50 -110)">${body[sp.id](c)}</g>`;
  }
  if (dead) inner = `<g transform="rotate(-6 50 110)" opacity=".92">${inner}</g>`;
  return inner;
}

export function treeSVG(id, progress = 1, dead = false, cls = '') {
  return `<svg class="${cls}" viewBox="0 0 100 120" aria-hidden="true">${treeMarkup(id, progress, dead)}</svg>`;
}
