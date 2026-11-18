const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..', '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readIfPresent = file => fs.existsSync(path.join(root, file)) ? read(file) : '';

test('landing route loads its own app', () => {
  const main = read('client/src/main.jsx');
  assert.match(main, /startsWith\('\/clubes'\)/);
  assert.match(main, /\.\/landing\/LandingApp\.jsx/);
});

test('server and Vercel serve the landing', () => {
  assert.match(read('server/frontend.cjs'), /'\/clubes\/'/);
  assert.match(read('server/index.cjs'), /\['\/admin', '\/superadmin', '\/clubes'\]/);
  const rewrites = JSON.parse(read('vercel.json')).rewrites.map(rule => rule.source);
  assert.ok(rewrites.includes('/clubes'));
  assert.ok(rewrites.includes('/clubes/(.*)'));
});

test('plans keep the published offer', async () => {
  assert.ok(readIfPresent('client/src/public/clubPlans.js'), 'missing clubPlans.js');
  const { clubPlans, customPlan, planGuarantee } = await import(path.join(root, 'client/src/public/clubPlans.js').replace(/\\/g, '/').replace(/^([A-Za-z]:)/, 'file:///$1'));
  assert.deepEqual(clubPlans.map(plan => [plan.name, plan.price, plan.period]), [['Pro', '$50.000', '/mes'], ['Elite', '$100.000', '/mes']]);
  assert.deepEqual(clubPlans[0].features, ['Turnos y reservas', 'Control de stock', 'App para jugadores', 'Torneos y rankings', 'Estadísticas avanzadas', 'Roles y permisos', 'POS para cantina', 'Arqueo de caja y movimientos']);
  assert.deepEqual(clubPlans[1].features, ['Todo lo de Pro', 'Multi-sede', 'Reportes avanzados', 'Soporte prioritario', 'Gerente de cuenta dedicado']);
  assert.deepEqual(customPlan, { name: 'Personalizado', price: 'A convenir' });
  assert.match(planGuarantee.title, /14 días de prueba bonificados/);
});

test('about and landing share plans', () => {
  assert.match(read('client/src/public/About.jsx'), /from "\.\/PlanCards\.jsx"/);
  assert.match(readIfPresent('client/src/landing/LandingApp.jsx'), /from '\.\.\/public\/PlanCards\.jsx'/);
  assert.match(read('client/src/public/PlanCards.jsx'), /from '\.\/clubPlans\.js'/);
  assert.doesNotMatch(read('client/src/public/About.jsx'), /\$50\.000/);
});

test('landing opens the club request form', () => {
  const landing = readIfPresent('client/src/landing/LandingApp.jsx');
  assert.match(landing, /<ClubModal plan=\{plan\}/);
  assert.match(landing, /setPlan\(customPlan\)/);
});

test('landing screenshots are present and light', () => {
  for (const name of ['panel-desktop', 'panel-mobile', 'agenda', 'canchas', 'cobros']) {
    const file = path.join(root, 'assets', `landing-${name}.webp`);
    assert.ok(fs.existsSync(file), `missing ${name}`);
    const data = fs.readFileSync(file);
    assert.equal(data.subarray(0, 4).toString(), 'RIFF', name);
    assert.equal(data.subarray(8, 12).toString(), 'WEBP', name);
    assert.ok(data.length < 300 * 1024, `${name} is ${data.length} bytes`);
  }
});

test('landing includes every approved section', () => {
  const landing = readIfPresent('client/src/landing/LandingApp.jsx');
  for (const text of ['Agenda clara', 'Canchas bajo control', 'Cobros ordenados', 'Cómo empezar', 'id="funciones"', 'id="planes"', '<PlanGuarantee', 'Sumá tu club a RTL'])
    assert.ok(landing.includes(text), text);
});

test('landing images reserve space', () => {
  const landing = readIfPresent('client/src/landing/LandingApp.jsx');
  const images = [...landing.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
  assert.ok(images.length >= 4);
  for (const name of ['agenda', 'canchas', 'cobros']) assert.match(landing, new RegExp(`landing-${name}\\.webp', width: \\d+, height: \\d+, alt: '`), name);
  for (const image of images) {
    assert.match(image, /\bwidth=/, image);
    assert.match(image, /\bheight=/, image);
    assert.match(image, /\balt=/, image);
  }
  assert.match(landing, /loading="lazy"/);
});

test('public site links to clubs', () => {
  assert.match(read('client/src/public/Footer.jsx'), /href="\/clubes\/"/);
  assert.match(read('client/src/public/PublicApp.jsx'), /href="\/clubes\/"/);
});

test('reveal stays visible without JavaScript support', () => {
  const css = readIfPresent('client/src/landing/landing.css');
  const landing = readIfPresent('client/src/landing/LandingApp.jsx');
  assert.match(css, /\.landing\.reveal-ready \.reveal\s*\{[^}]*opacity:\s*0/);
  assert.doesNotMatch(css, /(^|\n)\.reveal\s*\{[^}]*opacity:\s*0/);
  assert.match(landing, /'IntersectionObserver' in window/);
  assert.match(css, /prefers-reduced-motion/);
});

test('direct links open the requested landing section', () => {
  assert.match(readIfPresent('client/src/landing/LandingApp.jsx'), /location\.hash[\s\S]*scrollIntoView/);
});

test('reveal failures cannot hide or remove the page', () => {
  const landing = readIfPresent('client/src/landing/LandingApp.jsx');
  assert.match(landing, /try \{[\s\S]*new IntersectionObserver[\s\S]*catch/);
  assert.match(landing, /setTimeout\(showAll/);
  assert.ok(landing.indexOf('.observe(item)') < landing.indexOf("classList.add('reveal-ready')"));
});

test('modal keeps typed data on inside clicks and restores focus', () => {
  const modal = read('client/src/shared/components.jsx');
  assert.match(modal, /onPointerDown=/);
  assert.match(modal, /pressedOutside/);
  assert.match(modal, /opener\??\.isConnected/);
  assert.match(modal, /opener\.focus\(/);
});

test('connection failures use customer-facing Spanish', () => {
  const api = read('client/src/shared/api.js');
  assert.doesNotMatch(api, /npm start|backend/i);
  assert.match(api, /error\.name === 'AbortError'/);
  assert.match(api, /Probá de nuevo en unos minutos/);
});

test('landing has the approved message', () => {
  const landing = readIfPresent('client/src/landing/LandingApp.jsx');
  assert.match(landing, /Menos caos\. Más canchas en juego\./);
  assert.match(landing, /Quiero sumar mi club/);
});
