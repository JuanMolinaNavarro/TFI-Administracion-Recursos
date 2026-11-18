# Landing para clubes: plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar en `/clubes/` una landing llamativa que lleve a los clubes a solicitar el alta en RTL.

**Architecture:** `main.jsx` carga un módulo React propio para `/clubes`. La página reutiliza `theme.css`, `ClubModal` y una fuente compartida de datos de planes. Las capturas son archivos WebP estáticos con datos ficticios.

**Tech Stack:** React 19, Vite 8, CSS, servidor Node, `node --test`, herramientas de navegador Playwright.

**Spec:** `docs/superpowers/specs/2026-11-18-landing-clubes-design.md`

## Global Constraints

- Trabajar en la rama `feat/landing-clubes`, creada desde `main`.
- No hacer commit ni push salvo pedido del usuario.
- No cambiar el comportamiento del buscador, las reservas ni los paneles.
- No incluir testimonios, cifras de clientes ni nombres de clubes o personas reales.
- Mantener textos y precios actuales de Pro, Elite y la garantía de "Sobre Nosotros".
- Título del hero: `Menos caos. Más canchas en juego.`
- Botón principal: `Quiero sumar mi club`. Plan enviado por botones generales: `Personalizado`, precio `A convenir`.
- Controles táctiles de al menos 44px y sin desplazamiento lateral a 320px.

## Review Focus

- Si falla JavaScript de animación o no existe `IntersectionObserver`, todo el contenido debe seguir visible.
- Si una captura no carga, su espacio y su texto alternativo deben mantener la página ordenada.
- Si `/api/club-requests` rechaza el envío, el formulario debe seguir abierto y mostrar el error.
- `/clubes` y una recarga directa de `/clubes/` deben funcionar en el servidor propio y en Vercel.
- A 320px, las capturas superpuestas del hero no deben tapar el texto ni los botones.

---

### Task 1: Ruta y estructura inicial

**Files:**
- Create: `client/src/landing/LandingApp.jsx`, `client/src/landing/landing.css`, `server/test/landing.test.cjs`
- Modify: `client/src/main.jsx:4-8`, `server/frontend.cjs:13`, `server/index.cjs:377`, `vercel.json`

**Interfaces:**
- Produces: `export default function LandingApp()`, `/clubes/`, y la redirección de `/clubes` a `/clubes/`.

- [ ] **Step 1: Escribir pruebas que fallen** en `server/test/landing.test.cjs`:
  - `landing route loads its own app`: `main.jsx` contiene `startsWith('/clubes')` y `./landing/LandingApp.jsx`.
  - `server and Vercel serve the landing`: `frontend.cjs` incluye `'/clubes/'`, `index.cjs` incluye `'/clubes'` en la redirección, y `vercel.json` tiene rewrites para `/clubes` y `/clubes/(.*)`.
  - `landing has the approved message`: `LandingApp.jsx` contiene el título y botón de Global Constraints.

- [ ] **Step 2: Ejecutar** `node --test server/test/landing.test.cjs`. Esperado: FAIL por archivos o rutas faltantes.

- [ ] **Step 3: Implementar la ruta y una página mínima** con `theme.css`, `landing.css`, `document.title = 'RTL para clubes'`, meta descripción y hero semántico.

- [ ] **Step 4: Ejecutar** `node --test server/test/landing.test.cjs` y `npm run build`. Esperado: PASS y build correcto.

### Task 2: Datos de planes y alta

**Files:**
- Create: `client/src/public/clubPlans.js`
- Modify: `client/src/public/About.jsx:188-256`, `client/src/landing/LandingApp.jsx`
- Test: `server/test/landing.test.cjs`

**Interfaces:**
- Produces: `export const clubPlans`, array de `{ name, price, period, description, featured, features }`; `export const customPlan = { name: 'Personalizado', price: 'A convenir' }`; `export const planGuarantee = { title, text }`.
- Consumes: `ClubModal({ plan, onClose })`, con `plan.price` igual a `$50.000 /mes` o `$100.000 /mes`.

- [ ] **Step 1: Agregar pruebas que fallen:** `plans keep the published offer` valida Pro, Elite, precios y todas las funciones actuales; `about and landing share plans` valida que ambos importen `clubPlans.js`; `landing opens the club request form` valida `ClubModal` y `customPlan`.

