#!/usr/bin/env node
/**
 * Génère les illustrations SVG originales de l'appli dans /art.
 * Style : silhouettes sombres, palmiers magenta, plage sable, ciel d'orage
 * (inspiré de l'ambiance du jeu, sans reprendre aucun visuel de l'éditeur).
 *
 * Contraintes volontaires (pour la conversion VectorDrawable Android) :
 *  - uniquement path / rect / circle / ellipse / g, dégradés en userSpaceOnUse
 *  - pas de dasharray, pas de filtres, pas de clipPath
 *
 * Usage : node tools/make-art.js
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'art');
fs.mkdirSync(OUT, { recursive: true });

// ───────────────────────── utilitaires ─────────────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const f = (n) => Math.round(n * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;

class Svg {
  constructor(name, w, h) {
    this.name = name;
    this.w = w;
    this.h = h;
    this.p = name.replace(/_/g, '') + '_';
    this.defs = [];
    this.body = [];
  }
  stops(list) {
    return list
      .map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined ? ` stop-opacity="${a}"` : ''}/>`)
      .join('');
  }
  lin(key, x1, y1, x2, y2, stops) {
    const id = this.p + key;
    this.defs.push(
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${this.stops(stops)}</linearGradient>`
    );
    return `url(#${id})`;
  }
  rad(key, cx, cy, r, stops) {
    const id = this.p + key;
    this.defs.push(
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${this.stops(stops)}</radialGradient>`
    );
    return `url(#${id})`;
  }
  add(...s) {
    this.body.push(...s);
    return this;
  }
  toString() {
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${this.w} ${this.h}" width="${this.w}" height="${this.h}">` +
      (this.defs.length ? `<defs>${this.defs.join('')}</defs>` : '') +
      this.body.join('') +
      `</svg>\n`
    );
  }
  save() {
    fs.writeFileSync(path.join(OUT, this.name + '.svg'), this.toString());
    console.log('art/' + this.name + '.svg', (this.toString().length / 1024).toFixed(1) + ' kB');
  }
}

const attrs = (o = {}) =>
  Object.entries(o)
    .map(([k, v]) => ` ${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}="${v}"`)
    .join('');
const rect = (x, y, w, h, fill, o) => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" fill="${fill}"${attrs(o)}/>`;
const circle = (cx, cy, r, fill, o) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${attrs(o)}/>`;
const ellipse = (cx, cy, rx, ry, fill, o) =>
  `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${attrs(o)}/>`;
const pth = (d, fill, o) => `<path d="${d}" fill="${fill}"${attrs(o)}/>`;
const line = (d, stroke, w, o) =>
  `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${attrs(o)}/>`;
const group = (transform, ...kids) => `<g transform="${transform}">${kids.join('')}</g>`;

// ───────────────────────── formes de décor ─────────────────────────
/** Palme : lame courbe qui retombe. ang en degrés (0 = droite, -90 = haut). */
function frond(tx, ty, angDeg, L, wd, color) {
  const a = rad(angDeg);
  const dx = Math.cos(a);
  const dy = Math.sin(a);
  const nx = -dy;
  const ny = dx;
  const ex = tx + dx * L;
  const ey = ty + dy * L + L * 0.42;
  const cx = tx + dx * L * 0.5;
  const cy = ty + dy * L * 0.5 - L * 0.28;
  const u = [cx - nx * wd * 0.5, cy - ny * wd * 0.5];
  const l = [cx + nx * wd * 0.5, cy + ny * wd * 0.5];
  return pth(`M${f(tx)} ${f(ty)}Q${f(u[0])} ${f(u[1])} ${f(ex)} ${f(ey)}Q${f(l[0])} ${f(l[1])} ${f(tx)} ${f(ty)}Z`, color);
}

