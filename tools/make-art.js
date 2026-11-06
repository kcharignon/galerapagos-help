#!/usr/bin/env node
/**
 * Génère les illustrations SVG originales de l'appli dans /art.
 * Style relevé sur les scans du jeu : plein jour, très coloré (lagon turquoise, sable pêche, jungle vert vif sur fond sombre,
 * ciel bleu-violet et gros nuages), objets cernés d'un trait noir épais, bois en rondins ficelés.
 * Tout est redessiné ici : aucune image du jeu n'est reprise dans le dépôt.
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

// ───────────────────────── palette (relevée sur les scans) ─────────────────────────
const C = {
  line: '#16181c', // contour noir des objets
  skyTop: '#2f8fe0', skyMid: '#5bb4ee', skyLow: '#a5dcf7', skyHaze: '#e6f7fd',
  cloud: '#ffffff', cloudShade: '#c4d3f2',
  storm: '#3d4160', stormLight: '#5a5f86',
  rock: '#8d9bb5', rockLight: '#b9c6dc', rockShade: '#5c6a86',
  jungleDeep: '#0f4a38', jungleMid: '#1b6a4c',
  leafDark: '#177a38', leafMid: '#2ca848', leafBright: '#55cf55', leafLime: '#9be86a',
  root: '#a39079', rootDark: '#6f5e4b',
  sandTop: '#fdebc4', sandMid: '#f7d3a2', sandLow: '#ebb07a', sandWet: '#e0b088',
  foam: '#ffffff', shallow: '#f3efb8',
  turq: '#3fe0e0', turqLight: '#9bf0e8', lagoon: '#1fb0e0', deep: '#1480d0',
  wood: '#b8672f', woodDark: '#7a3c18', woodLight: '#e39a58', rope: '#ead59f',
};

// ───────────────────────── utilitaires ─────────────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}
const f = (n) => Math.round(n * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;
const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

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
/** Feuille pointue : base (x,y), direction ang (degrés, 0 = droite), longueur len, demi-largeur wid. */
function leaf(x, y, angDeg, len, wid, color, o) {
  const a = rad(angDeg);
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const tx = x + dx * len, ty = y + dy * len;
  const mx = x + dx * len * 0.5, my = y + dy * len * 0.5;
  return pth(
    `M${f(x)} ${f(y)}Q${f(mx + nx * wid)} ${f(my + ny * wid)} ${f(tx)} ${f(ty)}Q${f(mx - nx * wid)} ${f(my - ny * wid)} ${f(x)} ${f(y)}Z`,
    color,
    o
  );
}

/** Palme : lame courbe qui retombe. ang en degrés (0 = droite, -90 = haut). */
function frond(tx, ty, angDeg, L, wd, color) {
  const a = rad(angDeg);
  const dx = Math.cos(a), dy = Math.sin(a), nx = -dy, ny = dx;
  const ex = tx + dx * L, ey = ty + dy * L + L * 0.42;
  const cx = tx + dx * L * 0.5, cy = ty + dy * L * 0.5 - L * 0.28;
  const u = [cx - nx * wd * 0.5, cy - ny * wd * 0.5];
  const l = [cx + nx * wd * 0.5, cy + ny * wd * 0.5];
  return pth(`M${f(tx)} ${f(ty)}Q${f(u[0])} ${f(u[1])} ${f(ex)} ${f(ey)}Q${f(l[0])} ${f(l[1])} ${f(tx)} ${f(ty)}Z`, color);
}