- [ ] **Step 2: Ejecutar** `node --test server/test/landing.test.cjs`. Esperado: FAIL por `clubPlans.js`.

- [ ] **Step 3: Extraer los datos, renderizarlos en `About` sin cambiar su resultado y conectar los botones de la landing al modal.**

- [ ] **Step 4: Ejecutar** `node --test server/test/landing.test.cjs` y `npm test`. Esperado: PASS.

### Task 3: Capturas ficticias

**Files:**
- Create: `assets/landing/panel-desktop.webp`, `panel-mobile.webp`, `agenda.webp`, `canchas.webp`, `cobros.webp`
- Test: `server/test/landing.test.cjs`

**Interfaces:**
- Produces: rutas públicas `/assets/landing/<archivo>.webp`.

- [ ] **Step 1: Agregar prueba que falle** `landing screenshots are present and light`: los cinco archivos existen, comienzan con cabecera WebP y pesan menos de 300 KB.

- [ ] **Step 2: Ejecutar** `node --test server/test/landing.test.cjs`. Esperado: FAIL por archivos faltantes.

- [ ] **Step 3: Generar las capturas**

Iniciar `node server/test/browser-fixture.cjs`. En Playwright, interceptar `/api/catalog`, `/api/auth/me` y `/api/admin/bookings` para mostrar `Complejo Demo RTL`, `San Miguel de Tucumán`, `admin@demo-rtl.test` y reservas de clientes ficticios. Capturar a 1440×900 las vistas de reservas, canchas y pagos, y a 390×844 el panel móvil. Guardar como WebP.

- [ ] **Step 4: Revisar visualmente cada archivo.** Esperado: ningún club, correo o persona real.

- [ ] **Step 5: Ejecutar** `node --test server/test/landing.test.cjs`. Esperado: PASS.

### Task 4: Página completa y accesos

**Files:**
- Modify: `client/src/landing/LandingApp.jsx`, `client/src/landing/landing.css`, `client/src/public/Footer.jsx`, `client/src/public/PublicApp.jsx`
- Test: `server/test/landing.test.cjs`

**Interfaces:**
- Consumes: datos de Task 2 y capturas de Task 3.

- [ ] **Step 1: Agregar pruebas que fallen:** `landing includes every approved section` busca beneficios, recorrido, cómo empezar, planes y cierre; `landing images reserve space` exige `width`, `height` y `alt` en cada captura; `public site links to clubs` busca `href="/clubes/"` en footer y menú móvil; `reveal stays visible without JavaScript support` exige que el contenido solo se oculte bajo una clase agregada por JS.

- [ ] **Step 2: Ejecutar** `node --test server/test/landing.test.cjs`. Esperado: FAIL en esas pruebas.

- [ ] **Step 3: Implementar secciones y estilos** según el mockup `landing-mezcla-bc.html` y el spec. Prioridad de carga solo para la captura principal, `loading="lazy"` en el resto, y movimiento desactivado con `prefers-reduced-motion`.

- [ ] **Step 4: Ejecutar** `npm test` y `npm run build`. Esperado: PASS y build correcto.

### Task 5: Verificación en navegador

**Files:**
- Modify: solo lo necesario para corregir problemas encontrados

**Interfaces:**
- Consumes: servidor `server/test/browser-fixture.cjs`.

- [ ] **Step 1: Comprobar `/clubes` y `/clubes/`, incluida la recarga directa.**

- [ ] **Step 2: Comprobar 1440, 768, 375 y 320 px.** Esperado: `scrollWidth <= innerWidth`, sin solapamiento de texto y sin errores de consola.

- [ ] **Step 3: Probar Review Focus:** bloquear `IntersectionObserver`, una imagen y una respuesta de `/api/club-requests`.

- [ ] **Step 4: Enviar una solicitud válida** y comprobar que aparece en superadmin con el plan correcto.

- [ ] **Step 5: Probar teclado:** foco visible en navegación, botones, modal y cierre.

- [ ] **Step 6: Ejecutar** `npm test` y `npm run build`. Esperado: PASS y build correcto.