/** Palmier : tronc effilé + couronne. (x,y) = pied, lean = décalage horizontal du sommet. */
function palm(x, y, h, lean, L, color, rnd, opts = {}) {
  const w = opts.trunk ?? Math.max(2.5, h * 0.045);
  const tx = x + lean;
  const ty = y - h;
  const out = [];
  const bend = opts.bend ?? lean * 0.15;
  out.push(
    pth(
      `M${f(x - w)} ${f(y)}Q${f(x + lean * 0.1 - w * 0.6 + bend)} ${f(y - h * 0.5)} ${f(tx - w * 0.45)} ${f(ty)}` +
        `L${f(tx + w * 0.45)} ${f(ty)}Q${f(x + lean * 0.1 + w * 0.6 + bend)} ${f(y - h * 0.5)} ${f(x + w)} ${f(y)}Z`,
      color
    )
  );
  const angles = [-178, -152, -126, -100, -76, -52, -28, -4, 14, 166];
  for (const a of angles) {
    const len = L * (0.8 + rnd() * 0.4) * (a > 0 && a < 90 ? 0.8 : a > 90 ? 0.8 : 1);
    out.push(frond(tx, ty, a + (rnd() - 0.5) * 14, len, L * 0.2, color));
  }
  out.push(circle(tx - 3, ty + 5, w * 0.9 + 1, color), circle(tx + 4, ty + 6, w * 0.9 + 1, color));
  return out.join('');
}

/** Buisson : grappe de cercles. */
function bush(x0, x1, y, rMin, rMax, color, rnd, step = 14) {
  const out = [];
  for (let x = x0; x <= x1; x += step * (0.6 + rnd() * 0.8)) {
    const r = rMin + rnd() * (rMax - rMin);
    out.push(circle(x, y - r * 0.35 + (rnd() - 0.5) * 6, r, color));
  }
  return out.join('');
}

/** Échantillonne une courbe de Bézier cubique. */
function bez(p0, p1, p2, p3, t) {
  const m = 1 - t;
  return [
    m * m * m * p0[0] + 3 * m * m * t * p1[0] + 3 * m * t * t * p2[0] + t * t * t * p3[0],
    m * m * m * p0[1] + 3 * m * m * t * p1[1] + 3 * m * t * t * p2[1] + t * t * t * p3[1],
  ];
}

const stars = (svg, rnd, n, maxY) =>
  Array.from({ length: n }, () => circle(rnd() * svg.w, rnd() * maxY, 0.5 + rnd() * 1.1, '#fff', { opacity: f(0.25 + rnd() * 0.6) })).join('');