/** Palmier coloré : tronc clair annelé, couronne à deux tons (sous-couche sombre, dessus vif). */
function palm(x, y, h, lean, L, rnd, opts = {}) {
  const w = opts.trunk ?? Math.max(2.5, h * 0.045);
  const tx = x + lean, ty = y - h;
  const bend = opts.bend ?? lean * 0.15;
  const dark = opts.dark ?? C.leafDark, bright = opts.bright ?? C.leafBright, lime = opts.lime ?? C.leafLime;
  const out = [];
  const cxm = x + lean * 0.1 + bend, cym = y - h * 0.5;
  out.push(
    pth(
      `M${f(x - w)} ${f(y)}Q${f(cxm - w * 0.6)} ${f(cym)} ${f(tx - w * 0.45)} ${f(ty)}L${f(tx + w * 0.45)} ${f(ty)}Q${f(cxm + w * 0.6)} ${f(cym)} ${f(x + w)} ${f(y)}Z`,
      opts.trunkColor ?? C.root
    )
  );
  // anneaux du tronc
  if (opts.rings !== false) {
    for (let t = 0.08; t < 0.95; t += 0.09) {
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * cxm + t * t * tx;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * cym + t * t * ty;
      const ww = w * (1 - t * 0.55);
      out.push(line(`M${f(px - ww)} ${f(py)}L${f(px + ww)} ${f(py - 1.5)}`, C.rootDark, Math.max(0.8, w * 0.12), { opacity: 0.55 }));
    }
  }
  const angles = [-178, -152, -126, -100, -76, -52, -28, -4, 14, 166];
  for (const a of angles) out.push(frond(tx, ty, a + (rnd() - 0.5) * 14, L * (0.85 + rnd() * 0.35), L * 0.2, dark));
  for (const a of angles) out.push(frond(tx, ty - 1.5, a + (rnd() - 0.5) * 10 + 4, L * (0.7 + rnd() * 0.3), L * 0.17, bright));
  for (let i = 0; i < 4; i++) out.push(frond(tx, ty - 3, -150 + i * 32 + (rnd() - 0.5) * 12, L * 0.5, L * 0.1, lime));
  out.push(circle(tx - 3, ty + 5, w * 0.9 + 1, C.rootDark), circle(tx + 4, ty + 6, w * 0.9 + 1, C.rootDark));
  return out.join('');
}

/** Feuillage éclairé d'en haut : feuilles éparpillées dans une bande, plus vives vers le haut. */
function foliage(rnd, x0, x1, yTop, yBot, count, sizeMin = 9, sizeMax = 22) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = yTop + rnd() * (yBot - yTop);
    const t = (y - yTop) / (yBot - yTop);
    const r = rnd() + t * 0.9;
    const color = r < 0.28 ? C.leafLime : r < 0.7 ? C.leafBright : r < 1.15 ? C.leafMid : C.leafDark;
    out.push(leaf(x, y, -90 + (rnd() - 0.5) * 170, sizeMin + rnd() * (sizeMax - sizeMin), 3.6 + rnd() * 3.6, color));
  }
  return out.join('');
}

/** Massif de buissons : boules vert sombre, reflet plus clair en haut à gauche (lumière du ciel). */
function bushes(rnd, x0, x1, yAt, rMin, rMax, step = 15) {
  const out = [];
  for (let x = x0; x <= x1; x += step * (0.6 + rnd() * 0.8)) {
    const r = rMin + rnd() * (rMax - rMin);
    const y = yAt(x) + (rnd() - 0.5) * 8;
    out.push(circle(x, y, r, C.leafDark), circle(x - r * 0.18, y - r * 0.28, r * 0.72, C.leafMid), circle(x - r * 0.3, y - r * 0.45, r * 0.38, rnd() < 0.5 ? C.leafBright : C.leafLime, { opacity: 0.95 }));
  }
  return out.join('');
}

/** Racine / liane : trait effilé tan-gris. */
const root = (d, w) => line(d, C.root, w) + line(d, C.rootDark, Math.max(1, w * 0.22), { opacity: 0.55 });

/** Touffe de lames pointues (agave / pandanus), sombres derrière, vives devant. */
function spikes(x, y, n, L, rnd) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = -170 + (i / (n - 1)) * 160 + (rnd() - 0.5) * 10;
    out.push(leaf(x, y, a, L * (0.75 + rnd() * 0.4), 2.3, i % 2 ? '#0b3d27' : C.leafDark));
  }
  for (let i = 0; i < n - 2; i++) {
    const a = -160 + (i / (n - 3)) * 140 + (rnd() - 0.5) * 12;
    out.push(leaf(x, y + 1, a, L * (0.5 + rnd() * 0.35), 2.1, i % 2 ? C.leafBright : C.leafMid));
  }
  return out.join('');
}

/** Rocher à facettes (sans contour, comme sur le plateau). */
function rock(x, y, w, h) {
  return (
    pth(`M${f(x)} ${f(y)}L${f(x + w * 0.08)} ${f(y - h * 0.55)}L${f(x + w * 0.35)} ${f(y - h)}L${f(x + w * 0.72)} ${f(y - h * 0.86)}L${f(x + w)} ${f(y - h * 0.3)}L${f(x + w * 0.96)} ${f(y)}Z`, C.rock) +
    pth(`M${f(x + w * 0.08)} ${f(y - h * 0.55)}L${f(x + w * 0.35)} ${f(y - h)}L${f(x + w * 0.5)} ${f(y - h * 0.62)}L${f(x + w * 0.3)} ${f(y - h * 0.3)}Z`, C.rockLight) +
    pth(`M${f(x + w * 0.5)} ${f(y - h * 0.62)}L${f(x + w * 0.72)} ${f(y - h * 0.86)}L${f(x + w)} ${f(y - h * 0.3)}L${f(x + w * 0.96)} ${f(y)}L${f(x + w * 0.55)} ${f(y)}Z`, C.rockShade)
  );
}

