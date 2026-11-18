# Unified light neumorphic theme

Date: 2026-11-18
Status: waiting for approval

## Why

RTL currently looks like two products. The public site is soft and neumorphic with a mint green accent. The admin and superadmin panels are flat white with a dark forest green and different fonts. The club plans use navy. The whole site should read as one product, using the look and green the public site already has.

## Goals

- The public site, admin panel and superadmin panel share one background, shadow system, green accent and font family.
- Buttons and details use the existing mint and emerald green everywhere.
- Dark forest green (`#244f43`) and navy (`#0b3954`) no longer appear in the UI.
- Busy admin screens stay easy to scan.
- Controls stay easy to see and use, including by keyboard.
- The UI follows the Web Interface Guidelines where this work touches it.

## Non-goals

- No change to features, data, API calls, routes or Spanish copy.
- No dark mode.
- The printed booking ticket keeps its paper look (`ticket.css`). It is meant to look like a receipt, not like the interface around it.
- No rebuild of the UI as shared React components.

## Anti-goals

This fails, even if it matches visually, if:

- a table or calendar becomes harder to read because of shadows;
- an input, focused control or selected option becomes hard to find;
- a mobile screen loses its 44px touch targets or starts scrolling sideways.

## Approaches

1. **Shared theme file (chosen by the user).** One file holds the design values and base states. The admin and superadmin styles are rewritten on top of it, and the off-style public sections switch to it. It costs a large stylesheet change, and leaves one source of truth.
2. **Override layer.** A new stylesheet on top of the current admin styles. It is quicker, but two sets of rules compete and the old colors remain in the code.
3. **Shared React components.** Rejected. It touches nearly every screen and risks working features for a visual change.

## Decisions made by the user

- Use the light neumorphic style across the whole site, with the existing green for buttons and details.
- In admin screens, keep data flat: each table or calendar sits inside one raised panel, and rows and cells get no shadows of their own.
- Build it with a shared theme file.

## Design

### Theme file

Create `client/src/styles/theme.css`, imported first by `PublicApp.jsx`, `AdminApp.jsx` and `SuperAdminApp.jsx`. It contains:

- the tokens now at the top of `public.css`, keeping their names so existing public rules still work;
- font tokens: `--font-body` for Plus Jakarta Sans and `--font-brand` for Outfit;
- the new tokens below;
- shared base rules: `color-scheme: light`, body background and text color, `:focus-visible`, and reduced-motion handling.

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--bg-color` | `#eef2f7` | every page and raised surface | n/a |
| `--text-primary` | `#2d3748` | main text | 10.66:1 |
| `--text-secondary` | `#5d6b7f` | secondary text | 4.82:1 |
| `--accent-text` | `#0a7954` | green text, icons, focus ring | 4.82:1 |
| `--on-accent` | `#03291f` | text on green buttons | 6.17:1 or better |
| `--control-edge` (new) | `#7c8a9e` | 1px edge on inputs, selects, switches | 3.12:1 |
| `--pending-bg`, `--pending-text` (new) | `#fdf3dc`, `#7a5a12` | pending status | 5.77:1 |
| `--danger-light`, `--danger-strong` (new) | `#ffe8e8`, `#a33d3d` | cancelled status, destructive text | 5.46:1 |
| `--divider` (new) | `#d1d9e6` | row lines inside flat data areas | decorative |

`--transition-smooth` changes from `all` to a named list of properties. The focus ring changes from mint (1.25:1 on the background) to a 2px `--accent-text` outline with an offset.

### Component rules

| Element | Rest | Hover or focus | Pressed or selected |
|---|---|---|---|
| Primary button | green gradient, dark text, soft green shadow | lighter gradient | inset shadow |
| Secondary and icon button | raised | green text | inset shadow, green text |
| Input, select, search | inset, 1px `--control-edge` | focus ring | n/a |
| Tabs, filters, segmented control | inset track | green text | raised pill, green text |
| Sidebar item | flat | green text | raised, green text and icon |
| Card, panel, metric | raised, 16 to 24px radius, no border | unchanged unless clickable | n/a |
| Switch | inset track with edge | focus ring | green track |
| Dialog | theme background, soft dark shadow, no border | n/a | n/a |

### Data areas

- Table and calendar headers are flat and opaque, so sticky headers stay readable.
- Rows and cells use thin `--divider` lines and no shadows.
- Confirmed calendar blocks use `--accent-light` with a green left edge. Pending blocks use the pending colors.
- Free calendar slots stay plain until hover or focus.
- Numeric table columns use tabular numerals.

### Typography

Admin and superadmin move from DM Sans and Manrope to Plus Jakarta Sans. Outfit stays for the RTL brand name. Admin text goes from mostly 12px to 14px for body, 13px for tables and secondary text, and 12px only for captions and labels. Font loading moves from CSS imports to `client/index.html`, with preconnect.

### Files

- **New:** `client/src/styles/theme.css`.
- **Rewritten as readable CSS:** `client/src/styles/admin.css`, `client/src/superadmin/superadmin.css`.
- **Edited:** `client/src/styles/public.css` (tokens move out; plans, invite banner, sub-tabs, dialogs and icon buttons are restyled), `client/src/styles/brand.css`, `client/src/styles/loader.css` (loader text color).
- **Edited:** `client/index.html` (fonts; `theme-color` becomes `#eef2f7`).
- **Small edits:** the three app entry files add the theme import. JSX changes only where the audit needs them.

The existing responsive breakpoints, drawer behavior and 44px touch rules carry over.

### Guidelines audit

After restyling, audit `client/src` file by file against the Web Interface Guidelines. Fix small issues in markup and CSS that don't change behavior, such as missing labels. List anything larger for the user instead of expanding this work.

## Verification

- `npm run build` and `npm test` pass.
- Search confirms `#244f43`, `#0b3954`, `DM Sans` and `Manrope` are gone from `client/src`.
- Browser check at desktop and 375px wide: public catalog, bookings, plans, booking dialog, ticket, both login screens, and each admin and superadmin section.
- Admin and superadmin screens are checked through the project's disposable QA server (`server/test/browser-fixture.cjs`), which uses an in-memory database, so no real data is read or changed.
- Keyboard check: focus is visible on buttons, links, inputs, tabs and calendar slots.

## Left to the builder

Exact spacing, shadow size on small elements, and the order of rules within each stylesheet, as long as they follow the rules above.