// ═════════════════════════ SCÈNE JUNGLE (fond) ═════════════════════════
(function jungleBg() {
  const s = new Svg('scene_jungle_bg', 360, 800);
  const r = rng(7);
  const sky = s.lin('sky', 0, 0, 0, 560, [
    [0, '#150b2e'],
    [0.35, '#4a2068'],
    [0.66, '#b23a7c'],
    [0.88, '#f08a5d'],
    [1, '#f9c97a'],
  ]);
  s.add(rect(0, 0, 360, 800, sky));
  s.add(stars(s, r, 46, 230));

  // orage jaune-vert à droite (clin d'œil à la boîte), nuages sombres à gauche
  const glow = s.rad('glow', 255, 410, 210, [
    [0, '#fff0b0', 0.95],
    [0.3, '#ffc56e', 0.55],
    [1, '#ff8a5d', 0],
  ]);
  s.add(circle(255, 410, 210, glow));
  s.add(circle(255, 410, 34, '#fff2c0', { opacity: 0.95 }));
  s.add(ellipse(300, 300, 90, 22, '#c9b95a', { opacity: 0.28 }), ellipse(325, 285, 60, 16, '#d6c768', { opacity: 0.25 }));
  s.add(
    ellipse(60, 170, 110, 26, '#2a1245', { opacity: 0.75 }),
    ellipse(100, 150, 80, 22, '#34175a', { opacity: 0.7 }),
    ellipse(20, 230, 90, 18, '#3a1a5c', { opacity: 0.6 }),
    ellipse(230, 120, 70, 14, '#2a1245', { opacity: 0.55 })
  );

  // collines lointaines
  s.add(pth('M0 470Q60 405 135 448T250 438T360 425L360 600L0 600Z', '#6a2a72'));
  for (let i = 0; i < 8; i++) {
    const x = 10 + i * 48 + r() * 20;
    s.add(palm(x, 462 + r() * 14, 52 + r() * 36, (r() - 0.5) * 22, 30, '#4f1d66', r));
  }
  // ligne de jungle moyenne
  s.add(pth('M0 505Q80 470 150 498T290 490T360 480L360 620L0 620Z', '#3b1752'));
  s.add(bush(-10, 370, 520, 14, 26, '#33134a', r));
  for (const [x, h, lean] of [
    [70, 150, 18],
    [148, 125, -16],
    [250, 160, -20],
    [322, 130, 14],
  ]) {
    s.add(palm(x, 530, h, lean, 54, '#2a0f3d', r));
  }
  // grandes feuilles de sous-bois (jungle dense) : une rangée magenta, une rangée sombre
  for (let i = 0; i < 12; i++) {
    const x = 5 + i * 31 + r() * 14;
    s.add(frond(x, 566, -90 + (r() - 0.5) * 120, 44 + r() * 26, 15, '#5a2272'));
  }
  for (let i = 0; i < 11; i++) {
    const x = 15 + i * 33 + r() * 14;
    s.add(frond(x, 584, -90 + (r() - 0.5) * 130, 40 + r() * 24, 14, '#2a0f3d'));
  }
  // lucioles
  for (let i = 0; i < 16; i++) {
    const x = 20 + r() * 320;
    const y = 400 + r() * 190;
    s.add(circle(x, y, 7, '#ffe27a', { opacity: 0.12 }), circle(x, y, 1.8, '#fff0a0', { opacity: 0.9 }));
  }
  // lisière sombre
  s.add(pth('M0 585Q60 560 130 580T260 572T360 566L360 650L0 650Z', '#1d0b2b'));
  s.add(bush(-10, 370, 596, 14, 24, '#1d0b2b', r, 12));
  // fougères de la lisière
  for (const x of [28, 96, 205, 290, 340]) {
    s.add(frond(x, 600, -125, 32, 7, '#241035'), frond(x, 600, -90, 36, 7, '#241035'), frond(x, 600, -55, 32, 7, '#241035'));
  }

  // plage
  const sand = s.lin('sand', 0, 600, 0, 800, [
    [0, '#f4d28f'],
    [0.45, '#dfa55e'],
    [1, '#9c6636'],
  ]);
  s.add(pth('M0 618Q70 598 150 612T290 606T360 600L360 800L0 800Z', sand));
  s.add(
    ellipse(80, 660, 70, 8, '#ffe6ad', { opacity: 0.35 }),
    ellipse(250, 690, 90, 9, '#ffe6ad', { opacity: 0.28 }),
    ellipse(160, 735, 120, 10, '#7a4a25', { opacity: 0.25 })
  );
  // troncs échoués à la lisière
  const log = (x, y, w, rot) =>
    group(
      `rotate(${rot} ${x} ${y})`,
      rect(x - w / 2, y - 7, w, 14, '#6b3f1d', { rx: 7 }),
      rect(x - w / 2 + 4, y - 5, w - 8, 4, '#8a5527', { rx: 2, opacity: 0.7 }),
      ellipse(x + w / 2 - 3, y, 4, 6.5, '#c48a4c', { stroke: '#4a2a12', strokeWidth: 1.5 })
    );
  s.add(log(70, 640, 76, -6), log(105, 654, 60, 4), log(292, 648, 70, 8));
  s.save();
})();

// ═════════════════════════ SCÈNE JUNGLE (premier plan) ═════════════════════════
(function jungleFg() {
  const s = new Svg('scene_jungle_fg', 360, 800);
  const r = rng(21);
  const dark = '#10051a';
  // gros palmiers cadrant la scène
  s.add(palm(-6, 760, 640, 92, 150, dark, r, { trunk: 15, bend: -34 }));
  s.add(palm(372, 720, 590, -88, 140, dark, r, { trunk: 14, bend: 30 }));
  // grandes feuilles qui pendent du haut
  for (const [x, a, L] of [
    [18, -40, 90],
    [340, -140, 90],
    [120, -62, 60],
    [250, -118, 56],
  ]) {
    s.add(frond(x, -6, a + 90, L, 20, dark));
  }
  // lianes
  for (const [x, len, sw] of [
    [62, 130, 2.5],
    [96, 90, 2],
    [268, 110, 2.5],
    [300, 150, 2],
  ]) {
    s.add(line(`M${x} -4Q${x + 8} ${len * 0.5} ${x - 4} ${len}`, dark, sw));
  }
  // herbes en bas des coins
  for (const x of [8, 30, 330, 352]) {
    s.add(frond(x, 800, -105, 60, 12, dark), frond(x, 800, -75, 66, 12, dark), frond(x, 800, -135, 50, 10, dark));
  }
  s.save();
})();