/** Nuage : cercles blancs, ventre bleuté. */
function cloud(x, y, s, opacity = 1) {
  const o = { opacity };
  return (
    ellipse(x, y + 10 * s, 60 * s, 11 * s, C.cloudShade, o) +
    circle(x - 30 * s, y + 2 * s, 20 * s, C.cloud, o) +
    circle(x, y - 10 * s, 28 * s, C.cloud, o) +
    circle(x + 32 * s, y, 22 * s, C.cloud, o) +
    circle(x + 54 * s, y + 6 * s, 14 * s, C.cloud, o) +
    ellipse(x + 2 * s, y + 8 * s, 50 * s, 10 * s, C.cloud, o)
  );
}

/** Perroquet vu de profil. */
function parrot(x, y, s, body, wing) {
  return group(
    `translate(${f(x)} ${f(y)}) scale(${s})`,
    pth('M-9 1Q-3 -6 6 -2L11 0L6 4Q-3 7 -9 1Z', body),
    pth('M-3 -2Q-1 -13 9 -11Q5 -5 2 0Z', wing),
    pth('M-9 1L-17 6L-14 1Z', wing),
    circle(6.5, -1.6, 1.3, '#fff'),
    circle(6.8, -1.6, 0.6, C.line),
    pth('M10.5 -1L14 0.5L10.5 2Z', '#f5c24a')
  );
}

/** Empreintes de pas le long d'une courbe de Bézier quadratique. */
function footprints(p0, p1, p2, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const x = (1 - t) * (1 - t) * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0];
    const y = (1 - t) * (1 - t) * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1];
    const side = i % 2 ? 4 : -4;
    out.push(ellipse(x + side, y, 2.6, 5.4, C.sandWet, { opacity: 0.55 }));
  }
  return out.join('');
}

/** Radeau / fagot de rondins ficelés, vu de dessus. */
function raft(x, y, w, h, rnd) {
  const out = [];
  const n = Math.floor(h / 7);
  for (let i = 0; i < n; i++) {
    const yy = y + i * 7;
    out.push(rect(x, yy, w, 6.2, i % 2 ? '#b0642c' : '#c47636', { rx: 3, stroke: C.woodDark, strokeWidth: 0.9 }));
    out.push(line(`M${f(x + 4)} ${f(yy + 2)}L${f(x + w - 4)} ${f(yy + 2)}`, C.woodLight, 0.9, { opacity: 0.6 }));
  }
  for (const k of [0.18, 0.5, 0.82]) out.push(rect(x + w * k - 2, y - 2, 5, h + 4, C.rope, { rx: 2, stroke: '#8a6b34', strokeWidth: 0.8 }));
  return out.join('');
}

const stars = () => '';

