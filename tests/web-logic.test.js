// Tests des règles de tirage du site (bloc `game-logic` de web/index.template.html).
// Aucune dépendance : `node --test tests/` (ou `make test`).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const template = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.template.html'), 'utf8');
const code = template.split('// <game-logic>')[1].split('// </game-logic>')[0];
const rules = new Function(`${code}; return { gatherWood, fishing, fishStats, biteChance, githubLinks, WOOD_BAG, FISH_BAG };`)();

const TRIALS = 200_000;
const near = (actual, expected, tolerance = 0.01) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} n'est pas proche de ${expected} (±${tolerance})`);

test('sans risque : la planche offerte est gardée (2 avec la hache)', () => {
  for (let i = 0; i < 1000; i++) {
    assert.deepEqual(rules.gatherWood({ extra: 0, axe: false }), { free: 1, extra: 0, bitten: false, total: 1 });
    assert.deepEqual(rules.gatherWood({ extra: 0, axe: true }), { free: 2, extra: 0, bitten: false, total: 2 });
  }
});

test('morsure : tout est perdu, sinon offert + extra', () => {
  let bites = 0;
  for (let i = 0; i < 5000; i++) {
    const r = rules.gatherWood({ extra: 3, axe: true });
    if (r.bitten) { bites++; assert.equal(r.total, 0); } else assert.equal(r.total, 5);
  }
  assert.ok(bites > 0 && bites < 5000);
});

test('risque de morsure = extra / 6', () => {
  for (let extra = 1; extra <= 5; extra++) {
    let bites = 0;
    for (let i = 0; i < TRIALS; i++) if (rules.gatherWood({ extra, axe: false }).bitten) bites++;
    near(bites / TRIALS, extra / 6);
    near(rules.biteChance(extra), extra / 6, 1e-12);
  }
});

test('extra est borné à 0..5', () => {
  assert.equal(rules.gatherWood({ extra: 99, axe: false }).extra, 5);
  assert.equal(rules.gatherWood({ extra: -4, axe: false }).extra, 0);
});

test('pêche sans canne : 3 billes à 1 poisson, 2 à 2, 1 à 3', () => {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < TRIALS; i++) counts[rules.fishing({ rod: false }).total]++;
  near(counts[1] / TRIALS, 3 / 6);
  near(counts[2] / TRIALS, 2 / 6);
  near(counts[3] / TRIALS, 1 / 6);
});

test('pêche avec canne : deux tirages sans remise, total = somme (2 à 5)', () => {
  // loi exacte par énumération des 30 paires ordonnées
  const bag = rules.FISH_BAG;
  const exact = {};
  let pairs = 0;
  for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) if (i !== j) { exact[bag[i] + bag[j]] = (exact[bag[i] + bag[j]] || 0) + 1; pairs++; }
  const seen = {};
  for (let i = 0; i < TRIALS; i++) {
    const r = rules.fishing({ rod: true });
    assert.equal(r.catches.length, 2);
    seen[r.total] = (seen[r.total] || 0) + 1;
  }
  assert.deepEqual(Object.keys(seen).sort(), Object.keys(exact).sort());
  for (const total of Object.keys(exact)) near((seen[total] || 0) / TRIALS, exact[total] / pairs);
});

test('statistiques de pêche', () => {
  assert.deepEqual(rules.fishStats(1), { min: 1, max: 3, mean: 10 / 6 });
  assert.deepEqual(rules.fishStats(2), { min: 2, max: 5, mean: 20 / 6 });
});

test("liens GitHub déduits de l'adresse GitHub Pages", () => {
  assert.deepEqual(rules.githubLinks('kantin.github.io', '/galerapagos/'), {
    repo: 'https://github.com/kantin/galerapagos',
    page: 'https://github.com/kantin/galerapagos/releases/tag/android-latest',
    apk: 'https://github.com/kantin/galerapagos/releases/download/android-latest/galerapagos.apk',
  });
  assert.equal(rules.githubLinks('kantin.github.io', '/galerapagos/index.html').repo, 'https://github.com/kantin/galerapagos');
  assert.equal(rules.githubLinks('kantin.github.io', '/'), null, 'page de compte : pas de dépôt');
  assert.equal(rules.githubLinks('localhost', '/galerapagos/'), null);
  assert.equal(rules.githubLinks('evil.example', '/x/'), null);
  assert.equal(rules.githubLinks('github.io.evil.example', '/x/'), null);
});
