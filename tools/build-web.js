#!/usr/bin/env node
/**
 * Assemble web/index.html (page unique, autonome) à partir de web/index.template.html
 * en injectant les SVG de /art comme <symbol> dans un sprite.
 *
 * Usage : node tools/build-web.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const ART = path.join(ROOT, 'art');

const symbols = fs
  .readdirSync(ART)
  .filter((f) => f.endsWith('.svg'))
  .map((file) => {
    const name = file.replace(/\.svg$/, '');
    const svg = fs.readFileSync(path.join(ART, file), 'utf8');
    const vb = /viewBox="([^"]+)"/.exec(svg)[1];
    const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
    return `<symbol id="a-${name}" viewBox="${vb}">${inner}</symbol>`;
  });

// Pas de display:none : certains navigateurs ignorent alors les dégradés référencés.
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false">${symbols.join('')}</svg>`;

const template = fs.readFileSync(path.join(ROOT, 'web', 'index.template.html'), 'utf8');
if (!template.includes('{{sprite}}')) throw new Error('{{sprite}} introuvable dans le template');
const html = template.replace('{{sprite}}', () => sprite);
fs.writeFileSync(path.join(ROOT, 'web', 'index.html'), html);
console.log('web/index.html', (html.length / 1024).toFixed(1) + ' kB', `(${symbols.length} symboles)`);