// ═════════════════════════ SCÈNE JUNGLE (fond) ═════════════════════════
(function jungleBg() {
  const s = new Svg('scene_jungle_bg', 360, 800);
  const r = rng(11);
  const sky = s.lin('sky', 0, 0, 0, 440, [
    [0, C.skyTop],
    [0.45, C.skyMid],
    [0.8, C.skyLow],
    [1, C.skyHaze],
  ]);
  s.add(rect(0, 0, 360, 800, sky));
  // nuages et orage au loin
  const sun = s.rad('sun', 70, 58, 170, [
    [0, '#ffffff', 0.95],
    [0.22, '#fff6b0', 0.65],
    [1, '#ffe27a', 0],
  ]);
  s.add(circle(70, 58, 170, sun), circle(70, 58, 27, '#fffbe2'));
  s.add(cloud(70, 110, 1.2), cloud(250, 60, 1), cloud(300, 195, 0.9, 0.95), cloud(110, 235, 0.8, 0.9));
  s.add(parrot(238, 150, 1.5, '#2aa4e0', '#1673b8'), parrot(262, 168, 1.3, '#f08a3c', '#d9561f'), parrot(222, 178, 1.2, '#2aa4e0', '#1673b8'));
  // falaises grises derrière la jungle
  s.add(pth('M-10 360L-10 250L40 215L75 240L120 200L165 170L205 205L250 185L300 225L370 205L370 380Z', C.rock));
  s.add(pth('M40 215L75 240L70 330L35 300Z', C.rockLight), pth('M165 170L205 205L190 320L150 280Z', C.rockLight), pth('M250 185L300 225L285 330L245 290Z', C.rockLight));
  s.add(pth('M75 240L120 200L125 340L95 330Z', C.rockShade, { opacity: 0.85 }), pth('M205 205L250 185L245 340L215 330Z', C.rockShade, { opacity: 0.85 }));
  s.add(rect(-10, 300, 380, 60, '#bfe0f5', { opacity: 0.4 }));
  // masse sombre de la jungle
  const jungle = s.lin('jungle', 0, 270, 0, 520, [
    [0, C.jungleMid],
    [1, C.jungleDeep],
  ]);
  s.add(pth('M-10 330Q40 270 100 300T220 285T370 300L370 520L-10 520Z', jungle));
  // racines et lianes claires dans l'ombre
  for (const [x, y, dx, dy, w] of [
    [40, 300, 60, 175, 6],
    [120, 295, -40, 180, 5],
    [200, 292, 70, 190, 7],
    [270, 298, -30, 175, 5],
    [330, 300, -70, 170, 6],
  ]) {
    s.add(root(`M${x} ${y}Q${x + dx * 0.15} ${y + dy * 0.5} ${x + dx} ${y + dy}`, w));
  }
  s.add(line('M205 340Q216 346 205 356Q194 362 208 372', C.leafLime, 5), line('M205 340Q216 346 205 356Q194 362 208 372', C.leafDark, 1.4, { opacity: 0.6 }));
  // feuillage vif : haut de la jungle, puis colonnes de feuilles
  s.add(bushes(r, -10, 372, (x) => 318 - 20 * Math.sin(x / 55), 15, 26));
  s.add(foliage(r, -5, 365, 285, 365, 200, 9, 20));
  s.add(foliage(r, -5, 95, 340, 520, 130, 9, 20), foliage(r, 265, 365, 330, 520, 130, 9, 20));
  s.add(spikes(120, 430, 11, 52, r), spikes(250, 445, 11, 56, r), spikes(185, 470, 9, 40, r));
  s.add(bushes(r, -10, 372, () => 486, 14, 24, 13));
  s.add(foliage(r, -5, 365, 455, 520, 100, 9, 18));
  // rochers au bord de la plage
  s.add(rock(-12, 505, 100, 78), rock(280, 505, 100, 90), rock(88, 505, 40, 26));
  // plage pêche
  const sand = s.lin('sand', 0, 480, 0, 800, [
    [0, C.sandTop],
    [0.4, C.sandMid],
    [1, C.sandLow],
  ]);
  s.add(pth('M0 505Q70 485 150 498T290 492T360 488L360 800L0 800Z', sand));
  s.add(ellipse(210, 560, 110, 14, '#fff3d4', { opacity: 0.55 }), ellipse(70, 640, 80, 10, '#fff3d4', { opacity: 0.4 }));
  s.add(footprints([40, 770], [150, 650], [60, 560], 11));
  // souche et hache plantée, rondins, corde
  s.add(ellipse(100, 640, 26, 7, '#000', { opacity: 0.18 }), rect(78, 588, 44, 50, '#a85a28', { rx: 4 }), ellipse(100, 590, 22, 8, '#d9985a', { stroke: C.woodDark, strokeWidth: 1.5 }), ellipse(100, 590, 11, 3.5, 'none', { stroke: C.woodDark, strokeWidth: 1 }));
  s.add(line('M240 600Q262 585 284 596T330 590', C.rope, 5), line('M236 612Q262 640 296 622', C.rope, 5));
  s.add(raft(262, 640, 80, 22, r));
  s.save();
})();

