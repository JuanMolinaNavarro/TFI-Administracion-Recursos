# Unified Neumorphic Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the public site, admin panel and superadmin panel one light neumorphic look with the existing mint and emerald green.

**Architecture:** A new `theme.css` holds tokens and base states and loads first in all three apps. `admin.css` and `superadmin.css` are rewritten on those tokens, and off-style sections of `public.css` are converted. JSX stays unchanged except for theme imports and small audit fixes.

**Tech Stack:** React 19, Vite 8, plain CSS, `node --test`, Playwright browser tools.

**Spec:** `docs/superpowers/specs/2026-11-18-neumorphic-theme-design.md`

## Global Constraints

- Do not change features, data, API calls, routes or Spanish copy.
- Do not restyle `client/src/styles/ticket.css`.
- `#244f43`, `#0b3954`, `#104f75`, `DM Sans` and `Manrope` must be absent from `client/src` when finished.
- Keep existing breakpoints, drawer behavior and 44px touch targets.
- Keep every class selector that exists today in `admin.css` and `superadmin.css`, unless no JSX uses it.
- Data rows, table cells and calendar cells get no neumorphic shadows.
- Admin type: 14px body, 13px tables and secondary text, 12px captions and labels only. Touch-device inputs stay 16px.
- Do not commit unless the user asks. This overrides the usual commit step.

## Review Focus

- Long club names, emails and customer names should truncate or wrap, never push the layout wider.
- At 320px and 375px, the larger admin text should not cause sideways page scrolling.
- Focus rings on calendar slots and table buttons should stay visible inside scrolling containers.
- Disabled buttons and past calendar slots should look clearly unavailable, not merely flat like neumorphic controls at rest.
- Browser autofill and native date and select controls should keep readable text and the inset field look.

---

### Task 1: Shared theme foundation

**Files:**
- Create: `client/src/styles/theme.css`
- Create: `server/test/theme.test.cjs`
- Modify: `client/src/styles/public.css:1-30`, `client/src/styles/admin.css:1`, `client/src/styles/loader.css:25`
- Modify: `client/index.html:7,12`
- Modify: `client/src/public/PublicApp.jsx:9`, `client/src/admin/AdminApp.jsx:7`, `client/src/superadmin/SuperAdminApp.jsx:4`

**Interfaces:**
- Produces all tokens in the spec table, plus `--font-body`, `--font-brand`, `--shadow-modal` and the existing `--shadow-*`, `--accent-*`, `--border-radius-*` tokens.

- [ ] **Step 1: Write failing tests in `server/test/theme.test.cjs`**

Read files with `node:fs`. Name the tests and assert:

```js
test('theme defines shared tokens', () => {
  for (const token of ['--bg-color: #eef2f7', '--accent-text: #0a7954', '--control-edge: #7c8a9e',
    '--pending-bg: #fdf3dc', '--pending-text: #7a5a12', '--danger-strong: #a33d3d', '--divider: #d1d9e6'])
    assert.ok(theme.includes(token), token);
});
test('each app imports the theme before its own styles', () => {
  for (const [file, own] of apps) assert.ok(file.indexOf('styles/theme.css') > -1 && file.indexOf('styles/theme.css') < file.indexOf(own));
});
test('fonts load from the page and theme color matches the background', () => {
  assert.match(html, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com"/);
  assert.match(html, /family=Outfit[^"]+family=Plus\+Jakarta\+Sans/);
  assert.match(html, /name="theme-color" content="#eef2f7"/);
});
test('shared transition names its properties', () => assert.doesNotMatch(theme, /--transition-smooth:\s*all/));
```

- [ ] **Step 2: Run the test**

Run: `node --test server/test/theme.test.cjs`
Expected: FAIL because `theme.css` does not exist.

- [ ] **Step 3: Create `theme.css` and wire it in**

Move the `:root` block out of `public.css`, add spec tokens, `color-scheme: light`, body colors, `:focus-visible { outline: 2px solid var(--accent-text); outline-offset: 2px }`, and reduced-motion handling. Name `background-color`, `box-shadow`, `color`, `opacity` and `transform` in `--transition-smooth`. `--shadow-modal` is `0 24px 70px rgb(45 55 72 / .22)`. Remove CSS font imports. Add preconnect and one font stylesheet to `index.html`. Set the inline loader color in `loader.css` to `var(--text-secondary)`.

- [ ] **Step 4: Run the tests and build**

Run: `node --test server/test/theme.test.cjs` then `npm run build`
Expected: PASS and a successful build.

### Task 2: Public site restyle

**Files:**
- Modify: `client/src/styles/public.css:2105-2119,2172-2326,2416-2439`, plus focus rules that use `--accent-color`
- Modify: `client/src/styles/brand.css:25`
- Test: `server/test/theme.test.cjs`

**Interfaces:**
- Consumes: Task 1 tokens.

- [ ] **Step 1: Add a failing test** named `public styles use only theme colors for retired accents`, asserting `public.css` does not match `/#0b3954|#104f75|#5a6a85|#334155/i` and contains no `transition: all`.

- [ ] **Step 2: Run it**

Run: `node --test server/test/theme.test.cjs`
Expected: FAIL naming `public.css`.

- [ ] **Step 3: Restyle the public sections**

Apply these mappings:
- Plan cards: `--bg-color`, `--shadow-raised`, no border. The featured plan adds a 2px `--accent-dark` outline ring.
- Plan badge and CTAs: `--accent-gradient`, `--on-accent`, and `--accent-gradient-hover` on hover.
- Plan and sub-tab headings and icons: `--text-primary` or `--accent-text`.
- `.react-public-dialog`: no border, `--shadow-modal`.
- `.icon-button`: raised, inset when pressed.
- `.neumorphic-input`, search and location fields: add 1px `--control-edge`.
- `.booking-total`: `--divider` lines.