// ═════════════════════════ SCÈNE MER (fond) ═════════════════════════
(function seaBg() {
  const s = new Svg('scene_sea_bg', 360, 800);
  const r = rng(33);
  const sky = s.lin('sky', 0, 0, 0, 410, [
    [0, '#1a1048'],
    [0.38, '#6a2b86'],
    [0.7, '#d9507c'],
    [0.9, '#ff9f60'],
    [1, '#ffd68a'],
  ]);
  s.add(rect(0, 0, 360, 800, sky));
  s.add(stars(s, r, 40, 200));
  const glow = s.rad('glow', 180, 410, 230, [
    [0, '#fff0b0', 0.95],
    [0.3, '#ffc56e', 0.5],
    [1, '#ff8a5d', 0],
  ]);
  s.add(circle(180, 410, 230, glow));
  s.add(circle(180, 405, 46, '#fff3c4'));
  s.add(
    ellipse(290, 150, 100, 22, '#2d1450', { opacity: 0.7 }),
    ellipse(320, 130, 70, 16, '#3a1a5e', { opacity: 0.6 }),
    ellipse(50, 250, 90, 16, '#c9b95a', { opacity: 0.22 }),
    ellipse(70, 110, 80, 14, '#4a2068', { opacity: 0.55 })
  );
  // mer
  const sea = s.lin('sea', 0, 408, 0, 690, [
    [0, '#f19a73'],
    [0.14, '#c2587f'],
    [0.32, '#2f8a9b'],
    [1, '#073a4e'],
  ]);
  s.add(rect(0, 408, 360, 300, sea));
  // reflet du soleil
  for (let i = 0; i < 9; i++) {
    const y = 412 + i * 17 + i * i * 0.9;
    const w = 40 + i * 14 + r() * 20;
    s.add(rect(180 - w / 2 + (r() - 0.5) * 10, y, w, 3 + i * 0.35, '#ffe9a0', { rx: 2, opacity: f(0.75 - i * 0.07) }));
  }
  // île lointaine + petit radeau
  s.add(pth('M-4 410Q20 388 52 396Q80 380 112 410Z', '#3a1650', { opacity: 0.9 }));
  s.add(palm(60, 398, 30, 5, 15, '#3a1650', r), palm(86, 402, 24, -4, 13, '#3a1650', r));
  s.add(
    rect(262, 428, 34, 4, '#2a1245'),
    line('M279 428L279 408', '#2a1245', 2),
    pth('M279 410L292 424L279 424Z', '#2a1245')
  );
  // vagues
  const wave = (y, amp, a) => {
    let d = `M-10 ${y}`;
    for (let x = -10; x < 380; x += 40) d += `q10 ${-amp} 20 0t20 0`;
    return line(d, '#fff', 1.6, { opacity: a });
  };
  for (let i = 0; i < 9; i++) s.add(group(`translate(${f((r() - 0.5) * 30)} ${f(448 + i * 24 + i * i * 1.2)})`, wave(0, 4 + i * 0.5, f(0.1 + i * 0.03))));
  // plage
  const sand = s.lin('sand', 0, 640, 0, 800, [
    [0, '#f0cf8e'],
    [0.5, '#dba35c'],
    [1, '#9a6535'],
  ]);
  s.add(pth('M0 660Q60 630 140 648T270 640T360 632L360 800L0 800Z', '#b98a55'));
  s.add(pth('M0 678Q70 652 150 668T290 660T360 654L360 800L0 800Z', sand));
  // écume
  s.add(
    line('M-4 658Q60 626 140 644T270 636T364 628', '#fff', 5, { opacity: 0.55 }),
    line('M-4 650Q60 620 140 637T270 629T364 621', '#fff', 2.5, { opacity: 0.4 })
  );
  s.add(ellipse(110, 720, 90, 9, '#ffe6ad', { opacity: 0.3 }), ellipse(260, 752, 100, 10, '#7a4a25', { opacity: 0.25 }));
  // rochers
  for (const [x, y, rx, ry] of [
    [300, 690, 34, 20],
    [334, 702, 22, 14],
    [40, 700, 26, 15],
  ]) {
    s.add(ellipse(x, y, rx, ry, '#3a1a4c'), ellipse(x - rx * 0.25, y - ry * 0.35, rx * 0.5, ry * 0.4, '#5a2f70', { opacity: 0.8 }));
  }
  s.save();
})();

