#!/usr/bin/env node
/**
 * Convertit les SVG de /art en VectorDrawable Android (res/drawable/art_<nom>.xml).
 * Sous-ensemble SVG supporté : svg, defs, linearGradient, radialGradient (userSpaceOnUse),
 * g (transform translate/rotate/scale), path, rect(rx), circle, ellipse.
 * Opacité d'élément → fillAlpha/strokeAlpha.
 *
 * Usage : node tools/svg2vd.js
 */
const fs = require('fs');
const path = require('path');

const ART = path.join(__dirname, '..', 'art');
const OUT = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res', 'drawable');

// ───────── mini parseur XML (suffisant pour nos SVG générés) ─────────
function parse(xml) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const tagRe = /<(\/?)([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
  let m;
  while ((m = tagRe.exec(xml))) {
    const [, closing, tag, rawAttrs, selfClose] = m;
    if (closing) {
      stack.pop();
      continue;
    }
    const attrs = {};
    for (const a of rawAttrs.matchAll(/([\w:-]+)="([^"]*)"/g)) attrs[a[1]] = a[2];
    const node = { tag, attrs, children: [] };
    stack[stack.length - 1].children.push(node);
    if (!selfClose) stack.push(node);
  }
  if (stack.length !== 1) throw new Error('SVG mal formé (balises non fermées)');
  return root.children[0];
}

// ───────── couleurs ─────────
function hex(color, opacity = 1) {
  let c = color.trim().toLowerCase();
  if (/^#[0-9a-f]{3}$/.test(c)) c = '#' + [...c.slice(1)].map((x) => x + x).join('');
  if (c === '#fff' || c === 'white') c = '#ffffff';
  if (!/^#[0-9a-f]{6}$/.test(c)) throw new Error('couleur non supportée : ' + color);
  const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
    .toString(16)
    .padStart(2, '0');
  return ('#' + a + c.slice(1)).toUpperCase();
}
const num = (n) => String(Math.round(n * 100) / 100);

// ───────── formes → pathData ─────────
function shapeToPath(n) {
  const a = n.attrs;
  const v = (k, d = 0) => (a[k] !== undefined ? parseFloat(a[k]) : d);
  switch (n.tag) {
    case 'path':
      return a.d;
    case 'rect': {
      const x = v('x'), y = v('y'), w = v('width'), h = v('height');
      const rx = Math.min(v('rx', v('ry')), w / 2), ry = Math.min(v('ry', v('rx')), h / 2);
      if (!rx && !ry) return `M${num(x)},${num(y)}h${num(w)}v${num(h)}h${num(-w)}z`;
      return (
        `M${num(x + rx)},${num(y)}H${num(x + w - rx)}A${num(rx)},${num(ry)} 0 0 1 ${num(x + w)},${num(y + ry)}` +
        `V${num(y + h - ry)}A${num(rx)},${num(ry)} 0 0 1 ${num(x + w - rx)},${num(y + h)}` +
        `H${num(x + rx)}A${num(rx)},${num(ry)} 0 0 1 ${num(x)},${num(y + h - ry)}` +
        `V${num(y + ry)}A${num(rx)},${num(ry)} 0 0 1 ${num(x + rx)},${num(y)}z`
      );
    }
    case 'circle':
    case 'ellipse': {
      const cx = v('cx'), cy = v('cy');
      const rx = n.tag === 'circle' ? v('r') : v('rx');
      const ry = n.tag === 'circle' ? v('r') : v('ry');
      return `M${num(cx - rx)},${num(cy)}a${num(rx)},${num(ry)} 0 1,0 ${num(2 * rx)},0a${num(rx)},${num(ry)} 0 1,0 ${num(-2 * rx)},0z`;
    }
    default:
      throw new Error('élément non supporté : ' + n.tag);
  }
}

// ───────── dégradés ─────────
function gradientXml(g, indent) {
  const a = g.attrs;
  if (a.gradientUnits !== 'userSpaceOnUse') throw new Error('dégradé ' + a.id + ' : userSpaceOnUse requis');
  const items = g.children
    .filter((c) => c.tag === 'stop')
    .map(
      (s) =>
        `${indent}    <item android:offset="${s.attrs.offset}" android:color="${hex(s.attrs['stop-color'], parseFloat(s.attrs['stop-opacity'] ?? '1'))}"/>`
    )
    .join('\n');
  const head =
    g.tag === 'linearGradient'
      ? `android:type="linear" android:startX="${a.x1}" android:startY="${a.y1}" android:endX="${a.x2}" android:endY="${a.y2}"`
      : `android:type="radial" android:centerX="${a.cx}" android:centerY="${a.cy}" android:gradientRadius="${a.r}"`;
  return `${indent}<gradient ${head}>\n${items}\n${indent}</gradient>`;
}

// ───────── transformations ─────────
function parseTransform(t) {
  const ops = [];
  for (const m of t.matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
    const p = m[2].split(/[\s,]+/).filter(Boolean).map(Number);
    ops.push({ op: m[1], p });
  }
  return ops;
}
function groupOpen(op, indent) {
  const { p } = op;
  if (op.op === 'translate') return `${indent}<group android:translateX="${p[0]}" android:translateY="${p[1] ?? 0}">`;
  if (op.op === 'scale')
    return `${indent}<group android:scaleX="${p[0]}" android:scaleY="${p[1] ?? p[0]}" android:pivotX="0" android:pivotY="0">`;
  return `${indent}<group android:rotation="${p[0]}" android:pivotX="${p[1] ?? 0}" android:pivotY="${p[2] ?? 0}">`;
}

// ───────── conversion d'un fichier ─────────
function convert(svgText) {
  const root = parse(svgText);
  const [, , vw, vh] = root.attrs.viewBox.split(/\s+/).map(Number);
  const grads = {};
  const lines = [];

  function walk(n, indent) {
    if (n.tag === 'defs') {
      for (const g of n.children) grads[g.attrs.id] = g;
      return;
    }
    if (n.tag === 'g') {
      const ops = n.attrs.transform ? parseTransform(n.attrs.transform) : [];
      let ind = indent;
      for (const op of ops) {
        lines.push(groupOpen(op, ind));
        ind += '  ';
      }
      for (const c of n.children) walk(c, ind);
      for (let i = ops.length - 1; i >= 0; i--) {
        ind = ind.slice(2);
        lines.push(`${ind}</group>`);
      }
      return;
    }
    const a = n.attrs;
    const op = parseFloat(a.opacity ?? '1');
    const fill = a.fill ?? '#000000';
    const stroke = a.stroke;
    const props = [`android:pathData="${shapeToPath(n)}"`];
    let fillGrad = null;
    if (fill !== 'none') {
      const gm = /^url\(#(.+)\)$/.exec(fill);
      if (gm) {
        fillGrad = grads[gm[1]];
        if (!fillGrad) throw new Error('dégradé introuvable : ' + gm[1]);
        if (op !== 1) props.push(`android:fillAlpha="${op}"`);
      } else {
        props.push(`android:fillColor="${hex(fill)}"`);
        const fa = op * parseFloat(a['fill-opacity'] ?? '1');
        if (fa !== 1) props.push(`android:fillAlpha="${num(fa)}"`);
      }
    }
    if (stroke && stroke !== 'none') {
      props.push(`android:strokeColor="${hex(stroke)}"`, `android:strokeWidth="${a['stroke-width'] ?? 1}"`);
      const sa = op * parseFloat(a['stroke-opacity'] ?? '1');
      if (sa !== 1) props.push(`android:strokeAlpha="${num(sa)}"`);
      if (a['stroke-linecap']) props.push(`android:strokeLineCap="${a['stroke-linecap']}"`);
      if (a['stroke-linejoin']) props.push(`android:strokeLineJoin="${a['stroke-linejoin']}"`);
    }
    if (fillGrad) {
      lines.push(
        `${indent}<path\n${indent}    ${props.join(`\n${indent}    `)}>`,
        `${indent}  <aapt:attr name="android:fillColor">`,
        gradientXml(fillGrad, indent + '    '),
        `${indent}  </aapt:attr>`,
        `${indent}</path>`
      );
    } else {
      lines.push(`${indent}<path\n${indent}    ${props.join(`\n${indent}    `)}/>`);
    }
  }

  for (const c of root.children) walk(c, '    ');
  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<!-- Généré par tools/svg2vd.js depuis art/*.svg — ne pas éditer à la main. -->\n` +
    `<vector xmlns:android="http://schemas.android.com/apk/res/android"\n` +
    `    xmlns:aapt="http://schemas.android.com/aapt"\n` +
    `    android:width="${vw}dp"\n    android:height="${vh}dp"\n` +
    `    android:viewportWidth="${vw}"\n    android:viewportHeight="${vh}">\n` +
    lines.join('\n') +
    `\n</vector>\n`
  );
}

fs.mkdirSync(OUT, { recursive: true });
for (const file of fs.readdirSync(ART).filter((f) => f.endsWith('.svg'))) {
  const name = 'art_' + file.replace(/\.svg$/, '');
  const xml = convert(fs.readFileSync(path.join(ART, file), 'utf8'));
  fs.writeFileSync(path.join(OUT, name + '.xml'), xml);
  console.log(`res/drawable/${name}.xml`, (xml.length / 1024).toFixed(1) + ' kB');
}
