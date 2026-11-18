const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const client = path.join(__dirname, '..', '..', 'client');
const read = file => fs.readFileSync(path.join(client, file), 'utf8');
const readIfPresent = file => fs.existsSync(path.join(client, file)) ? read(file) : '';

test('theme defines shared tokens', () => {
  const theme = readIfPresent('src/styles/theme.css');
  for (const token of ['--bg-color: #eef2f7', '--accent-text: #0a7954', '--control-edge: #7c8a9e',
    '--pending-bg: #fdf3dc', '--pending-text: #7a5a12', '--danger-strong: #a33d3d', '--divider: #d1d9e6'])
    assert.ok(theme.includes(token), `missing ${token}`);
});

test('each app imports the theme before its own styles', () => {
  const apps = [['src/public/PublicApp.jsx', 'styles/public.css'], ['src/admin/AdminApp.jsx', 'styles/admin.css'], ['src/superadmin/SuperAdminApp.jsx', 'styles/admin.css']];
  for (const [file, own] of apps) {
    const source = read(file), theme = source.indexOf('styles/theme.css');
    assert.ok(theme > -1 && theme < source.indexOf(own), `${file} must import the theme first`);
  }
});

test('fonts load from the page and theme color matches the background', () => {
  const html = read('index.html');
  assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com"/);
  assert.match(html, /family=Outfit[^"]+family=Plus\+Jakarta\+Sans/);
  assert.match(html, /name="theme-color" content="#eef2f7"/);
});

test('public styles use only theme colors for retired accents', () => {
  const css = read('src/styles/public.css');
  assert.doesNotMatch(css, /#0b3954|#104f75|#5a6a85|#334155|rgba\(11, 57, 84/i);
  assert.doesNotMatch(css, /transition:\s*all/);
});

test('public fields show a visible edge and a strong focus ring', () => {
  const css = read('src/styles/public.css');
  for (const selector of ['.search-input', '.location-select', '.neumorphic-input']) {
    const rule = css.match(new RegExp(`${selector.replace('.', '\\.')}\\s*\\{([^}]*)\\}`));
    assert.ok(rule, `missing ${selector}`);
    assert.match(rule[1], /var\(--control-edge\)/, selector);
  }
  assert.doesNotMatch(css, /0 0 0 2px var\(--accent-color\)/);
});

const declarationsFor = (css, selector) => [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  .filter(([, selectors]) => selectors.split(',').map(item => item.trim()).includes(selector))
  .map(([, , body]) => body).join(';');

test('admin styles drop the old palette and fonts', () => {
  assert.doesNotMatch(read('src/styles/admin.css'), /#244f43|DM Sans|Manrope|--font:/i);
});

test('data rows stay flat inside raised panels', () => {
  const css = read('src/styles/admin.css');
  assert.match(declarationsFor(css, '.panel'), /box-shadow:\s*var\(--shadow-raised\)/);
  for (const selector of ['.data-table td', '.data-table tr', '.calendar td', '.reservation', '.slot-free'])
    assert.doesNotMatch(declarationsFor(css, selector), /box-shadow/, selector);
});

test('panel controls stay findable', () => {
  const css = read('src/styles/admin.css');
  assert.match(declarationsFor(css, 'label input'), /var\(--control-edge\)/);
  assert.match(declarationsFor(css, '.calendar-scroll :focus-visible'), /outline-offset:\s*-2px/);
  assert.match(declarationsFor(css, '.table-scroll :focus-visible'), /outline-offset:\s*-2px/);
  assert.match(declarationsFor(css, 'button:disabled'), /opacity:\s*\.55/);
  assert.match(declarationsFor(css, '.slot-free:disabled'), /opacity:\s*\.55/);
});

test('autofilled fields keep theme colors', () => {
  const css = read('src/styles/theme.css');
  assert.match(css, /input:-webkit-autofill/);
  assert.match(css, /-webkit-text-fill-color:\s*var\(--text-primary\)/);
});

test('panel styles have no old variables', () => {
  for (const file of ['src/styles/admin.css', 'src/superadmin/superadmin.css'])
    assert.doesNotMatch(read(file), /var\(--(line|ink|muted|green|light|bg|surface|font)\)/, file);
});

test('retired design values are gone from the client', () => {
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : /\.(css|jsx)$/.test(entry.name) ? [full] : [];
  });
  for (const file of walk(path.join(client, 'src')))
    assert.doesNotMatch(fs.readFileSync(file, 'utf8'), /#244f43|#0b3954|#104f75|DM Sans|Manrope/i, file);
});

test('segmented controls and the mobile menu expose their state', () => {
  assert.match(read('src/admin/ReservationViews.jsx'), /aria-pressed=\{mode === key\}/);
  assert.match(read('src/admin/BusinessViews.jsx'), /aria-pressed=\{filter === id\}/);
  assert.match(read('src/superadmin/SuperAdminApp.jsx'), /mobile-menu" aria-label="Abrir navegación" aria-expanded=\{drawer\}/);
});

test('footer home control is a real button', () => {
  const footer = read('src/public/Footer.jsx');
  assert.match(footer, /<button type="button" className="mini-footer-brand"/);
  assert.doesNotMatch(footer, /<div className="mini-footer-brand"/);
});

test('images reserve their space', () => {
  for (const file of ['src/admin/AdminApp.jsx', 'src/superadmin/SuperAdminApp.jsx', 'src/admin/Courts.jsx', 'src/admin/Forms.jsx', 'src/public/Footer.jsx'])
    for (const [tag] of read(file).matchAll(/<img\b[^>]*>/g))
      assert.match(tag, /width="\d+" height="\d+"/, `${file}: ${tag}`);
});

test('autofilled public fields keep their focus ring', () => {
  const css = read('src/styles/public.css');
  for (const selector of ['.neumorphic-input:-webkit-autofill:focus', '.search-input:-webkit-autofill:focus'])
    assert.match(declarationsFor(css, selector), /0 0 0 2px var\(--accent-text\)/, selector);
});

test('long names stay inside panels and dialogs', () => {
  const admin = read('src/styles/admin.css');
  for (const selector of ['.eyebrow', '.panel-heading h2', '.dialog-intro', 'dialog p', '.session-context'])
    assert.match(declarationsFor(admin, selector), /overflow-wrap:\s*anywhere/, selector);
  assert.match(declarationsFor(admin, '.session-context'), /max-width:\s*100%/);
  assert.match(declarationsFor(read('src/superadmin/superadmin.css'), '.super-filter'), /max-width:\s*100%/);
});

test('focus stays clear of sticky headers and panel edges', () => {
  const css = read('src/styles/admin.css');
  assert.match(declarationsFor(css, '.calendar-scroll'), /scroll-padding-top:\s*84px/);
  for (const selector of ['.calendar-scroll:focus-visible', '.table-scroll:focus-visible'])
    assert.match(declarationsFor(css, selector), /outline-offset:\s*-2px/, selector);
});

test('placeholders use readable theme text', () => {
  const rule = declarationsFor(read('src/styles/theme.css'), '::placeholder');
  assert.match(rule, /color:\s*var\(--text-secondary\)/);
  assert.match(rule, /opacity:\s*1/);
});

test('public action buttons look unavailable while disabled', () => {
  const css = read('src/styles/public.css');
  for (const selector of ['.plan-cta-btn:disabled', '.book-btn:disabled', '.cancel-booking-btn:disabled']) {
    const rule = declarationsFor(css, selector);
    assert.match(rule, /opacity:\s*\.55/, selector);
    assert.match(rule, /box-shadow:\s*none/, selector);
    assert.match(rule, /transform:\s*none/, selector);
  }
});

test('shared transition names its properties', () => {
  const theme = readIfPresent('src/styles/theme.css');
  assert.match(theme, /--transition-smooth:/);
  assert.doesNotMatch(theme, /--transition-smooth:\s*all/);
});