- [ ] **Step 4: Run tests**

Run: `node --test server/test/theme.test.cjs`
Expected: PASS.

### Task 3: Admin styles rewrite

**Files:**
- Modify: `client/src/styles/admin.css` (full rewrite as readable CSS)
- Test: `server/test/theme.test.cjs`

**Interfaces:**
- Consumes: Task 1 tokens. `superadmin.css` still uses `--line`, `--ink`, `--muted` until Task 4, so keep temporary aliases at the top of `admin.css` and delete them in Task 4.

- [ ] **Step 1: Save the current selector baseline**

Run `git show HEAD:client/src/styles/admin.css` and `git show HEAD:client/src/superadmin/superadmin.css`, then extract `.class` names to the session scratchpad.

- [ ] **Step 2: Add failing tests**

`admin styles drop the old palette and fonts` asserts no `/#244f43|DM Sans|Manrope|--font:/`. `data rows stay flat` asserts rule bodies for `.data-table td`, `.data-table tr`, `.calendar td` and `.reservation` have no `box-shadow`.

- [ ] **Step 3: Run them**

Run: `node --test server/test/theme.test.cjs`
Expected: FAIL naming `admin.css`.

- [ ] **Step 4: Rewrite `admin.css`**

Follow the spec's Component rules, Data areas and Typography sections. Sections in order: base, layout shell, sidebar, buttons, fields, cards and panels, toolbars, calendar, tables, courts, dialogs, login, toast, responsive. Use `outline-offset: -2px` for focus inside `.calendar-scroll` and `.table-scroll`. Give disabled controls `opacity: .55`, `box-shadow: none` and `cursor: not-allowed`. Add `:-webkit-autofill` rules using `--bg-color` and `--text-primary`. Set `min-width: 0` and truncation on sidebar text, breadcrumb, reservation names and metric labels.

- [ ] **Step 5: Run tests and build**

Run: `node --test server/test/theme.test.cjs` then `npm run build`
Expected: PASS and a successful build.

### Task 4: Superadmin and shared panel styles

**Files:**
- Modify: `client/src/superadmin/superadmin.css` (full rewrite as readable CSS)
- Modify: `client/src/styles/admin.css` (remove temporary aliases)
- Test: `server/test/theme.test.cjs`

**Interfaces:**
- Consumes: Task 1 tokens and Task 3 component look.

- [ ] **Step 1: Add failing tests**

`panel styles have no old variables` asserts `admin.css` and `superadmin.css` have no `var(--line)`, `var(--ink)`, `var(--muted)`, `var(--green)` or `var(--light)`. `retired design values are gone` scans all `.css` and `.jsx` in `client/src` for `/#244f43|#0b3954|#104f75|DM Sans|Manrope/`.

- [ ] **Step 2: Run them**

Run: `node --test server/test/theme.test.cjs`
Expected: FAIL naming `superadmin.css`.

- [ ] **Step 3: Rewrite `superadmin.css`**

Convert credential and reminder boxes to inset surfaces, upgrade cards and plan banners to raised surfaces, report tracks to inset, and report fills to `--accent-gradient`. Keep the touch rules at lines 7-21 unchanged in behavior.

- [ ] **Step 4: Compare selectors with the Task 3 baseline**

Run a scratch Node script listing baseline classes missing from the new CSS, and search JSX for each.
Expected: no missing class that JSX still uses.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test` then `npm run build`
Expected: all tests pass and the build succeeds.

### Task 5: Guidelines audit

**Files:**
- Modify: small fixes in `client/src/**/*.jsx`, `client/src/**/*.css`, `client/index.html`

**Interfaces:**
- Consumes: finished styles from Tasks 1-4.

- [ ] **Step 1: Audit each `.jsx` and `.css` file** against the guidelines fetched from `https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md`, recording findings as `file:line - issue`.

- [ ] **Step 2: Fix small safe findings**

Fix only those that keep behavior and copy intact, such as `type="button"`, `aria-label`, `aria-pressed`, `autocomplete`, image dimensions, and `transition: all`.

- [ ] **Step 3: Keep a list of larger findings** for the final report, such as URL-synced admin tabs or unsaved-change warnings. Do not implement them.

- [ ] **Step 4: Run tests and build**

Run: `npm test` then `npm run build`
Expected: all tests pass and the build succeeds.

### Task 6: Browser verification

**Files:**
- Modify: only CSS or JSX needed to fix issues found here

**Interfaces:**
- Consumes: `server/test/browser-fixture.cjs`, which serves `http://127.0.0.1:3001` from an in-memory database. Read its test accounts from that file and do not repeat the password in chat.

- [ ] **Step 1: Start the fixture in the background**

Run: `node server/test/browser-fixture.cjs`
Expected: it prints the QA URL.

- [ ] **Step 2: Check every screen at 1440px and 375px**

Cover the public catalog, bookings, plans, booking dialog and ticket; admin login and all admin sections, including the calendar, list and history modes; superadmin login and all sections; and at least one dialog in each panel.
Expected: consistent styling, no console errors.

- [ ] **Step 3: Run measured checks for Review Focus**

At 320px and 375px, assert `document.documentElement.scrollWidth <= innerWidth` on every section. Inject a 120-character club name, email and customer name through the page DOM and assert the same. Tab to a calendar slot and table button, assert a non-`none` computed outline, and confirm by screenshot that it isn't clipped. Assert past slots and disabled buttons have computed opacity below 1. Check autofill rules and native date and select controls by computed text color and screenshot.

- [ ] **Step 4: Fix issues, rerun affected checks, stop the fixture, and run `npm test` and `npm run build` one last time.**

Expected: all checks and tests pass.