// ═════════════════════════ SCÈNE JUNGLE (premier plan) ═════════════════════════
(function jungleFg() {
  const s = new Svg('scene_jungle_fg', 360, 800);
  const r = rng(23);
  // gros palmiers vert vif qui cadrent la scène
  s.add(palm(-6, 770, 640, 92, 150, r, { trunk: 15, bend: -34 }));
  s.add(palm(372, 730, 600, -88, 140, r, { trunk: 14, bend: 30 }));
  // grandes feuilles qui pendent du haut
  for (const [x, a, L, c] of [
    [18, 50, 90, C.leafDark],
    [340, 130, 90, C.leafDark],
    [120, 28, 60, C.leafMid],
    [250, 152, 56, C.leafMid],
  ]) {
    s.add(frond(x, -6, a, L, 20, c));
  }
  for (const [x, len, sw] of [
    [62, 130, 2.5],
    [96, 90, 2],
    [268, 110, 2.5],
    [300, 150, 2],
  ]) {
    s.add(line(`M${x} -4Q${x + 8} ${len * 0.5} ${x - 4} ${len}`, C.leafDark, sw));
  }
  // herbes dans les coins du bas
  for (const x of [8, 30, 330, 352]) {
    s.add(frond(x, 800, -105, 60, 12, C.leafBright), frond(x, 800, -75, 66, 12, C.leafMid), frond(x, 800, -135, 50, 10, C.leafLime));
  }
  s.save();
})();

// ═════════════════════════ SCÈNE MER (fond) ═════════════════════════
(function seaBg() {
  const s = new Svg('scene_sea_bg', 360, 800);
  const r = rng(37);
  const sky = s.lin('sky', 0, 0, 0, 400, [
    [0, C.skyTop],
    [0.5, C.skyMid],
    [0.85, C.skyLow],
    [1, C.skyHaze],
  ]);
  s.add(rect(0, 0, 360, 800, sky));
  // orage sombre à gauche, gros nuages blancs
  const sun = s.rad('sun', 280, 70, 170, [
    [0, '#ffffff', 0.95],
    [0.22, '#fff6b0', 0.65],
    [1, '#ffe27a', 0],
  ]);
  s.add(circle(280, 70, 170, sun), circle(280, 70, 27, '#fffbe2'));
  s.add(cloud(240, 90, 1.3), cloud(120, 150, 1), cloud(300, 250, 1.2, 0.95), cloud(190, 330, 1.1, 0.9));
  s.add(parrot(150, 110, 1.4, '#2aa4e0', '#1673b8'), parrot(176, 128, 1.2, '#f08a3c', '#d9561f'), parrot(132, 140, 1.1, '#2aa4e0', '#1673b8'));
  // mer lointaine puis lagon
  const far = s.lin('far', 0, 380, 0, 420, [
    [0, '#7cc4f2'],
    [1, C.deep],
  ]);
  s.add(rect(0, 380, 360, 50, far));
  const lagoon = s.lin('lagoon', 0, 420, 0, 640, [
    [0, C.deep],
    [0.18, C.lagoon],
    [0.5, C.turq],
    [0.8, C.turqLight],
    [1, C.shallow],
  ]);
  s.add(rect(0, 420, 360, 240, lagoon));
  // bancs de sable crème dans le lagon, reflets, écume
  s.add(pth('M360 520Q300 520 260 560T150 600Q60 610 0 590L0 660L360 660Z', C.shallow, { opacity: 0.85 }));
  s.add(pth('M0 470Q60 480 110 462T220 470Q300 480 360 462L360 480Q300 495 220 486T110 480Q60 494 0 486Z', '#ffffff', { opacity: 0.25 }));
  for (let i = 0; i < 12; i++) {
    const y = 440 + i * 16 + r() * 8;
    const x = r() * 330;
    s.add(line(`M${f(x)} ${f(y)}q10 -4 20 0t20 0`, '#fff', 1.6, { opacity: f(0.18 + r() * 0.2) }));
  }
  // îlots rocheux et rochers dans l'eau
  s.add(rock(-20, 432, 120, 62), rock(268, 428, 110, 54), rock(120, 430, 40, 20));
  s.add(rock(190, 575, 26, 18), rock(230, 590, 20, 12), rock(40, 560, 24, 14));
  // plage pêche
  const sand = s.lin('sand', 0, 640, 0, 800, [
    [0, C.sandTop],
    [0.5, C.sandMid],
    [1, C.sandLow],
  ]);
  s.add(pth('M0 650Q60 628 140 642T270 636T360 628L360 800L0 800Z', C.sandWet));
  s.add(pth('M0 668Q70 646 150 660T290 654T360 648L360 800L0 800Z', sand));
  s.add(
    line('M-4 648Q60 624 140 640T270 634T364 626', '#fff', 5, { opacity: 0.8 }),
    line('M-4 640Q60 616 140 632T270 626T364 618', '#fff', 2.5, { opacity: 0.55 })
  );
  s.add(ellipse(110, 720, 90, 9, '#fff3d4', { opacity: 0.45 }));
  s.add(footprints([300, 780], [180, 720], [90, 690], 8));
  s.save();
})();