// ═════════════════════════ SCÈNE MER (premier plan) ═════════════════════════
(function seaFg() {
  const s = new Svg('scene_sea_fg', 360, 800);
  const r = rng(45);
  const dark = '#10051a';
  s.add(palm(-10, 780, 600, 110, 150, dark, r, { trunk: 15, bend: -30 }));
  for (const [x, a, L] of [
    [350, -150, 100],
    [300, -125, 70],
    [200, -80, 40],
  ]) {
    s.add(frond(x, -6, a + 90, L, 22, dark));
  }
  for (const [x, len] of [
    [300, 110],
    [330, 70],
  ]) {
    s.add(line(`M${x} -4Q${x + 8} ${len * 0.5} ${x - 4} ${len}`, dark, 2.2));
  }
  for (const x of [340, 358]) s.add(frond(x, 800, -100, 56, 12, dark), frond(x, 800, -130, 46, 10, dark));
  s.save();
})();

// ═════════════════════════ OBJETS ═════════════════════════
(function plank() {
  const s = new Svg('plank', 140, 46);
  s.add(rect(3, 3, 134, 40, '#c78a4a', { rx: 6, stroke: '#5e3515', strokeWidth: 3 }));
  s.add(rect(7, 6, 126, 10, '#e5ad6c', { rx: 4, opacity: 0.65 }));
  s.add(
    line('M14 23Q50 19 90 25T130 23', '#8a5527', 1.8, { opacity: 0.85 }),
    line('M10 33Q40 37 80 32T128 35', '#8a5527', 1.8, { opacity: 0.85 }),
    ellipse(98, 21, 6, 3.4, 'none', { stroke: '#8a5527', strokeWidth: 1.6 })
  );
  for (const [x, y] of [
    [14, 14],
    [126, 14],
    [14, 34],
    [126, 34],
  ])
    s.add(circle(x, y, 2.6, '#3b2412'), circle(x - 0.7, y - 0.7, 0.9, '#a98a6a'));
  s.save();
})();

(function fish() {
  const s = new Svg('fish', 110, 64);
  const line1 = '#7a2a10';
  s.add(pth('M24 32L4 9Q13 32 4 55Z', '#e8662f', { stroke: line1, strokeWidth: 3, strokeLinejoin: 'round' }));
  s.add(pth('M44 16Q58 -1 76 13Q60 12 44 16Z', '#e8662f', { stroke: line1, strokeWidth: 2.5, strokeLinejoin: 'round' }));
  s.add(pth('M44 50Q54 62 68 52Q56 50 44 50Z', '#e8662f', { stroke: line1, strokeWidth: 2.5, strokeLinejoin: 'round' }));
  s.add(pth('M20 32Q40 4 76 12Q104 20 106 32Q104 46 76 54Q40 60 20 32Z', '#ff8a4c', { stroke: line1, strokeWidth: 3 }));
  s.add(pth('M32 37Q62 53 100 38Q104 44 76 52Q46 56 32 37Z', '#ffd8b0', { opacity: 0.92 }));
  s.add(
    line('M52 17Q58 32 52 49', line1, 2.4, { opacity: 0.45 }),
    line('M62 14Q68 32 62 52', line1, 2.4, { opacity: 0.45 }),
    line('M72 22Q66 32 72 45', line1, 2.6),
    line('M105 33Q100 36 96 34', line1, 2.2)
  );
  s.add(circle(89, 27, 6.5, '#fff', { stroke: line1, strokeWidth: 2 }), circle(91, 27.5, 3.2, '#1b0b2e'), circle(92.2, 26.3, 1.1, '#fff'));
  s.save();
})();