// ═════════════════════════ SCÈNE MER (premier plan) ═════════════════════════
(function seaFg() {
  const s = new Svg('scene_sea_fg', 360, 800);
  const r = rng(49);
  s.add(palm(-10, 790, 600, 110, 150, r, { trunk: 15, bend: -30 }));
  for (const [x, a, L, c] of [
    [350, 135, 100, C.leafDark],
    [300, 150, 70, C.leafMid],
    [200, 95, 40, C.leafDark],
  ]) {
    s.add(frond(x, -6, a, L, 22, c));
  }
  s.add(frond(350, -6, 150, 70, 16, C.leafBright));
  for (const [x, len] of [
    [300, 110],
    [330, 70],
  ]) {
    s.add(line(`M${x} -4Q${x + 8} ${len * 0.5} ${x - 4} ${len}`, C.leafDark, 2.2));
  }
  for (const x of [340, 358]) s.add(frond(x, 800, -100, 56, 12, C.leafBright), frond(x, 800, -130, 46, 10, C.leafMid));
  s.save();
})();

// ═════════════════════════ OBJETS (traits noirs épais, comme sur les cartes) ═════════════════════════
(function plank() {
  // rondin long ficelé : le bois du jeu, ce sont de longs morceaux de bois ronds liés par une corde
  const s = new Svg('plank', 220, 40);
  const body = s.lin('body', 0, 5, 0, 35, [
    [0, '#d98a47'],
    [0.45, C.wood],
    [1, C.woodDark],
  ]);
  // bâton : bout gauche arrondi, bout droit droit (x = 196) où vient se coller la section coupée
  s.add(pth('M21 5H196V35H21A15 15 0 0 1 21 5Z', body, { stroke: C.line, strokeWidth: 3, strokeLinejoin: 'round' }));
  s.add(rect(24, 9, 160, 6, C.woodLight, { rx: 3, opacity: 0.75 }));
  s.add(
    line('M44 22Q92 19 140 23', C.woodDark, 1.6, { opacity: 0.7 }),
    line('M64 30Q116 28 176 31', C.woodDark, 1.6, { opacity: 0.7 }),
    line('M100 17l4 -2', C.woodDark, 1.4, { opacity: 0.7 }),
    line('M18 24l6 -1', C.woodDark, 1.4, { opacity: 0.7 })
  );
  // section coupée : ellipse centrée sur l'extrémité du bâton, de la hauteur exacte du bâton (15 de demi-hauteur)
  s.add(ellipse(196, 20, 9, 15, '#edc488', { stroke: C.line, strokeWidth: 3 }));
  s.add(ellipse(196, 20, 5.5, 10, 'none', { stroke: '#b9803f', strokeWidth: 1.6 }), ellipse(196, 20, 2.4, 4.5, 'none', { stroke: '#b9803f', strokeWidth: 1.4 }));
  // deux liens de corde
  for (const x of [34, 150]) {
    s.add(rect(x, 3, 6, 34, C.rope, { rx: 3, stroke: '#7b5a26', strokeWidth: 1.6 }), rect(x + 10, 3, 6, 34, C.rope, { rx: 3, stroke: '#7b5a26', strokeWidth: 1.6 }));
    s.add(line(`M${x} 11L${x + 6} 16M${x + 10} 11L${x + 16} 16M${x} 25L${x + 6} 30M${x + 10} 25L${x + 16} 30`, '#a07f3d', 1.3));
  }
  s.save();
})();

(function fish() {
  // poisson rouge, bouche pleine de dents, œil en croix
  const s = new Svg('fish', 110, 64);
  const body = s.lin('body', 0, 10, 0, 56, [
    [0, '#ff7a63'],
    [1, '#d62f3c'],
  ]);
  const fin = '#c42533';
  s.add(pth('M24 32L4 9Q13 32 4 55Z', fin, { stroke: C.line, strokeWidth: 3, strokeLinejoin: 'round' }));
  s.add(pth('M44 16Q58 -1 76 13Q60 12 44 16Z', fin, { stroke: C.line, strokeWidth: 2.6, strokeLinejoin: 'round' }));
  s.add(pth('M44 50Q54 62 68 52Q56 50 44 50Z', fin, { stroke: C.line, strokeWidth: 2.6, strokeLinejoin: 'round' }));
  s.add(pth('M20 32Q40 4 76 12Q104 20 106 32Q104 46 76 54Q40 60 20 32Z', body, { stroke: C.line, strokeWidth: 3 }));
  s.add(pth('M32 37Q62 53 100 38Q104 44 76 52Q46 56 32 37Z', '#ffd9d0', { opacity: 0.95 }));
  s.add(
    line('M52 17Q58 32 52 49', '#8a1824', 2.4, { opacity: 0.4 }),
    line('M62 14Q68 32 62 52', '#8a1824', 2.4, { opacity: 0.4 }),
    line('M72 22Q66 32 72 45', C.line, 2.6)
  );
  // gueule ouverte et dents
  s.add(pth('M106 32Q96 26 88 36Q98 42 106 36Z', '#5b1a2a', { stroke: C.line, strokeWidth: 2 }));
  s.add(pth('M102 30L99 35L96 30ZM96 29L93 35L90 31Z', '#fff'));
  // œil en croix
  s.add(circle(88, 25, 6.5, '#fff', { stroke: C.line, strokeWidth: 2 }));
  s.add(line('M85 22L91 28M91 22L85 28', C.line, 2));
  s.save();
})();

(function snake() {
  const s = new Svg('snake', 190, 210);
  const P = [[34, 192], [0, 150], [66, 128], [104, 142]];
  const Q = [[104, 142], [156, 156], [168, 104], [118, 92]];
  const R = [[118, 92], [66, 82], [52, 48], [100, 40]];
  const d = `M${P[0]}C${P[1]} ${P[2]} ${P[3]}C${Q[1]} ${Q[2]} ${Q[3]}C${R[1]} ${R[2]} ${R[3]}`;
  s.add(line(d, C.line, 31));
  s.add(line(d, '#2f9e3c', 22));
  s.add(line(d, '#7ad65a', 9, { opacity: 0.8 }));
  for (const seg of [P, Q, R]) {
    for (let t = 0.14; t < 1; t += 0.2) {
      const m = 1 - t;
      const x = m * m * m * seg[0][0] + 3 * m * m * t * seg[1][0] + 3 * m * t * t * seg[2][0] + t * t * t * seg[3][0];
      const y = m * m * m * seg[0][1] + 3 * m * m * t * seg[1][1] + 3 * m * t * t * seg[2][1] + t * t * t * seg[3][1];
      s.add(circle(x, y, 4.6, '#1b6e2a'));
    }
  }
  const ang = (Math.atan2(R[3][1] - R[2][1], R[3][0] - R[2][0]) * 180) / Math.PI;
  const head = [
    line('M24 0L46 0M46 0L56 -6M46 0L56 6', '#e0243a', 3),
    pth('M-10 -15Q14 -22 30 -6Q34 0 30 6Q14 22 -10 15Q-16 0 -10 -15Z', '#2f9e3c', { stroke: C.line, strokeWidth: 3 }),
    pth('M-4 -10Q10 -13 22 -3Q10 -6 -4 -6Z', '#7ad65a', { opacity: 0.8 }),
    pth('M20 -2L24 6L28 -2Z', '#fff'),
    circle(6, -9, 5.8, '#ffe14a', { stroke: C.line, strokeWidth: 1.6 }),
    circle(6, 9, 5.8, '#ffe14a', { stroke: C.line, strokeWidth: 1.6 }),
    ellipse(6.5, -9, 1.6, 4.4, C.line),
    ellipse(6.5, 9, 1.6, 4.4, C.line),
    circle(25, -4, 1.2, C.line),
    circle(25, 4, 1.2, C.line),
  ].join('');
  s.add(group(`translate(${R[3][0]} ${R[3][1]}) rotate(${f(ang)})`, head));
  s.save();
})();

(function axe() {
  // hache de la carte : manche brun-doré, fer gris-bleu évasé vers le tranchant, gros contour noir
  const s = new Svg('axe', 64, 64);
  const steel = s.lin('steel', 0, 22, 0, 58, [
    [0, '#e4ebf6'],
    [1, '#8b98b2'],
  ]);
  // manche long qui part du fer vers le haut à droite
  s.add(pth('M17 49C29 39 42 24 48 7L57 11C53 29 39 46 26 56Z', '#d08e36', { stroke: C.line, strokeWidth: 3.2, strokeLinejoin: 'round' }));
  s.add(line('M28 44C38 35 46 23 51 12', '#f4bd68', 2.4, { opacity: 0.85 }));
  // fer : bloc carré sur le manche, tranchant évasé vers le bas
  s.add(pth('M4 44L19 37L31 46Q35 55 29 62Q17 60 8 57Z', steel, { stroke: C.line, strokeWidth: 3.2, strokeLinejoin: 'round' }));
  s.add(pth('M6.6 44.2L19 38.6L22 41.6L9 47.6Z', '#f7faff', { opacity: 0.95 }));
  s.add(line('M20 52L28 56', '#6b7892', 1.8, { opacity: 0.85 }));
  s.save();
})();