(function snake() {
  const s = new Svg('snake', 190, 210);
  const P = [
    [34, 192],
    [0, 150],
    [66, 128],
    [104, 142],
  ];
  const Q = [
    [104, 142],
    [156, 156],
    [168, 104],
    [118, 92],
  ];
  const R = [
    [118, 92],
    [66, 82],
    [52, 48],
    [100, 40],
  ];
  const d = `M${P[0]}C${P[1]} ${P[2]} ${P[3]}C${Q[1]} ${Q[2]} ${Q[3]}C${R[1]} ${R[2]} ${R[3]}`;
  s.add(line(d, '#17401f', 30));
  s.add(line(d, '#58c24d', 21));
  s.add(line(d, '#9be072', 6, { opacity: 0.55 }));
  // taches
  for (const seg of [P, Q, R]) {
    for (let t = 0.14; t < 1; t += 0.2) {
      const [x, y] = bez(seg[0], seg[1], seg[2], seg[3], t);
      s.add(circle(x, y, 4.4, '#2c7a35'));
    }
  }
  // tête orientée selon la tangente de fin
  const ang = (Math.atan2(R[3][1] - R[2][1], R[3][0] - R[2][0]) * 180) / Math.PI;
  const head = [
    // langue fourchue
    line('M24 0L46 0M46 0L56 -6M46 0L56 6', '#e0243a', 3),
    pth('M-10 -15Q14 -22 30 -6Q34 0 30 6Q14 22 -10 15Q-16 0 -10 -15Z', '#58c24d', { stroke: '#17401f', strokeWidth: 3 }),
    pth('M20 -2L24 6L28 -2Z', '#fff'),
    circle(6, -9, 5.5, '#ffe14a', { stroke: '#17401f', strokeWidth: 1.5 }),
    circle(6, 9, 5.5, '#ffe14a', { stroke: '#17401f', strokeWidth: 1.5 }),
    ellipse(6.5, -9, 1.6, 4.2, '#1b0b2e'),
    ellipse(6.5, 9, 1.6, 4.2, '#1b0b2e'),
    circle(25, -4, 1.2, '#17401f'),
    circle(25, 4, 1.2, '#17401f'),
  ].join('');
  s.add(group(`translate(${R[3][0]} ${R[3][1]}) rotate(${f(ang)})`, head));
  s.save();
})();

(function axe() {
  const s = new Svg('axe', 64, 64);
  s.add(line('M14 56L42 14', '#5e3515', 8));
  s.add(line('M14 56L42 14', '#b27a40', 4.5));
  s.add(pth('M30 10Q46 2 58 14Q62 26 54 38L42 28Q44 20 36 18Z', '#d3dce8', { stroke: '#3b4558', strokeWidth: 3, strokeLinejoin: 'round' }));
  s.add(line('M50 14Q56 24 51 33', '#fff', 2, { opacity: 0.8 }));
  s.save();
})();

(function rod() {
  const s = new Svg('rod', 64, 64);
  s.add(line('M8 58Q30 38 54 8', '#5e3515', 5));
  s.add(line('M8 58Q30 38 54 8', '#b27a40', 2.4));
  s.add(line('M54 8Q62 28 54 46', '#fff', 1.4, { opacity: 0.9 }));
  s.add(line('M54 46Q54 56 47 54', '#c9d3e0', 2.4), circle(54, 44, 3, '#e0243a', { stroke: '#fff', strokeWidth: 1.2 }));
  s.save();
})();

(function float() {
  const s = new Svg('float', 28, 40);
  s.add(line('M14 1V11', '#fff', 2.2));
  s.add(ellipse(14, 26, 12, 14, '#fff'));
  s.add(pth('M2.4 22A12 14 0 0 1 25.6 22Z', '#e0243a'));
  s.add(ellipse(14, 26, 12, 14, 'none', { stroke: '#5a2f70', strokeWidth: 2 }));
  s.save();
})();

(function ripple() {
  // Cercles de pêche/lancer (décor d'animation)
  const s = new Svg('ripple', 120, 40);
  s.add(ellipse(60, 20, 56, 15, 'none', { stroke: '#fff', strokeWidth: 2.5, opacity: 0.8 }));
  s.add(ellipse(60, 20, 34, 9, 'none', { stroke: '#fff', strokeWidth: 2, opacity: 0.8 }));
  s.add(ellipse(60, 20, 14, 4, 'none', { stroke: '#fff', strokeWidth: 1.6, opacity: 0.8 }));
  s.save();
})();