(function rod() {
  // canne de la carte : canne noire à anneaux, liège, moulinet gris-bleu, fil turquoise, leurre rouge et blanc
  const s = new Svg('rod', 64, 64);
  s.add(line('M11 55Q29 39 52 9', C.line, 5));
  s.add(line('M11 55L20 45', C.line, 10.5), line('M11 55L20 45', '#e0953f', 6.5));
  for (const t of [0.42, 0.6, 0.76, 0.9]) {
    const x = (1 - t) * (1 - t) * 11 + 2 * (1 - t) * t * 29 + t * t * 52;
    const y = (1 - t) * (1 - t) * 55 + 2 * (1 - t) * t * 39 + t * t * 9;
    s.add(circle(x, y, 2.6, '#cdd5e3', { stroke: C.line, strokeWidth: 1.4 }));
  }
  s.add(circle(27, 49, 8, '#9fb0c9', { stroke: C.line, strokeWidth: 2.6 }), circle(27, 49, 3.2, '#e2e8f2', { stroke: C.line, strokeWidth: 1.4 }));
  s.add(line('M52 9C63 24 60 40 46 49', '#37c3cc', 2.2));
  s.add(group('translate(44 53) rotate(-25)', ellipse(0, 0, 8.5, 4, '#fff', { stroke: C.line, strokeWidth: 1.8 }), pth('M-8.5 0Q-8.5 -4 0 -4Q-3 0 0 4Q-8.5 4 -8.5 0Z', '#e0243a', { stroke: C.line, strokeWidth: 1.4 })));
  s.add(circle(52, 47, 1.8, C.line), circle(54.5, 42, 1.8, C.line), circle(57, 37, 1.8, C.line));
  s.save();
})();

(function spear() {
  // lance en bois : long manche brun, pointe de pierre ligaturée (pêche sans canne), pointe vers le bas
  const s = new Svg('spear', 60, 140);
  const shaft = s.lin('shaft', 24, 0, 36, 0, [
    [0, '#d98a47'],
    [0.5, C.wood],
    [1, C.woodDark],
  ]);
  const stone = s.lin('stone', 0, 96, 0, 138, [
    [0, '#e4ebf6'],
    [1, '#8b98b2'],
  ]);
  s.add(rect(26, 4, 8, 104, shaft, { rx: 4, stroke: C.line, strokeWidth: 3 }));
  s.add(rect(28.5, 8, 2.4, 92, C.woodLight, { rx: 1.2, opacity: 0.7 }));
  s.add(pth('M30 138L20 102Q30 94 40 102Z', stone, { stroke: C.line, strokeWidth: 3, strokeLinejoin: 'round' }));
  s.add(line('M30 126L26 108', '#6b7892', 1.6, { opacity: 0.8 }), pth('M25 103Q30 99 35 103L33 108Q30 105 27 108Z', '#f7faff', { opacity: 0.9 }));
  for (const y of [98, 106]) s.add(rect(23, y, 14, 5, C.rope, { rx: 2.5, stroke: '#7b5a26', strokeWidth: 1.4 }));
  s.add(line('M23 100L37 104M37 100L23 104', '#a07f3d', 1.1));
  s.save();
})();

(function float() {
  const s = new Svg('float', 28, 40);
  s.add(line('M14 1V11', '#fff', 2.2));
  s.add(ellipse(14, 26, 12, 14, '#fff'));
  s.add(pth('M2.4 22A12 14 0 0 1 25.6 22Z', '#e0243a'));
  s.add(ellipse(14, 26, 12, 14, 'none', { stroke: C.line, strokeWidth: 2.2 }));
  s.save();
})();

(function ripple() {
  // cercles d'eau : écume blanche
  const s = new Svg('ripple', 120, 40);
  s.add(ellipse(60, 20, 56, 15, 'none', { stroke: '#fff', strokeWidth: 3, opacity: 0.9 }));
  s.add(ellipse(60, 20, 34, 9, 'none', { stroke: '#fff', strokeWidth: 2.4, opacity: 0.9 }));
  s.add(ellipse(60, 20, 14, 4, 'none', { stroke: '#fff', strokeWidth: 1.8, opacity: 0.9 }));
  s.save();
})();
