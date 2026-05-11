# MOCKUP_HANDOFF.md

Documento de handoff del mockup `MockUp/` (HeyMozo Mockup) hacia el proyecto destino `HeyMozo`. Pensado como única fuente de verdad para portar el front. Generado desde la rama `feat/unified-headers`, commit base `c614251 feat: MVP simplification for pitch — remove Factura A & AI, redesign Pulso/Club/PostPago`.

> Nota cabecera: HeyMozo destino corre React 18 + Router 6. El mockup corre React 19 + Router 7. Las diferencias relevantes están marcadas en la sección 1.

---

## 1. Stack y dependencias

### Runtime
- **React 19** (`react@^19.2.0`, `react-dom@^19.2.0`) — JSX puro, sin TypeScript. **HeyMozo destino: React 18.** Diferencias prácticas a tener en cuenta al portar:
  - No usamos APIs nuevas de React 19 (Actions, `use()`, `useFormStatus`). Todo es `useState` / `useEffect` / `useSyncExternalStore`. Compatible 100% con React 18.
  - `useSyncExternalStore` se usa en [src/lib/loyaltyStore.js](src/lib/loyaltyStore.js) — existe en React 18 también.
- **React Router 7** (`react-router-dom@^7.0.0`) — usamos `BrowserRouter`, `Routes`, `Route`, `Navigate`, `useNavigate`, `useLocation`, `Link`. Todo es API compatible con React Router 6. Sin loaders, sin data router, sin nested routes con `<Outlet />` (excepto un wildcard `/mozo/*`).
- **Vite 8** (`vite@^8.0.0-beta.13`) con `@vitejs/plugin-react-swc`. HeyMozo destino probablemente está en CRA o un Vite anterior — el JSX y los imports son intercambiables.

### Build / Tooling
- ESLint 9 con `eslint-plugin-react-hooks` y `eslint-plugin-react-refresh`.
- Sin tests (no hay Jest/Vitest configurado).
- Sin TypeScript. Todo `.jsx`.

### UI / CSS
- **Tailwind CSS 4** (`tailwindcss@^4.2.1`) vía `@tailwindcss/vite`. No hay `tailwind.config.js` — la config va dentro de `@theme {}` en CSS (CSS-first).
- **HeroUI beta** (`@heroui/react@beta`, `@heroui/styles@beta`) — instalado pero **prácticamente sin usar**. Solo aparece en [src/components/PayModal.jsx](src/components/PayModal.jsx) que es código muerto (no referenciado por ninguna ruta). Se puede ignorar al portar.
- **`tslib`** — peer-dep arrastrada por HeroUI.

### Estado / Persistencia
- No hay Redux, Zustand, Jotai, Context API, ni React Query. **El estado vive en localStorage** y se sincroniza vía un patrón propio:
  - `localStorage.setItem(KEY, JSON.stringify(value))` para escribir.
  - `window.dispatchEvent(new CustomEvent('hm-...-changed'))` para notificar la pestaña actual.
  - `window.dispatchEvent(new StorageEvent('storage', ...))` para forzar notificación cross-window cuando hace falta.
  - Listeners en `storage` (cross-tab nativo) + custom events (same-tab).
  - Polling cada 1–1.5s en algunos stores como fallback ([src/lib/cajaStore.js:55](src/lib/cajaStore.js#L55)).
- Hooks reactivos por store: `useAlerts()`, `useCart()`, `useOrder()`, `useCajaAlerts()`, `useLoyalty()`, `useFacturasA()`. Devuelven el snapshot actual y se re-suscriben en mount.
- Estado top-level (`mesa6Status`, etc.) vive en `App.jsx` con un hook custom `usePersistedState` que escribe a localStorage y escucha `storage` events.

### package.json — deps relevantes (resumido)
```json
{
  "dependencies": {
    "react": "^19.2.0",
    "react-dom": "^19.2.0",
    "react-router-dom": "^7.0.0",
    "tailwindcss": "^4.2.1",
    "@tailwindcss/vite": "^4.2.1",
    "@heroui/react": "beta",       // descartar al portar — no se usa
    "@heroui/styles": "beta",      // descartar al portar — no se usa
    "tslib": "^2.8.1"              // peer de HeroUI — descartar
  }
}
```

### Approach de estilos (resumen, los detalles van en sección 5)
- **Híbrido Tailwind + inline `style={{ }}` + clases CSS plano**, en ese orden de frecuencia.
- Tailwind para layout (`flex`, `grid`, `gap-*`, `px-*`, `text-*`), responsive (`md:`, `lg:`), tipografía base, colores estándar.
- `style={{ }}` inline para **todo lo que es spacing/padding/margins generoso, gradientes, sombras y colores específicos** (paleta no presente en Tailwind por defecto, como `#1a1c29`, `#13eca7`, `#9333ea`, `#e8362a`). Esto es **deliberado** — ver sección 13.
- CSS clases nombradas en [src/styles/heymozo.css](src/styles/heymozo.css) y [src/App.css](src/App.css) — legacy. Solo se usan en algunos lugares (`.phone`, `.cliente-header`, `.alert-card`, `.action-btn`, `.btn-blue`, etc.). El mockup está migrando a Tailwind+inline y la mayoría de pantallas nuevas ya no usan estas clases.
- Sin CSS Modules, sin styled-components, sin Emotion.

---

## 2. Estructura de carpetas

```
src/
├── App.jsx                  # BrowserRouter + Routes + estado top-level (mesa1/2/6 Status)
├── App.css                  # Estilos legacy (.phone-cliente, .cliente-header, etc.)
├── main.jsx                 # ReactDOM.createRoot
├── index.css                # Tailwind base + @theme {} + body bg
├── components/
│   ├── AlertCard.jsx        # Tarjeta de alerta para vista mozo (variants: red/orange/yellow/paid/purple)
│   ├── AlertModal.jsx       # Modal genérico de alerta (emoji + label + acción)
│   ├── BottomNav.jsx        # Vacío — `return null` (legacy)
│   ├── ClienteHeader.jsx    # Header viejo del cliente (legacy, no usado)
│   ├── Header.jsx           # Header genérico vista mozo (logo + sector picker + settings)
│   ├── MesaCard.jsx         # Tarjeta de mesa (legacy, no usado por rutas activas)
│   ├── OrderDetailModal.jsx # Modal lista de items del pedido (purple header)
│   ├── PayModal.jsx         # Modal de pago con HeroUI — código muerto
│   ├── Phone.jsx            # Wrapper `<div className="phone">{children}</div>`
│   ├── Sidebar.jsx          # Sidebar de vista mozo (solo desktop, colapsable)
│   └── StatusBar.jsx        # Barra superior con hora/wifi/batería (frame de phone)
├── data/
│   └── menuItems.js         # Único archivo de datos — menú hardcoded (4 categorías, 11 items)
├── lib/
│   ├── alertStore.js        # Store de alertas activas (vista mozo) + useAlerts()
│   ├── cajaStore.js         # Store de alertas de cajero (pagos confirmados) + useCajaAlerts()
│   ├── cartStore.js         # Carrito + pedido confirmado + useCart() + useOrder()
│   ├── facturasAStore.js    # Store de facturas A — NO se usa (legacy, eliminado del MVP)
│   └── loyaltyStore.js      # Registry de teléfonos VIP + useLoyalty() + registerVisit
├── pages/
│   ├── ActiveAlertsPage.jsx       # Vista mozo: grid de cards de alerta + modales
│   ├── CajeroLayout.jsx           # Vista cajero/dueño: dashboard con 5 tabs (Pulso, Acciones, Pagos, Reseñas, Club)
│   ├── CartPage.jsx               # Cliente: revisar carrito antes de confirmar
│   ├── ClientePage.jsx            # Cliente: landing post-QR (3 botones grandes)
│   ├── ConfirmadoPage.jsx         # Cliente: pedido enviado a cocina
│   ├── EfectivoPage.jsx           # Cliente: confirmación de pago en efectivo
│   ├── MenuPage.jsx               # Cliente: browse menú + agregar al carrito
│   ├── ModoPagoLitePage.jsx       # Cliente: pago sin pedido previo por app (Lite)
│   ├── MozoLayout.jsx             # Shell de vista mozo (header + ActiveAlertsPage)
│   ├── PagarPage.jsx              # Cliente: pago + propina + dividir cuenta + métodos
│   ├── PosnetPage.jsx             # Cliente: confirmación pago tarjeta/MODO
│   ├── PostPagoPage.jsx           # Cliente: thank-you + rating + club VIP (post-pago)
│   ├── TransferenciaPage.jsx      # Cliente: pago vía transferencia (alias)
│   └── ValidandoTransferenciaPage.jsx  # Cliente: spinner mientras cajero aprueba
└── styles/
    └── heymozo.css          # Estilos legacy nombrados (.alert-card, .modal-overlay, .btn-blue, etc.)
```

`public/` contiene solo:
- `HeyMozo.jpeg` — logo (38×38 redondeado, usado en Header.jsx, Sidebar.jsx, ClientePage.jsx footer)
- `vite.svg` — favicon default de Vite

---

## 3. Inventario de pantallas / rutas

| Componente | Ruta | Archivo | Estado |
|---|---|---|---|
| ClientePage | `/` → `/cliente` (redirect via Navigate) | [src/pages/ClientePage.jsx](src/pages/ClientePage.jsx) | completa |
| ClientePage | `/cliente` | [src/pages/ClientePage.jsx](src/pages/ClientePage.jsx) | completa |
| MenuPage | `/cliente/menu` | [src/pages/MenuPage.jsx](src/pages/MenuPage.jsx) | completa |
| CartPage | `/cliente/pedido` | [src/pages/CartPage.jsx](src/pages/CartPage.jsx) | completa |
| ConfirmadoPage | `/cliente/confirmado` | [src/pages/ConfirmadoPage.jsx](src/pages/ConfirmadoPage.jsx) | completa |
| PagarPage | `/cliente/pagar` | [src/pages/PagarPage.jsx](src/pages/PagarPage.jsx) | completa |
| TransferenciaPage | `/cliente/transferencia` | [src/pages/TransferenciaPage.jsx](src/pages/TransferenciaPage.jsx) | completa |
| PosnetPage | `/cliente/posnet` | [src/pages/PosnetPage.jsx](src/pages/PosnetPage.jsx) | completa |
| EfectivoPage | `/cliente/efectivo` | [src/pages/EfectivoPage.jsx](src/pages/EfectivoPage.jsx) | completa |
| ValidandoTransferenciaPage | `/cliente/validando-transferencia` | [src/pages/ValidandoTransferenciaPage.jsx](src/pages/ValidandoTransferenciaPage.jsx) | completa |
| ModoPagoLitePage | `/cliente/pago-lite` | [src/pages/ModoPagoLitePage.jsx](src/pages/ModoPagoLitePage.jsx) | completa |
| PostPagoPage | `/cliente/post-pago` | [src/pages/PostPagoPage.jsx](src/pages/PostPagoPage.jsx) | completa |
| MozoLayout (+ ActiveAlertsPage) | `/mozo/*` | [src/pages/MozoLayout.jsx](src/pages/MozoLayout.jsx) | completa |
| CajeroLayout | `/cajero` | [src/pages/CajeroLayout.jsx](src/pages/CajeroLayout.jsx) | completa |

### Detalle por pantalla

#### `/cliente` — ClientePage
- **Propósito**: pantalla de aterrizaje del cliente tras escanear el QR. Saludo "¡Hola!" + 3 botones grandes (Ver Menú, Llamar al Mozo, Pagar/Propina) + badge VIP Club si hay teléfono registrado.
- **Mapeo a HeyMozo**: **equivalente al `/user/:companyId/:branchId/:tableId` (UserScreen) con cambios mayores**. HeyMozo destino hoy tiene 3 botones (mozo, cuenta, encargado). Aquí los 3 botones son distintos (Ver Menú, Llamar al Mozo, Pagar) y son mucho más visuales (gradient shadows, colores morado/naranja/verde). Hay que reemplazar la UserScreen actual por esta.
- **Componentes que usa**: `<Phone>`, modales inline (sesión activa, voucher VIP, llamar al mozo bottom sheet).
- **Mock data**: `QUICK_ACTIONS` (Hielo, Condimentos, Servilletas, Limpiar mesa). Lee `useLoyalty()`. Si hay pedido previo en `hm_order`, muestra modal "Parece que quedó una cuenta abierta".

#### `/cliente/menu` — MenuPage
- **Propósito**: browse del menú agrupado por categorías (pills horizontales sticky), cards con foto + descripción + precio + botón "Agregar". Bottom bar morada con total cuando hay items.
- **Mapeo a HeyMozo**: **nueva** (HeyMozo destino solo tiene un link a menú externo PDF, no menú interactivo). Esta es una capability nueva — ver sección 9.
- **Componentes**: `<Phone>`, bottom sheet de carrito.
- **Mock data**: `menuCategories` de [src/data/menuItems.js](src/data/menuItems.js).

#### `/cliente/pedido` — CartPage
- **Propósito**: ver carrito antes de confirmar. Dos secciones: "Agregando ahora" (editable, ±qty) y "Ya enviado a cocina" (read-only). CTA "Confirmar Pedido" / "Añadir al pedido".
- **Mapeo a HeyMozo**: **nueva** (depende del menú interactivo).
- **Lógica clave**: al confirmar, si ya existe una alerta `purple` ("Nuevo Pedido") sin atender por el mozo, **mergea** los items nuevos en esa alerta. Si no, crea una alerta nueva. Ver [src/pages/CartPage.jsx:29-57](src/pages/CartPage.jsx#L29-L57).

#### `/cliente/confirmado` — ConfirmadoPage
- **Propósito**: animación de check + "Pedido en marcha" + total + botón volver.
- **Mapeo a HeyMozo**: **nueva**.
- **Componentes**: solo inline.

#### `/cliente/pagar` — PagarPage
- **Propósito**: ticket de items + propina (10%/15%/Otro/Nada) + total grande + 4 métodos de pago (Mercado Pago, Transferencia, Tarjeta/MODO, Efectivo) + dividir cuenta (bottom sheet informativo).
- **Mapeo a HeyMozo**: **nueva** (no hay pasarela de pagos en HeyMozo destino).
- **Componentes**: inline modals (Dividir Cuenta, Cuánto vas a pagar con MP).
- **Mock data**: lee `getOrder()` y `getOrderTotal()`. Si no hay pedido, deshabilita métodos excepto MP (que paga solo propina).

#### `/cliente/transferencia` — TransferenciaPage
- **Propósito**: muestra alias (`CERVECERIA.HEYMOZO`), titular, CUIT, monto. Botón "Ya realice la transferencia" → setea `mesa6Status=WAITING` + guarda `hm_mesa6_transfer_amount` + navega a validando.
- **Mapeo a HeyMozo**: **nueva**. Importante: el lado del cajero tiene que aprobar/rechazar — ver sección 11.

#### `/cliente/posnet` — PosnetPage
- **Propósito**: "Posnet en camino" + total con propina sumada (×1.1) + ícono animado glow.
- **Mapeo a HeyMozo**: **nueva**.

#### `/cliente/efectivo` — EfectivoPage
- **Propósito**: "Mozo en camino" + total + ícono animado.
- **Mapeo a HeyMozo**: **nueva**.

#### `/cliente/validando-transferencia` — ValidandoTransferenciaPage
- **Propósito**: spinner girando + "Aviso enviado a la caja" + tarjeta de "¿estás apurado?" + escape link. Polea `mesa6Status` cada 1s — si pasa a `APPROVED` redirige a `/cliente/post-pago?pagoConfirmado=true`; si pasa a `REJECTED` muestra estado de error.
- **Mapeo a HeyMozo**: **nueva**. Comportamiento: polling en el cliente del estado de validación del cajero.

#### `/cliente/pago-lite` — ModoPagoLitePage
- **Propósito**: modo alternativo para clientes que **NO pidieron por la app** (escanearon QR solo para pagar). Tabs `full` (pagar todo) vs `tip` (solo propina). Si pago digital, pasa a `step=digital` y muestra input de monto + propina + botones MP / Transferencia.
- **Mapeo a HeyMozo**: **nueva**. Este es el caso de uso más probable para el rollout inicial (no requiere migrar la cocina).

#### `/cliente/post-pago` — PostPagoPage
- **Propósito**: thank-you + rating de estrellas + (rating ≥4 → CTA Google Maps; rating ≤3 → tags de queja + textarea privada) + sección Club VIP (3 estados: voucher recién desbloqueado / visita sumada / cliente nuevo input de teléfono).
- **Mapeo a HeyMozo**: **nueva**. Es la pantalla más importante para captar reviews y club.
- **Lógica clave**: limpia `hm_cart`/`hm_order` al montar. Si hay teléfono activo, llama a `registerVisit(activePhone)` automáticamente una sola vez (guard `hm_visit_counted` en sessionStorage).

#### `/mozo/*` — MozoLayout + ActiveAlertsPage
- **Propósito**: vista del mozo en su celular/tablet. Grid de cards de alerta (Mesa 1 pago Tarjeta, Mesa 2 pago Efectivo, Mesa 5 pedido de hielo + cualquier alerta dinámica creada por el cliente). Tap card → modal de detalle con LISTO. Las alertas se encadenan: si una mesa tiene 3 alertas distintas, abrir la card abre un queue de modales secuenciales.
- **Mapeo a HeyMozo**: **equivalente al `/admin/:companyId/:branchId` (AdminScreen) con cambios significativos**. HeyMozo destino ya tiene dashboard tiempo real con polling — la lógica de tiempo real ya existe pero hay que cambiar **el modelo de cards**: en lugar de filas/grid de mesas con timeline, son **cards apiladas por urgencia** con colores semánticos (rojo = cobro, púrpura = pedido, naranja = pedido de mozo, verde = pago confirmado).
- **Componentes**: `<Header>`, `<AlertCard>`, `<AlertModal>`, `<OrderDetailModal>`.

#### `/cajero` — CajeroLayout
- **Propósito**: dashboard del dueño/cajero. **5 tabs**: Pulso (KPIs + dato clave + top pedidos + motivos de queja), Acciones (feed de validación de transferencias + acuses de pagos MP), Historial de Pagos (tabla mobile/desktop con filtros), Reseñas (3 metric cards + feed + ranking de mozos), Club de Clientes (filtro por días sin volver + WhatsApp masivo).
- **Mapeo a HeyMozo**: **nueva**. HeyMozo destino tiene `/admin/config` (lista de compañías) y `/admin/:companyId/config` (lista sucursales) — pero **NO tiene un dashboard de KPIs ni reviews ni club**. Esto es totalmente nuevo.
- **Componentes**: todo inline. 2103 líneas — es el componente más grande del repo.

---

## 4. Inventario de componentes compartidos

### Atómicos
**No hay un componente `<Button>` ni `<Input>` reutilizable**. Todo es inline. Esto es intencional — los botones tienen estilos muy específicos por contexto (gradient shadows, colores semánticos por acción). Ver sección 6 y 13.

### Compuestos

| Componente | Archivo | Propósito | Props | Dónde se usa |
|---|---|---|---|---|
| `<Phone>` | [src/components/Phone.jsx](src/components/Phone.jsx) | Wrapper `<div className="phone">` que da min-height + display flex column. Simula frame de teléfono pero ocupa todo el viewport. | `children` | Todas las pantallas `/cliente/*` |
| `<Header>` | [src/components/Header.jsx](src/components/Header.jsx) | Header de vista mozo. Logo + título (desktop) + sector picker dropdown + settings dropdown con navegación a Cajero/Cliente/Reset. | `pageTitle` | MozoLayout |
| `<AlertCard>` | [src/components/AlertCard.jsx](src/components/AlertCard.jsx) | Card de alerta de la vista mozo. Variantes de color: red/orange/yellow/paid(green)/purple/blue. Badge contador, wait time, ícono, título, subtitle (opcional), botón de acción (LISTO o disabled). | `tableName`, `variant`, `title`, `subtitle`, `waitTime`, `icon`, `actionLabel`, `badgeCount`, `dimmed`, `disabledBtn`, `onClick`, `onActionClick` | ActiveAlertsPage |
| `<AlertModal>` | [src/components/AlertModal.jsx](src/components/AlertModal.jsx) | Modal genérico estilo "Mesa X / esperando Y min / EMOJI grande / LABEL / botón ¡VOY!". Bottom sheet en mobile, centrado en sm+. | `tableName`, `waitingTime`, `onClose`, `onAction`, `actionLabel`, `billingEmoji`, `billingLabel`, `billingDesc`, `headerColor` | ActiveAlertsPage |
| `<OrderDetailModal>` | [src/components/OrderDetailModal.jsx](src/components/OrderDetailModal.jsx) | Modal con lista de items del pedido (qty x nombre + descripción + modifier rojo opcional). Header púrpura. | `mesaNumber`, `items[]`, `onAction`, `onClose`, `actionLabel` | ActiveAlertsPage |
| `<Sidebar>` | [src/components/Sidebar.jsx](src/components/Sidebar.jsx) | Sidebar colapsable de desktop (vista mozo). Solo se renderiza `lg:` arriba. Solo tiene 1 tab ("Alertas") hoy. | `activeTab`, `onTabChange` | Disponible pero no enganchado en MozoLayout actual |
| `<StatusBar>` | [src/components/StatusBar.jsx](src/components/StatusBar.jsx) | Barra de status iOS-fake (hora `02:04` hardcoded + wifi + batería). | — | Disponible, no se usa en flow activo |
| `<ClienteHeader>` | [src/components/ClienteHeader.jsx](src/components/ClienteHeader.jsx) | Header viejo del cliente. Legacy — reemplazado por headers inline en cada pantalla. | `showBack` | No referenciado |
| `<MesaCard>` | [src/components/MesaCard.jsx](src/components/MesaCard.jsx) | Card de mesa con timeline. Legacy. | varios | No referenciado en rutas activas |
| `<BottomNav>` | [src/components/BottomNav.jsx](src/components/BottomNav.jsx) | `return null`. Vacío — placeholder legacy. | — | No referenciado |
| `<PayModal>` | [src/components/PayModal.jsx](src/components/PayModal.jsx) | Modal de pago con HeroUI. Código muerto — único usuario de HeroUI en el repo. | `isOpen`, `onClose` | No referenciado |

> **Recomendación al portar**: descartar `<ClienteHeader>`, `<MesaCard>`, `<BottomNav>`, `<PayModal>`. Mantener `<Phone>`, `<Header>`, `<AlertCard>`, `<AlertModal>`, `<OrderDetailModal>`. `<Sidebar>` y `<StatusBar>` se pueden mantener para flexibilidad pero no son críticos.

---

## 5. Design system — TOKENS

### CSS variables / theme block

**Solo se declara una variable theme** en [src/index.css](src/index.css):

```css
@import "tailwindcss";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  min-height: 100vh;
  min-height: 100dvh;
  background-color: #1c1c1e;
}

@keyframes modal-in {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
```

El resto de la paleta **NO está en variables CSS**. Está inline por toda la base, lo que la hace pegajosa pero predecible. Lo que sigue es el catálogo extraído de scans del código.

### Paleta — Backgrounds (dark)

| Token | Hex | Uso |
|---|---|---|
| Body / Phone bg | `#1c1c1e` | Fondo principal de la app (cliente + mozo). Body y `<Phone>`. |
| Bg secundario | `#1c1c24` | Fondo de bottom sheets en cliente (modales que suben de abajo). |
| Bg cajero principal | `#13151f` | Background del cajero (más azul/violáceo). |
| Bg cajero panel | `#1a1c29` | Cards/paneles dentro de Cajero. |
| Bg cajero panel oscuro | `#11131e` | Variante muy oscura — PostPago, Transferencia, validando. |
| Card / surface | `#2c2c2e` | Cards en mozo + cliente (alert cards, item cards). |
| Surface elevada | `#2a2a2c` | Modales (modal-card). |
| Surface más elevada | `#3a3a3c` | Bordes, separadores, hover backgrounds. |
| Surface input | `#1f1f21` / `#1b1b1d` / `#323440` | Inputs y campos. |
| App root | `#1a1a1a` | `.app-container` (legacy). |
| Sticky header bg | `#131315` | Header sticky en MenuPage, CartPage, PagarPage, Transferencia. |
| Sticky header alt | `#191b26` | Card de rating en PostPago. |
| Cajero modal bg | `#1d1f2a` | Sección Club dentro de PostPago. |

### Paleta — Acentos (semánticos)

| Token | Hex | Uso |
|---|---|---|
| **Brand rojo HeyMozo** | `#e8362a` | Logo, glow decorativo top-left. |
| **Brand rojo dark** | `#d62d20` | Alert variant `red` (urgente — pago pendiente). |
| **Brand morado** | `#9333ea` | Acción primaria CTA en cliente. Botón "Ver Menú y Pedir", botón "Sumar visita Club", header de OrderDetailModal. Alert variant `purple`. |
| **Brand morado claro** | `#a855f7` / `#ddb8ff` / `#c084fc` | Texto Club, hover states, voucher accents. |
| **Naranja CTA mozo** | `#e07b00` / `#f97316` / `#f07020` / `#fb923c` | Botón "Llamar al Mozo" en cliente. Alert variant `orange` (pedido de mozo). |
| **Verde pago/éxito** | `#16a34a` / `#22c55e` / `#4ade80` / `#86efac` | Botón "Pagar/Propina" en cliente. Alert variant `paid`. Estados confirmados. Botones back. |
| **Verde HeyMozo Cajero** | `#13eca7` / `#34d399` / `#10b981` | Tab activo Cajero, KPIs positivos, badges "Pagado". Color principal del lado cajero. |
| **Amarillo warning** | `#fbbf24` / `#facc15` / `#f5c518` | Rating estrellas, KPIs neutrales, alert variant `yellow`. |
| **Rojo error** | `#ef4444` / `#dc2626` / `#fca5a5` / `#fd4e4d` | Botones destructivos, alertas críticas, "Reiniciar Demo". |
| **Azul info** | `#3478f6` / `#0a84ff` / `#60a5fa` / `#818cf8` | Acción secundaria (legacy `.btn-blue`), alert variant `blue`, Google Maps CTA. |
| **Cyan/MP brand** | `#009EE3` / `#38bdf8` | Botón Mercado Pago (color oficial). |
| **WhatsApp brand** | `#25d366` / `#052e16` | Botón "Mandar WhatsApp" en Cajero. |

### Paleta — Texto / Neutrales

| Token | Hex | Uso |
|---|---|---|
| Texto principal | `#fff` / `white` | Headings, contenido sobre dark. |
| Texto secundario | `#e4e2e4` / `#e1e1f1` / `#cbd5e1` | Body sobre dark, color preferido en cliente. |
| Texto terciario | `#9ca3af` / `#94a3b8` / `#8e8e93` | Subtitle, hints, placeholders. |
| Texto deshabilitado | `#6b7280` / `#64748b` / `#988ca0` / `#4b5563` | Texto secundario disabled. |
| Texto muerto | `#636366` / `#374151` / `#4d4354` | Iconos disabled, dividers. |
| Texto sobre yellow header | `#1a1a1a` | Cuando el header es amarillo (alert variant `yellow`). |
| Texto VIP | `#ddb8ff` / `#cfc2d7` | Club VIP. |

### Paleta — Borders / Dividers

| Token | Hex | Uso |
|---|---|---|
| Border default | `#3a3a3c` | Borde de cards y separadores. |
| Border cajero | `#1e293b` | Bordes en paneles del cajero. |
| Border sutil | `#2c2c2e` | Hairlines. |
| Border accent | `rgba(147,51,234,0.25)` | Bordes púrpura translúcidos (Club, primary). |
| Border accent verde | `rgba(22,163,74,0.3)` / `rgba(16,185,129,0.3)` | Bordes verde translúcido (pagos). |
| Border accent rojo | `rgba(239,68,68,0.3)` | Bordes rojo translúcido (destructivo). |

### Tipografía

**Familia única** declarada en `--font-sans` (Tailwind theme block):
```
-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif
```

Algunas pantallas pisan con `font-[Inter,sans-serif]` o `font-[Manrope,sans-serif]` inline pero las fuentes no están cargadas — caen al stack del sistema. No hay `@import` de Google Fonts ni `<link>` en `index.html`.

**Escala** (extraída del uso real, no de Tailwind config porque no la tunamos):

| Token | Tamaño | Uso típico |
|---|---|---|
| `text-[10px]` / `0.625rem` | 10px | Badges, labels mini, uppercase tracking. |
| `text-xs` / `text-[11px]` / `text-[12px]` | 11–12px | Subtitle, hints, fechas. |
| `text-sm` / `text-[13px]` / `text-[14px]` | 13–14px | Body en cards, descripciones. |
| `text-base` / `text-[15px]` | 15–16px | Body principal. |
| `text-lg` / `text-[17px]` / `text-[18px]` | 17–18px | Sub-titles de modal, action button labels. |
| `text-xl` / `text-[20px]` | 20px | Title sections, table-name en mozo. |
| `text-2xl` / `text-[22px]` / `text-[24px]` | 22–24px | Modal titles, table-name en card. |
| `text-3xl` | 30px | Page titles. |
| `text-4xl` / `text-5xl` | 36–48px | Hero numbers, KPIs grandes. |
| `text-[3rem]` / `text-[3.75rem]` | 48–60px | "¡Hola!" de ClientePage. |

**Pesos**:
| Peso | Uso |
|---|---|
| `font-medium` (500) | Subtitle, descriptions. |
| `font-semibold` (600) | Subtle emphasis, status badges. |
| `font-bold` (700) | Headings, CTA buttons, números. |
| `font-extrabold` (800) | Headers grandes ("¡Hola!", título de PostPago). |
| `font-black` (900) | KPIs, totales, "1.245 clientes". |

**Letter spacing**:
- `tracking-tight` / `letter-spacing: -0.5px` o `-0.04em` para headings.
- `tracking-wider` / `letter-spacing: 0.08em` o `0.1em` para uppercase labels y CTAs.

### Espaciado

Tailwind default scale (4px base), pero **muchísimos lugares usan inline `style={{ padding: '1.25rem' }}` o `gap: '0.75rem'`** por preferencia explícita del usuario (ver feedback memory: padding/margins generosos con inline styles). Valores comunes:

| Valor | Hex | Uso |
|---|---|---|
| `0.25rem` / `4px` | Spacing entre íconos y texto. |
| `0.5rem` / `8px` | Gap entre items en lista. |
| `0.625rem` / `10px` | Gap entre subtitle y title. |
| `0.75rem` / `12px` | Gap en cards, gap vertical en columnas. |
| `0.875rem` / `14px` | Padding de buttons. |
| `1rem` / `16px` | Padding de cards. |
| `1.25rem` / `20px` | Padding de cards grandes, modales. |
| `1.5rem` / `24px` | Padding de secciones. |
| `1.75rem` / `28px` | Padding de bottom sheets. |
| `2rem` / `32px` | Padding hero. |

### Border radius

| Token | Valor | Uso |
|---|---|---|
| `rounded-md` | 6px | Tags pequeños. |
| `rounded-lg` | 8px | Botones pequeños, inputs. |
| `rounded-xl` | 12px | Cards medianas, buttons. |
| `rounded-2xl` | 16px | Cards grandes (`AlertCard`, panels). |
| `rounded-3xl` / `1.5rem` | 24px | Bottom sheets (top corners). |
| `rounded-full` / `999px` | full | Pills, badges, status indicators. |
| Bottom sheet corners | `24px 24px 0 0` | Todos los bottom sheets — top corners rounded, bottom flat. |

### Sombras

Las sombras son **todas inline** y siempre con tinte de color (no negro puro), para dar feedback de marca:

| Sombra | Uso |
|---|---|
| `0 10px 25px rgba(147, 51, 234, 0.4)` | Botón morado primario. |
| `0 10px 25px rgba(224, 123, 0, 0.4)` | Botón naranja (Llamar al Mozo). |
| `0 10px 25px rgba(22, 163, 74, 0.4)` | Botón verde (Pagar). |
| `0 8px 24px rgba(147,51,234,0.25)` | Cards con accent morado. |
| `0 4px 20px rgba(0,0,0,0.25)` | Cards generales del cajero. |
| `0 8px 32px rgba(0,0,0,0.5)` | Dropdowns. |
| `0 20px 60px rgba(0, 0, 0, 0.8)` | Modal grande. |
| `0 20px 40px rgba(0,0,0,0.4)` | PostPago icon. |
| `0 25px 50px rgba(147,51,234,0.4)` | Floating bottom bar de MenuPage. |
| `0 6px 20px rgba(37,211,102,0.3)` | Botón WhatsApp. |
| `-10px 0 40px rgba(0,0,0,0.5)` | Drawer lateral (Cajero detalle de pago). |

### Glow decorativos (fijos en cada pantalla)

Pattern repetido en todas las pantallas del cliente:
```jsx
<div className="fixed rounded-full pointer-events-none" style={{ top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(232, 54, 42, 0.04)', filter: 'blur(100px)' }} />
<div className="fixed rounded-full pointer-events-none" style={{ bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(147, 51, 234, 0.05)', filter: 'blur(100px)' }} />
```

Los colores cambian por pantalla (rojo/morado en cliente, verde/cyan en cajero) pero el patrón es el mismo. Es identidad visual.

### Breakpoints

Defaults de Tailwind. Solo se usan `md:` y `lg:` activamente:
- `sm:` 640px — rara vez.
- `md:` 768px — switch mobile→tablet (Cajero: cards mobile vs cards desktop).
- `lg:` 1024px — switch a desktop completo (sidebar visible, dos columnas en Reseñas).
- `xl:` 1280px — grids de 3 columnas en ActiveAlertsPage.

### Transiciones / easings

- Default: `transition: all 0.15s` o `0.2s`.
- Modal entrance: `cubic-bezier(0.34, 1.56, 0.64, 1)` (bouncy) — keyframe `modal-in`.
- Bottom sheet: `ease-out 0.3s` — keyframe `mozo-slide-up`, `cart-slide-up`, `split-slide-up`.
- Active state: `active:scale-95 transition-transform duration-100`.
- Hover: `hover:brightness-110` (Cajero).
- Pulses: `ring-pulse 2s infinite` (ConfirmadoPage check icon), `posnet-glow 3s ease-in-out infinite`, `efectivo-glow 3s ease-in-out infinite`, `validando-pulse 2.5s ease-in-out infinite`, `validando-spin 3s linear infinite`.

---

## 6. Código de muestra — "Button"

**No hay un componente Button reutilizable.** Esto es deliberado — cada botón tiene paddings, sombras, gradients y radius específicos al contexto. Lo que sigue son los **3 patrones de botón** que se repiten por toda la base. Si el otro Claude quiere consolidar en un `<Button>` reusable en HeyMozo, estos son los archetipos.

### Patrón 1 — CTA primario "elevated" (cliente)
Botón con sombra coloreada, gradient implícito vía bg sólido + box-shadow. Aparece en ClientePage (3 botones grandes), CartPage (confirmar), MenuPage (Ver Pedido), PagarPage.

```jsx
<button
  className="w-full flex items-center justify-center gap-3 text-white font-bold rounded-2xl active:scale-95 transition-transform duration-100"
  style={{
    background: '#9333ea',          // o '#e07b00' (naranja) o '#16a34a' (verde)
    padding: '1.25rem 1.5rem',
    boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4)',  // matchea bg
    border: 'none',
    cursor: 'pointer',
    fontSize: '1.125rem',
  }}
  onClick={...}
>
  <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
  <span>Ver Menú y Pedir</span>
</button>
```

### Patrón 2 — Acción de tarjeta (mozo)
Botón blanco sobre card de color, usado para "¡LISTO!" en AlertCard. Definido inline dentro de [src/components/AlertCard.jsx:117-132](src/components/AlertCard.jsx#L117-L132):

```jsx
<div className="mt-auto flex justify-center pb-3">
  <div
    className={`py-3 text-center font-bold tracking-wide ${variant === 'purple' && !disabledBtn ? 'rounded-full active:scale-95 transition-transform' : 'rounded-[12px]'}`}
    style={{
      padding: '0.5rem',
      width: '-webkit-fill-available',
      ...(disabledBtn
        ? { backgroundColor: 'rgba(200,200,200,0.22)', color: '#9ca3af', fontSize: '13px', cursor: 'not-allowed', letterSpacing: '0.2px' }
        : { backgroundColor: 'white', color: '#1a1a1a', fontSize: '17px', cursor: 'pointer' }
      ),
    }}
    onClick={(e) => { if (!disabledBtn) { e.stopPropagation(); onActionClick?.(); } }}
  >
    {actionLabel}
  </div>
</div>
```

### Patrón 3 — Pill / secundario (Cajero)
Botón redondeado tipo "pill" para filtros y acciones secundarias en Cajero.

```jsx
<button
  type="button"
  onClick={...}
  className="text-xs font-bold rounded-full border-none cursor-pointer transition-all"
  style={{
    padding: '0.45rem 0.95rem',
    background: active ? '#13eca7' : '#13151f',
    color: active ? '#003d28' : '#94a3b8',
  }}
>
  {label}
</button>
```

### El componente AlertCard completo

Es el único "componente complejo" reutilizable. Full code:

```jsx
// src/components/AlertCard.jsx
const CHECK_ICON = (
  <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] shrink-0" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/>
    <line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);

const BELL_ICON = (/* ... bell SVG ... */);
const CHECK_CIRCLE_ICON = (/* ... check-circle SVG ... */);
const CART_ICON = (/* ... cart SVG ... */);

const iconMap = {
  check: CHECK_ICON,
  bell: BELL_ICON,
  'check-circle': CHECK_CIRCLE_ICON,
  cart: CART_ICON,
};

// Material Icons names used in Stitch designs (rendered as <span className="material-icons">)
const MATERIAL_ICONS = new Set([
  'credit_card', 'hourglass_empty', 'shopping_cart',
  'notifications', 'check_circle', 'schedule',
]);

const variantBg = {
  red:    '#d62d20',
  orange: '#f07020',
  yellow: '#f5c518',
  paid:   '#30d158',
  purple: '#9333ea',
  blue:   '#0a84ff',
};

export default function AlertCard({
  tableName,
  variant = 'red',
  title,
  subtitle,
  waitTime,
  icon = 'check',
  actionLabel,
  badgeCount,
  dimmed,
  disabledBtn,
  onClick,
  onActionClick,
}) {
  const iconEl = icon
    ? MATERIAL_ICONS.has(icon)
      ? <span className="material-icons text-white/85" style={{ fontSize: '20px' }}>{icon}</span>
      : (iconMap[icon] ?? CHECK_ICON)
    : null;

  return (
    <div
      className={`relative rounded-[16px] overflow-visible cursor-pointer active:opacity-90 w-full flex flex-col ${dimmed ? 'opacity-75' : ''}`}
      style={{ background: variantBg[variant] ?? '#3a3a3c', padding: '0 0.5rem 0.5rem 0.5rem', borderRadius: '16px', height: 'auto' }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
    >
      {/* Badge contador */}
      {badgeCount != null && (
        <div className="absolute -top-2 -right-2 bg-red-600 text-white w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold border-2 border-[#1c1c1e] z-10">
          {badgeCount}
        </div>
      )}

      <div style={{ padding: '0.5rem' }}>
        {/* Header: tableName + waitTime */}
        <div className="flex items-start justify-between" style={{ padding: '0.5rem 0.5rem 0.25rem' }}>
          <div className="text-white text-[24px] font-bold tracking-wide leading-tight">
            {tableName}
          </div>
          {waitTime && (
            <div className="text-white/80 font-semibold flex items-center gap-0.5 mt-1">
              <span className="material-icons" style={{ fontSize: '14px' }}>schedule</span>
              <span style={{ fontSize: '12px', letterSpacing: '0.05em' }}>{waitTime}</span>
            </div>
          )}
        </div>
        {/* Body: icon + title */}
        <div className="flex items-center gap-1.5" style={{ padding: '0 0.5rem' }}>
          {iconEl}
          <span className="text-white/90 text-[16px] font-medium leading-snug tracking-wide">
            {title}
          </span>
        </div>
        {subtitle && (
          <div className="text-[14px] font-bold mt-1 leading-snug" style={{ padding: '0 0.5rem', color: '#fde047' }}>
            {subtitle}
          </div>
        )}
      </div>

      {/* Action button — pushed to bottom (flex column + mt-auto) */}
      <div className="mt-auto flex justify-center pb-3">
        <div
          className={`py-3 text-center font-bold tracking-wide ${variant === 'purple' && !disabledBtn ? 'rounded-full active:scale-95 transition-transform' : 'rounded-[12px]'}`}
          style={{
            padding: '0.5rem',
            width: '-webkit-fill-available',
            ...(disabledBtn
              ? { backgroundColor: 'rgba(200,200,200,0.22)', color: '#9ca3af', fontSize: '13px', cursor: 'not-allowed', letterSpacing: '0.2px' }
              : { backgroundColor: 'white', color: '#1a1a1a', fontSize: '17px', cursor: 'pointer' }
            ),
          }}
          onClick={(e) => { if (!disabledBtn) { e.stopPropagation(); onActionClick?.(); } }}
        >
          {actionLabel}
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Código de muestra — pantalla representativa

Elegí **ClientePage** porque es el punto de entrada del cliente (post-QR) y exhibe los patrones más usados: `<Phone>` wrapper, modales bottom-sheet, navegación lateral por dropdown, lectura reactiva de loyaltyStore, glow decorativo de fondo.

```jsx
// src/pages/ClientePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Phone from '../components/Phone';
import { addAlert } from '../lib/alertStore';
import { getOrder, getOrderTotal } from '../lib/cartStore';
import { useLoyalty, redeemVoucher, VISITS_FOR_VOUCHER } from '../lib/loyaltyStore';

// Flag de módulo: persiste durante la sesión SPA; se resetea solo en recarga (nuevo QR scan)
let _sessionVisited = false;

function fmt(n) { return '$' + n.toLocaleString('es-CL'); }

const QUICK_ACTIONS = [
  { emoji: '🧊', label: 'Hielo' },
  { emoji: '🧂', label: 'Condimentos' },
  { emoji: '📄', label: 'Servilletas' },
  { emoji: '🧽', label: 'Limpiar mesa' },
];

export default function ClientePage() {
  const navigate = useNavigate();
  const [mozoSheetOpen, setMozoSheetOpen] = useState(false);
  const [mozoSent, setMozoSent] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [sessionModal, setSessionModal] = useState(false);
  const [confirmNewSession, setConfirmNewSession] = useState(false);
  const [voucherModal, setVoucherModal] = useState(false);

  const { phone: vipPhone, visits: vipVisits, hasVoucher } = useLoyalty();

  useEffect(() => {
    const hadSession = localStorage.getItem('hm_mesa6_session');
    if (hadSession && !_sessionVisited && getOrder().length > 0) {
      setSessionModal(true);
    }
    if (!_sessionVisited && localStorage.getItem('hm_vip_voucher') === '1' && !sessionStorage.getItem('hm_voucher_shown')) {
      setVoucherModal(true);
      sessionStorage.setItem('hm_voucher_shown', '1');
    }
    _sessionVisited = true;
    localStorage.setItem('hm_mesa6_session', '1');
  }, []);

  return (
    <Phone>
      <div
        className="flex flex-col text-white font-[Inter,sans-serif]"
        style={{ background: '#1c1c1e', minHeight: '100%' }}
      >
        <div className="flex-1 flex flex-col">
          {/* Header — Logo del restaurante */}
          <header className="flex flex-col items-center justify-center" style={{ paddingTop: '3rem', paddingBottom: '1rem' }}>
            {/* Nav gear — top right (Vista Mozo / Panel Restaurante / Reiniciar Demo) */}
            <div className="absolute top-3 right-3 z-20">
              <button
                type="button"
                className="text-[#8e8e93] hover:text-white transition-colors bg-transparent border-none p-2 cursor-pointer"
                onClick={() => setNavOpen((v) => !v)}
              >
                <svg viewBox="0 0 24 24" style={{ width: 18, height: 18, fill: 'currentColor' }}>
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 ..." />
                </svg>
              </button>
              {navOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNavOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-50 rounded-2xl overflow-hidden" style={{ background: '#2c2c2e', border: '1px solid #3a3a3c', minWidth: 170, boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
                    {/* dropdown items: Vista Mozo, Panel del Restaurante, Reiniciar Demo */}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-3" style={{ marginBottom: '2.5rem' }}>
              <div className="flex items-center justify-center rounded-full" style={{ background: '#e8362a', padding: '0.5rem' }}>
                <span className="material-symbols-outlined text-white text-2xl shrink-0">restaurant</span>
              </div>
              <span className="text-white text-xl font-black tracking-tight">Mi Resto</span>
            </div>
          </header>

          <main className="flex-1 flex flex-col items-center" style={{ padding: '0 1.5rem' }}>
            {/* Saludo gigante */}
            <div className="text-center space-y-1" style={{ marginBottom: '3rem' }}>
              <h1 className="text-white font-extrabold tracking-tight" style={{ fontSize: '3.75rem' }}>¡Hola!</h1>
              <p className="text-gray-400 text-sm font-medium" style={{ paddingTop: '0.5rem' }}>
                Estás en la&nbsp;<span style={{ fontSize: '0.875rem' }}>Mesa 6</span>
              </p>
            </div>

            {/* Botones principales */}
            <div className="w-full flex flex-col" style={{ maxWidth: '24rem', gap: '1.25rem' }}>
              {/* Ver Menú y Pedir */}
              <button
                className="w-full flex items-center justify-center gap-3 text-white font-bold rounded-2xl active:scale-95 transition-transform duration-100"
                style={{
                  background: '#9333ea',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 10px 25px rgba(147, 51, 234, 0.4)',
                  border: 'none', cursor: 'pointer', fontSize: '1.125rem',
                }}
                onClick={() => navigate('/cliente/menu')}
              >
                <span className="material-symbols-outlined text-2xl">restaurant_menu</span>
                <span>Ver Menú y Pedir</span>
              </button>

              {/* Llamar al Mozo (naranja) */}
              <button
                className="w-full flex items-center justify-center gap-3 text-white font-bold rounded-2xl active:scale-95 transition-transform duration-100"
                style={{
                  background: '#e07b00',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 10px 25px rgba(224, 123, 0, 0.4)',
                  border: 'none', cursor: 'pointer', fontSize: '1.125rem',
                }}
                onClick={() => setMozoSheetOpen(true)}
              >
                <span className="material-symbols-outlined text-2xl font-bold">notifications_active</span>
                <span>Llamar al Mozo</span>
              </button>

              {/* Pagar / Dejar Propina (verde) */}
              <button
                className="w-full flex items-center justify-center gap-3 text-white font-bold rounded-2xl active:scale-95 transition-transform duration-100"
                style={{
                  background: '#16a34a',
                  padding: '1.25rem 1.5rem',
                  boxShadow: '0 10px 25px rgba(22, 163, 74, 0.4)',
                  border: 'none', cursor: 'pointer', fontSize: '1.125rem',
                }}
                onClick={() => navigate('/cliente/pagar')}
              >
                <span className="material-symbols-outlined text-2xl">credit_card</span>
                <span>Pagar / Dejar Propina</span>
              </button>
            </div>

            {/* Badge VIP Club — solo si hay teléfono registrado */}
            {vipPhone && (
              <div className="text-center" style={{ marginTop: '3rem', marginBottom: '3rem' }}>
                {hasVoucher ? (
                  <button
                    onClick={() => setVoucherModal(true)}
                    className="inline-flex items-center gap-2 rounded-2xl cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, rgba(147,51,234,0.22), rgba(221,184,255,0.12))',
                      border: '1px dashed rgba(221,184,255,0.6)',
                      padding: '0.625rem 1.1rem',
                      boxShadow: '0 8px 24px rgba(147,51,234,0.25)',
                    }}
                  >
                    <span style={{ fontSize: '1.1rem' }}>🎟️</span>
                    <span style={{ color: '#ddb8ff', fontSize: '0.8rem', fontWeight: 800, letterSpacing: '0.04em' }}>
                      TENÉS 1 PINTA GRATIS · Tocá para canjear
                    </span>
                  </button>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-2xl"
                    style={{ background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.25)', padding: '0.5rem 1rem' }}>
                    <span style={{ fontSize: '1rem' }}>🎁</span>
                    <span style={{ color: '#ddb8ff', fontSize: '0.8rem', fontWeight: 700 }}>
                      Club · {vipVisits} {vipVisits === 1 ? 'visita' : 'visitas'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Footer — atribución HeyMozo */}
        <footer className="text-center w-full" style={{ padding: '1rem 1.5rem 2rem' }}>
          <div className="flex flex-col items-center gap-1" style={{ paddingTop: '1.5rem', borderTop: '1px solid #3a3a3c' }}>
            <div className="flex items-center gap-1.5 font-medium" style={{ fontSize: '0.75rem', color: '#4b5563' }}>
              <img src="/HeyMozo.jpeg" alt="HeyMozo" style={{ width: '14px', height: '14px', borderRadius: '3px', objectFit: 'cover' }} />
              <span>Tecnología HeyMozo</span>
            </div>
          </div>
        </footer>

        {/* Glow decorativo de fondo */}
        <div className="fixed rounded-full pointer-events-none"
          style={{ top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'rgba(232, 54, 42, 0.04)', filter: 'blur(100px)' }} />
        <div className="fixed rounded-full pointer-events-none"
          style={{ bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'rgba(147, 51, 234, 0.05)', filter: 'blur(100px)' }} />
      </div>

      {/* ── Modal: sesión activa (omitido brevemente) ── */}
      {sessionModal && (/* bottom sheet con "Unirme" + "Empezar de cero" */)}

      {/* ── Modal: confirmar nueva sesión (destructivo) ── */}
      {confirmNewSession && (/* segundo paso de confirmación con monto que se pierde */)}

      {/* ── Modal: Voucher VIP ── */}
      {voucherModal && (/* gradient morado + 🍺 + canjear ahora */)}

      {/* ── Bottom Sheet: Llamar al Mozo ── */}
      {mozoSheetOpen && (
        <div className="absolute inset-0 z-50 flex items-end" style={{ background: 'rgba(0, 0, 0, 0.70)' }}
          onClick={() => { setMozoSheetOpen(false); setMozoSent(null); }}>
          <div className="w-full"
            style={{
              background: '#1c1c24', borderRadius: '24px 24px 0 0', padding: '1.5rem',
              animation: 'mozo-slide-up 0.3s ease-out forwards',
            }}
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center" style={{ marginBottom: '1rem' }}>
              <div className="rounded-full" style={{ width: '48px', height: '6px', background: '#4b5563' }} />
            </div>
            <h2 className="text-white text-xl font-bold text-center">¿Qué necesitás?</h2>
            <div className="grid grid-cols-2" style={{ gap: '1rem', marginTop: '1.5rem' }}>
              {QUICK_ACTIONS.map((action) => (
                <button key={action.label} ... onClick={() => {
                  addAlert({
                    mesa: 'MESA 6', variant: 'orange',
                    title: `Llevar ${action.label}`, icon: 'notifications', emoji: action.emoji,
                  });
                  setMozoSent(action.label);
                  setTimeout(() => { setMozoSheetOpen(false); setMozoSent(null); }, 1200);
                }}>
                  <span style={{ fontSize: '2rem' }}>{action.emoji}</span>
                  <span className="text-white text-sm">{action.label}</span>
                </button>
              ))}
            </div>
            {/* Botón principal: Otra consulta (Viene el mozo) */}
            {/* Toast feedback de "✓ {actionName} — pedido enviado" */}
          </div>
          <style>{`
            @keyframes mozo-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
            @keyframes mozo-fade-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
          `}</style>
        </div>
      )}
    </Phone>
  );
}
```

> Para el código completo (634 líneas) ver [src/pages/ClientePage.jsx](src/pages/ClientePage.jsx). El snippet de arriba muestra los 3 patrones críticos: state hooks + localStorage init, headers/main/footer flex column, bottom sheet con animación.

---

## 8. Assets

### Imágenes
- `public/HeyMozo.jpeg` — logo del producto. 38×38 con `borderRadius: 10px`. Usado en:
  - [src/components/Header.jsx:37](src/components/Header.jsx#L37) — header mobile vista mozo.
  - [src/components/Sidebar.jsx:38-41](src/components/Sidebar.jsx#L38-L41) — el sidebar usa un emoji `🍽️` con fondo `#e8362a`, no la imagen.
  - [src/pages/ClientePage.jsx:229](src/pages/ClientePage.jsx#L229) — footer "Tecnología HeyMozo" (14×14 mini).
- `public/vite.svg` — favicon default. Reemplazable.
- **Imágenes de menú**: cargadas desde Unsplash con URLs externas (no se descargan locales). Ver [src/data/menuItems.js](src/data/menuItems.js).
- `stitch-export/*.png` — exports de Stitch para referencia de diseño (no se incluyen en runtime). Listados en el git status (`fidelizacion-*.png`, `exito-mp-test*.png`).

### Iconos
**Tres fuentes de iconos**, mezcladas:

1. **SVGs inline** definidos como constantes dentro de cada componente. Pattern por todos lados. Ejemplos: `CHECK_ICON`, `BELL_ICON`, `CART_ICON` en AlertCard, `chevronLeft`, `iconBank`, `iconCopy` en pantallas de pago. Ventaja: cero deps, control absoluto de stroke/fill. Desventaja: duplicación.

2. **Material Symbols Outlined** vía Google Fonts CDN. **No está cargado en `index.html`**. Probablemente esté cargado dentro del propio body de los componentes a través del browser cache, o sin querer no carga y la fuente cae al fallback. Aparece como `<span className="material-symbols-outlined">...</span>` con `fontVariationSettings` para fill states. Iconos usados (muestra): `restaurant`, `restaurant_menu`, `notifications_active`, `credit_card`, `shopping_cart`, `check_circle`, `arrow_forward`, `expand_more`, `account_balance`, `verified`, `chat`, `download`, `search`, `filter_list`, `bolt`, `insights`, `payments`, `star`, `star_half`, `redeem`, `group`, `trending_up`, `person`, `person_add`, `map`, `bed`, `local_offer`, `people`, `qr_code_2`, `table_bar`, `table_restaurant`, `inbox`, `cancel`, `check`, `warning`, `restart_alt`, `smartphone`, `visibility`, `schedule`. **AL PORTAR**: agregar `<link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">` a `index.html`.

3. **Material Icons** (no Symbols) con `<span className="material-icons">`. Usado en AlertCard para algunos íconos. Tiene fallback a SVG inline en `iconMap`.

### Fuentes
- `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif` — stack del sistema, definido en `--font-sans`.
- `font-[Inter,sans-serif]` y `font-[Manrope,sans-serif]` aparecen inline pero **NO están cargadas** — caen a fallback. Decisión a tomar al portar: cargarlas (Google Fonts) o sacar el override.

---

## 9. Features nuevas — data shapes esperados

> Estas son las shapes que el front consume hoy desde localStorage. Al portar a HeyMozo destino se vuelven contrato para el back (Sequelize models). Cada subsección incluye el fixture/mock real del repo.

### 9.1 Menú interactivo / Pedidos

**Menú** ([src/data/menuItems.js](src/data/menuItems.js)):

```js
export const menuCategories = [
  {
    category: 'Entradas',
    items: [
      {
        title: 'Ensalada César',
        description: 'Lechuga romana, crotones, parmesano y aderezo césar',
        price: '$8.500',
        image: 'https://images.unsplash.com/photo-1512621776951-...',
      },
      {
        title: 'Bruschetta',
        description: 'Pan tostado con tomate, albahaca y aceite de oliva',
        price: '$6.200',
        image: 'https://images.unsplash.com/photo-1572695157366-...',
      },
      {
        title: 'Sopa del día',
        description: 'Sopa casera variada según temporada',
        price: '$5.800',
        image: 'https://images.unsplash.com/photo-1547592166-...',
      },
    ],
  },
  {
    category: 'Principales',
    items: [
      { title: 'Pasta a la boloñesa', description: '...', price: '$12.900', image: '...' },
      { title: 'Pollo al horno',      description: '...', price: '$14.500', image: '...' },
      { title: 'Risotto de champiñones', description: '...', price: '$13.200', image: '...' },
    ],
  },
  {
    category: 'Postres',
    items: [
      { title: 'Tiramisú',          description: '...', price: '$7.800', image: '...' },
      { title: 'Brownie con helado', description: '...', price: '$6.500', image: '...' },
    ],
  },
  {
    category: 'Bebidas',
    items: [
      { title: 'Agua mineral',     description: '500ml con o sin gas', price: '$2.500', image: '...' },
      { title: 'Limonada natural', description: '...',                  price: '$4.200', image: '...' },
      { title: 'Café espresso',    description: 'Simple o doble',       price: '$3.200', image: '...' },
    ],
  },
];
```

**Notas para el back**:
- `price` es **string formateado** (`'$8.500'`), no numérico. `parsePrice()` lo convierte sacando `$` y `.`. Idealmente el back devuelve `priceCents: number`.
- No hay variantes / tamaños (S/M/L), no hay modificadores ("sin tomate"), no hay alérgenos, no hay stock. La estructura es plana.
- Shape sugerida para back: `Category { id, name, order, items: MenuItem[] }`, `MenuItem { id, title, description, priceCents, imageUrl, available: bool }`.

**Cart item** ([src/lib/cartStore.js](src/lib/cartStore.js)):

```js
// localStorage key: 'hm_cart'
// Shape: array de items
[
  {
    title: 'Pasta a la boloñesa',
    description: 'Spaghetti con salsa de carne, tomate y hierbas',
    unitPrice: 12900,            // numérico (parseado del string)
    image: 'https://...',
    qty: 2,
  },
  // ...
]
```

**Order (acumulado de pedidos confirmados, key `hm_order`)**:
- Misma shape que cart. Cuando el cliente toca "Confirmar Pedido", `confirmOrder()` mergea cart en order (sumando qty si el item ya existía) y vacía el cart.
- Esto soporta el flow "agregar a un pedido ya enviado".
- `clearCartAndOrder()` se llama al llegar a PostPago (= cierre de cuenta).

**Sin manejo de**: notas del cliente, modificadores, alérgenos, estado por item (`pending/cooking/served`). El estado vive a nivel **alerta** (purple = nuevo pedido), no por ítem.

### 9.2 Pagos

**Alert de pago confirmado en feed del cajero** ([src/lib/cajaStore.js](src/lib/cajaStore.js)):

```js
// localStorage key: 'hm_caja_alerts'
[
  {
    id: 'caja-1731600000000-abc1',
    mesa: 'MESA 1',                  // string label
    metodo: 'Tarjeta',                // 'Tarjeta' | 'Efectivo' | 'Mercado Pago' | 'Transferencia'
    monto: '$24.000',                 // string formateado
    tipoPago: 'PAGO TOTAL',           // 'PAGO TOTAL' | 'PAGO PARCIAL' | 'PROPINA'
    propina: '$2.000',                // string o null
    createdAt: 1731600000000,         // timestamp
  },
  // ...
]
```

**Tabla histórica de pagos** (mock hardcoded en [src/pages/CajeroLayout.jsx:765-770](src/pages/CajeroLayout.jsx#L765-L770)):

```js
const PAGOS_DATA = [
  {
    hora: '21:14 hs',
    mesa: 'Mesa 4',
    metodo: 'Mercado Pago',
    metodoIcon: 'credit_card',
    metodoColor: '#60a5fa',
    consumo: '$20.000',
    propina: '$2.000',
    propinaColor: '#f59e0b',
    total: '$22.000',
    estado: 'Pagado',          // 'Pagado' | 'Reembolsado'
    estadoColor: 'emerald',     // 'emerald' | 'red'
  },
  // mesas 6, 1, 8...
];
```

**Métodos de pago soportados** (extraídos de PagarPage):
1. **Mercado Pago** — modal pregunta "El total completo" vs "Solo mi parte" (split con monto custom). Genera `caja-alert` con `metodo: 'Mercado Pago'`, `tipoPago: 'PAGO TOTAL'` o `'PAGO PARCIAL'`.
2. **Transferencia** — navega a `/cliente/transferencia`, muestra alias, cliente toca "Ya realice", setea `mesa6Status=WAITING` y guarda `hm_mesa6_transfer_amount`. Cajero valida desde la card naranja del feed.
3. **Tarjeta / MODO** — alerta variant `red` para el mozo ("Cuenta: Tarjeta / MODO") + navega a PosnetPage (informativa).
4. **Efectivo** — alerta variant `red` para el mozo ("Cuenta: Efectivo") + navega a EfectivoPage (informativa).

Shape sugerida para el back: `Payment { id, branchId, tableId, sessionId, method enum, amountCents, tipCents, status enum (pending|approved|rejected|refunded), processedAt, ackByCajero: bool }`.

### 9.3 Dividir cuenta

**Modelado actual**: **NO se modela como split real**. Es solo un calculador informativo dentro de PagarPage ([src/pages/PagarPage.jsx:429-565](src/pages/PagarPage.jsx#L429-L565)):

```js
// Estado local (no persistido):
const [splitCount, setSplitCount] = useState(2);  // 2..20
const perPerson = Math.ceil(total / splitCount);  // muestra cuánto paga cada uno
```

UI: bottom sheet con `+`/`−` para personas, muestra "Cada uno paga: $X". Tiene aviso: **"Es solo un cálculo informativo. El pago sigue siendo uno solo: arreglen entre ustedes quién lo hace, o que cada uno escanee el QR y pague su parte por separado."**

**El split real ocurre vía Mercado Pago "PAGO PARCIAL"**: el flow es que cada cliente que escanea el QR puede pagar un monto custom (input numérico) y se genera una `caja-alert` por cada uno. La sumatoria de pagos parciales = total pagado de la mesa.

Decisión de diseño explícita: ver memoria `project_business_rules.md` — pago dividido se hace con MP por elección de monto, no como split orquestado por el sistema.

### 9.4 Reviews

**Mock data** ([src/pages/CajeroLayout.jsx:1090-1094](src/pages/CajeroLayout.jsx#L1090-L1094)):

```js
const REVIEWS_DATA = [
  {
    stars: 5,
    time: 'Hoy 21:30',
    mozo: 'Ana',
    text: 'La atención excelente y la birra tirada perfecta. Volvemos seguro.',
    type: '5star',              // '5star' | 'queja'
    action: 'promo',            // 'promo' | 'queja' | null
    platform: 'Google Maps',    // 'Google Maps' | null  (si fue derivada)
    tags: [],
  },
  {
    stars: 2,
    time: 'Ayer 20:15',
    mozo: 'Marcos',
    text: 'La hamburguesa llegó fría y tardaron casi 20 minutos en traer la cuenta.',
    type: 'queja',
    action: 'queja',
    platform: null,
    tags: ['fria', 'demora'],   // tags de queja seleccionados por el cliente
  },
  {
    stars: 5,
    time: 'Ayer 19:45',
    mozo: 'Carlos',
    text: 'Todo perfecto, como siempre. Carlos muy atento.',
    type: '5star',
    action: null,
    platform: null,
    tags: [],
  },
];
```

**Tags de queja** ([src/pages/PostPagoPage.jsx:24-29](src/pages/PostPagoPage.jsx#L24-L29) — set fijo, no configurable):

```js
const COMPLAINT_TAGS = [
  { id: 'fria',     label: '🧊 Comida Fría' },
  { id: 'demora',   label: '⏳ Demora' },
  { id: 'atencion', label: '😠 Mala Atención' },
  { id: 'precio',   label: '💵 Precios' },
];
```

**Lógica de routing del rating** (PostPagoPage):
- `rating >= 4` → CTA "Enviar calificación" → al enviar muestra CTA opcional "📍 También reseñar en Google Maps".
- `rating <= 3` → muestra tags + textarea "Querés agregar algo más? (opcional)". Solo va al dueño, no a Google.
- Sin rating: no se envía nada.

**Métricas de reseñas** (mock hardcoded en CajeroLayout, no calculadas):
- Promedio general (4.6)
- Derivados a Google Maps (45)
- Alertas críticas (3)
- Conteo por motivos: `MOTIVOS_QUEJA = [{ id, label, count }]` con `fria: 8, demora: 5, atencion: 3, precio: 2`.

**Ranking por mozo**:
```js
const MOZOS_DATA = [
  { name: 'Carlos', rating: 4.8, fill: 96, alert: false },
  { name: 'Ana',    rating: 4.5, fill: 90, alert: false },
  { name: 'Marcos', rating: 3.2, fill: 64, alert: true },
];
```

Shape sugerida back: `Review { id, sessionId, stars, comment, tags[], waiterId, derivedToGoogle: bool, createdAt }`. Y aggregations por mozo / por sucursal / por tag.

### 9.5 Fidelización (Club)

**Registry** ([src/lib/loyaltyStore.js](src/lib/loyaltyStore.js)):

```js
// localStorage key: 'hm_vip_registry'
{
  '+54 9 11 4567-8901': { visits: 1,  voucher: false },
  '+54 9 11 2233-4455': { visits: 4,  voucher: false },
  '+54 9 11 3344-5566': { visits: 10, voucher: false },
  // ...
}

// Teléfono activo en la mesa actual:
localStorage.getItem('hm_vip_phone')    // '+54 9 11 ...'
localStorage.getItem('hm_vip_visits')   // '3'
localStorage.getItem('hm_vip_voucher')  // '0' | '1'

export const VISITS_FOR_VOUCHER = 5;
```

**API**:
- `registerVisit(phone)` → incrementa `visits`, si `visits >= 5` activa `voucher`. Devuelve `{ phone, visits, voucherJustUnlocked, voucherActive }`.
- `setActivePhone(phone)` → fija el activo + sincroniza keys flat con registry.
- `redeemVoucher()` → resetea visits=0, voucher=false en el activo.
- `useLoyalty()` → hook con `{ phone, visits, hasVoucher }`.

**Mock data del feed de clientes en Cajero** ([src/pages/CajeroLayout.jsx:218-229](src/pages/CajeroLayout.jsx#L218-L229)):

```js
const CLUB_CLIENTS = [
  { phone: '+54 9 11 4567-8901', lastVisit: 'Hoy, 20:15 hs', daysAgo: 0,  visits: '1 visita',  visitsCount: 1,  status: 'Regalo Pendiente', statusColor: 'emerald' },
  { phone: '+54 9 11 2233-4455', lastVisit: 'Ayer',         daysAgo: 1,  visits: '4 visitas', visitsCount: 4,  status: 'Cliente Frecuente', statusColor: 'purple' },
  { phone: '+54 9 11 9876-5432', lastVisit: 'Hace 3 días',  daysAgo: 3,  visits: '2 visitas', visitsCount: 2,  status: 'Regalo Pendiente', statusColor: 'emerald' },
  { phone: '+54 9 11 3344-5566', lastVisit: 'Hace 1 semana',daysAgo: 7,  visits: '10 visitas',visitsCount: 10, status: 'Cliente Frecuente', statusColor: 'purple' },
  { phone: '+54 9 11 5566-7788', lastVisit: 'Hace 35 días', daysAgo: 35, visits: '6 visitas', visitsCount: 6,  status: 'A recuperar', statusColor: 'amber' },
  { phone: '+54 9 11 8899-0011', lastVisit: 'Hace 47 días', daysAgo: 47, visits: '3 visitas', visitsCount: 3,  status: 'A recuperar', statusColor: 'amber' },
  { phone: '+54 9 11 7766-5544', lastVisit: 'Hace 52 días', daysAgo: 52, visits: '8 visitas', visitsCount: 8,  status: 'A recuperar', statusColor: 'amber' },
  { phone: '+54 9 11 1122-3344', lastVisit: 'Hace 38 días', daysAgo: 38, visits: '2 visitas', visitsCount: 2,  status: 'A recuperar', statusColor: 'amber' },
  { phone: '+54 9 11 2211-4433', lastVisit: 'Hace 44 días', daysAgo: 44, visits: '5 visitas', visitsCount: 5,  status: 'A recuperar', statusColor: 'amber' },
  { phone: '+54 9 11 9988-7766', lastVisit: 'Hace 31 días', daysAgo: 31, visits: '4 visitas', visitsCount: 4,  status: 'A recuperar', statusColor: 'amber' },
];
```

Estados posibles: `'Cliente Frecuente'` (purple), `'Regalo Pendiente'` (emerald), `'A recuperar'` (amber).

**Filtro por días sin venir**: `+7d` / `+15d` / `+30d` / `+45d` / `Todos`. Si `lapsedDays >= 15` y hay clientes, muestra CTA verde "Enviar WhatsApp a los N".

**WhatsApp masivo**: tiene un `wpMessage` editable hardcoded:
```
¡Hola! Te extrañamos en Mi Resto 🧡 Tenemos una pinta gratis esperándote. Mostranos este mensaje cuando vengas.
```

Shape sugerida back: `Customer { id, branchId, phone, totalVisits, voucherActive, lastVisitAt }`. `Visit { id, customerId, sessionId, visitedAt }`.

### 9.6 Métricas del cajero (Pulso)

**KPIs hardcoded** ([src/pages/CajeroLayout.jsx:233-323](src/pages/CajeroLayout.jsx#L233-L323)):

```js
// 4 KPI cards (semana actual vs anterior)
- Ticket promedio: $18.500 (-12% vs $21.100)
- Clientes nuevos: 18 (+28%, registrados desde QR)
- Valoración: 4.2 ⭐ (promedio semana)
- Clientes a recuperar: 6 (+30 días)

// Dato Clave (insight con sugerencia accionable)
{
  insight: "Tu promedio bajó a 4.2⭐. El 80% de las quejas (8 clientes) fueron por 'Comida Fría'",
  suggestion: "Revisá los tiempos entre la cocina y el mozo",
  actions: [
    { icon: 'restaurant_menu', label: 'Revisar tiempos de cocina', color: '#ef4444' },
    { icon: 'local_offer',     label: 'Ofrecer combo pinta + picada', color: '#13eca7' },
    { icon: 'people',          label: 'Recuperar 6 dormidos',         color: '#fbbf24' },
  ]
}

// Top pedidos desde la app
const TOP_PEDIDOS_APP = [
  { name: 'Pinta IPA',           count: 84, pct: 100, price: '$5.000',  cat: 'Bebida' },
  { name: 'Milanesa Napolitana', count: 62, pct: 74,  price: '$18.500', cat: 'Principal' },
  { name: 'Pizza Muzzarella',    count: 55, pct: 65,  price: '$14.000', cat: 'Principal' },
  { name: 'Ensalada César',      count: 38, pct: 45,  price: '$8.500',  cat: 'Entrada' },
  { name: 'Flan casero',         count: 27, pct: 32,  price: '$4.800',  cat: 'Postre' },
];

// Motivos de queja
const MOTIVOS_QUEJA = [
  { id: 'fria',     label: '🧊 Comida Fría',    count: 8 },
  { id: 'demora',   label: '⏳ Demora',          count: 5 },
  { id: 'atencion', label: '😠 Mala Atención',   count: 3 },
  { id: 'precio',   label: '💵 Precios',         count: 2 },
];

// Propinas por mozo (turno actual)
[
  { name: 'Carlos',  tip: '$2.000' },
  { name: 'Ana',     tip: '$1.000' },
  { name: 'Marcos',  tip: '$500' },
];
// Total: $3.500
```

**Granularidad temporal**: hardcodeada "Semana del 9 al 15 de abril · actualizado hace 4 min". No hay date picker.

**Filtros**:
- Historial de Pagos: por método (Todos / Mercado Pago / Transferencia / Efectivo).
- Reseñas: por tipo (todos / 5star / queja).
- Club: por días desde última visita (Todos / +7d / +15d / +30d / +45d).
- Búsqueda libre: input en Club ("Buscar por teléfono o nombre") y en Pagos ("Buscar por mesa, ID o monto").

Shape sugerida back: endpoint `GET /admin/:branchId/dashboard?period=week|month|day` que devuelve estos agregados pre-calculados.

### 9.7 Quick actions del mozo (sub-acciones de "Llamar al Mozo")

**Lista fija hardcoded** ([src/pages/ClientePage.jsx:13-18](src/pages/ClientePage.jsx#L13-L18)):

```js
const QUICK_ACTIONS = [
  { emoji: '🧊', label: 'Hielo' },
  { emoji: '🧂', label: 'Condimentos' },
  { emoji: '📄', label: 'Servilletas' },
  { emoji: '🧽', label: 'Limpiar mesa' },
];
```

**Cómo se modela el evento generado**: cada tap crea una alerta con `addAlert()`:

```js
addAlert({
  mesa: 'MESA 6',
  variant: 'orange',                // siempre orange para quick actions
  title: `Llevar ${action.label}`,  // "Llevar Hielo", "Llevar Condimentos"...
  icon: 'notifications',
  emoji: action.emoji,
});
```

**No es configurable hoy desde el panel del cajero.** Es lista fija en código. Este es un gap conocido — ver sección 14.

**Alert shape completa** ([src/lib/alertStore.js](src/lib/alertStore.js)):

```js
// localStorage key: 'hm_alerts'
[
  {
    id: 'alert-1731600000000-abc1',
    mesa: 'MESA 6',                  // string label
    variant: 'orange',                // 'red' | 'orange' | 'yellow' | 'paid' | 'purple' | 'blue'
    title: 'Llevar Hielo',            // string
    subtitle: '...',                  // optional, string
    icon: 'notifications',            // string (material icon name o key de iconMap)
    emoji: '🧊',                       // optional, string
    badgeCount: 3,                    // optional, number
    items: [...],                     // optional, presente solo en alertas 'purple' (Nuevo Pedido)
    createdAt: 1731600000000,
  },
]
```

Para alertas `purple` (nuevo pedido), `items` viene poblado con `[{ qty, name, description }]` para que `<OrderDetailModal>` lo muestre.

Shape sugerida back: usar `Event` + `EventType` existentes en HeyMozo destino. Los 4 quick actions serían `EventType` configurables a nivel `company` (no de sistema, son custom). Eso ya está soportado en el back según el contexto provisto. Ver sección 12.

### 9.8 Sesión de mesa (cómo se modela el "Mesa 6")

**No hay un modelo de Session formal en el mockup.** Se simula con:

```js
localStorage.setItem('hm_mesa6_session', '1');   // existe = hay sesión activa
localStorage.getItem('hm_mesa6_session');         // null = primer scan en esta mesa
```

Y la detección de "ya hay cuenta abierta" pregunta:
```js
const hadSession = localStorage.getItem('hm_mesa6_session');
if (hadSession && !_sessionVisited && getOrder().length > 0) {
  // Mostrar modal "Parece que quedó una cuenta abierta — Unirme / Empezar de cero"
}
```

Sumar un dispositivo a una mesa = mismo storage compartido (en el mockup es por origen, en producción sería por scan del QR de la mesa).

Shape sugerida back: `TableSession { id, tableId, openedAt, closedAt, totalCents, customers[] }`. Esta es la solución mencionada en la memoria `project_strategy.md`.

---

## 10. Qué está mockeado vs funcional

| Feature | Estado | Notas |
|---|---|---|
| **Llamar al mozo / quick actions** | Lógica real con localStorage | Genera alerta real que aparece en `/mozo`. Sincroniza cross-tab. |
| **Menú / carrito** | Lógica real | Add/remove con qty, total calculado, persistencia. Items hardcoded en `menuItems.js`. |
| **Confirmar pedido** | Lógica real | Mergea con alerta `purple` existente o crea nueva. `confirmOrder()` mueve cart→order. |
| **"Me equivoqué en el pedido"** | Lógica real | Genera alerta variant `orange` para el mozo. |
| **Pago Mercado Pago** | UI fake + alerta real | No hay integración con MP API. Genera caja-alert + alerta para el mozo. Modal de "el total / solo mi parte" funciona. |
| **Pago Transferencia** | UI fake + state real | Setea `mesa6Status=WAITING`, persiste monto. Cajero valida/rechaza desde su feed. Cliente polea y redirige. **Es el único flujo de pago con loop completo cliente↔cajero.** |
| **Pago Tarjeta / Efectivo** | UI informativa + alerta para mozo | "Mozo en camino" — solo notifica al mozo, no procesa nada. |
| **Propina (10/15/Otro/Nada)** | Cálculo real | Suma a total. Cuando es "Otro", input numérico libre. |
| **Dividir cuenta** | Calculador informativo | Solo muestra "cada uno paga $X". No genera N pagos. El split real es vía pagos parciales con MP. |
| **Validación de transferencia** | Loop real | Cajero ve card naranja, aprueba/rechaza, cliente recibe el resultado vía polling de `mesa6Status`. |
| **Rating + tags de queja** | UI funcional sin persistencia | Stars + tags + textarea local. No persiste a ningún store. Mock-only. |
| **Google Maps redirect** | Texto informativo | Botón "📍 También reseñar en Google Maps" sin URL ni intent — todavía no enlaza a nada. |
| **Club VIP (registro de teléfono)** | Lógica real | Registry multi-teléfono, sumar visita, desbloquear voucher a las 5 visitas, canjear voucher. Persistido. |
| **Voucher modal de bienvenida** | Lógica real | Si `hm_vip_voucher === '1'` al escanear, modal una vez por sesión (guard `hm_voucher_shown`). |
| **Sesión activa en mesa** | Lógica real | Detección + modal "Unirme / Empezar de cero". Confirmación destructiva en 2 pasos. |
| **Vista Mozo — alertas estáticas** | Mock | Mesa 1 (Tarjeta), Mesa 2 (Efectivo), Mesa 5 (Hielo) hardcoded. State machine simple: `PENDING → GONE`. |
| **Vista Mozo — alertas dinámicas** | Lógica real | Cualquier alerta que el cliente genere aparece acá. Agrupadas por mesa, con badge de conteo. |
| **Queue de modales en alertas agrupadas** | Lógica real | Si una mesa tiene 3 alertas, tap abre queue secuencial. Cada LISTO avanza al siguiente. |
| **Cajero — Pulso / KPIs** | Mock estático | Todos los números son hardcoded. Sin endpoint. |
| **Cajero — Acciones (validación de transfer + acuse MP)** | Lógica real para transfer, mock para MP | Las MP-alerts vienen reales desde cajaStore. La transfer-card aparece cuando `mesa6Status === 'WAITING'`. |
| **Cajero — Historial de Pagos** | Mock | Tabla hardcoded de 4 pagos (PAGOS_DATA). Solo el de mesa 6 usa `transferAmount` real. Filtros funcionan client-side. |
| **Cajero — Reseñas** | Mock | REVIEWS_DATA hardcoded. Ranking de mozos hardcoded. Filtros funcionan. |
| **Cajero — Club** | Mock con filtro real | CLUB_CLIENTS hardcoded. Filtro por días sin volver es real (filter sobre el array). |
| **Cajero — WhatsApp masivo** | UI fake | Modal con mensaje editable, botón "Enviar a N". No envía nada. |
| **Cajero — Exportar a Excel** | UI fake | Botón visible, sin handler. |
| **Bonus: Reset Demo** | Real | Limpia ~12 keys de localStorage y recarga. |
| **Bonus: cross-tab sync** | Real | Abrir cliente y mozo en pestañas distintas — alertas viajan en tiempo real. |

---

## 11. Flujos / interacciones especiales

### Animaciones
- **Modal entrance**: `cubic-bezier(0.34, 1.56, 0.64, 1)` con scale 0.85→1 (keyframe `modal-in` en index.css y en heymozo.css).
- **Bottom sheet slide-up**: `translateY(100%) → translateY(0)` ease-out 0.3s (definido inline en cada componente, ej. `mozo-slide-up`, `cart-slide-up`, `split-slide-up`).
- **Loading spinners**: rotación 360° linear infinite (`validando-spin`).
- **Pulse rings**: `box-shadow 0 0 0 0 → 0 0 0 15px` con fade (ConfirmadoPage check icon, `posnet-glow`, `efectivo-glow`, `validando-pulse`).
- **Active scale**: `active:scale-95 transition-transform duration-100` en CTAs grandes.
- **Toast feedback**: aparece debajo del bottom sheet de "Llamar al Mozo" cuando se manda — fade-in y desaparece con `setTimeout(1200)`.

### Modales en cascada
- **ActiveAlertsPage queue**: si una mesa tiene N alertas, abrir la card abre un queue. Cada LISTO remueve la actual y avanza al siguiente. Si el siguiente es purple+items → `OrderDetailModal`. Si no → `AlertModal`. Ver [src/pages/ActiveAlertsPage.jsx:92-145](src/pages/ActiveAlertsPage.jsx#L92-L145).
- **Confirmación destructiva 2-pasos**: ClientePage tiene un caso especial para "Empezar de cero" — primer modal es `sessionModal`, segundo es `confirmNewSession` (con monto que se pierde resaltado en rojo claro).

### Navegación condicional
- **PostPago**: si llegó con `state.pagoConfirmado === true` (vía Transferencia aprobada), título cambia a "¡Pago confirmado!" + subtítulo extra. Si no, "¡Gracias por venir hoy!".
- **PagarPage sin pedido** (`getOrderTotal() === 0`): fuerza modo "Otro" para propina, deshabilita métodos excepto MP (que paga solo propina), oculta botón "Dividir cuenta".
- **ValidandoTransferenciaPage**: polea `mesa6Status` cada 1s. Si pasa a `APPROVED` → redirige automáticamente con `navigate(...)`. Si pasa a `REJECTED` → cambia UI a estado de error in-place (no redirige).
- **MenuPage sticky header + pills sticky**: 2 sticky elements apilados (header en top 0, pills en top 49px).

### Gestos
- No hay swipe-to-dismiss en los bottom sheets — se cierran tocando el backdrop u "Cancelar".
- Tap on backdrop cierra modales en el cliente.
- `e.stopPropagation()` en el body del modal previene cierre accidental.

### Cross-tab sync (interaction especial)
Abrir `/cliente` y `/mozo` en pestañas distintas del mismo navegador. Tap "Llamar al Mozo" en cliente → la alerta aparece en mozo en <1s (sin recargar). Esto está orquestado en `alertStore.js` con `storage` events. Es uno de los selling points del demo.

### Reset demo
Hardcoded en 3 lugares (Header.jsx, ClientePage.jsx, CajeroLayout.jsx). Limpia:
```js
['hm_mesa6_session','hm_vip_phone','hm_vip_visits','hm_vip_voucher','hm_vip_registry',
 'hm_alerts','hm_cart','hm_order','mesa1Status','mesa2Status','mesa6Status',
 'hm_mesa5_done','hm_caja_alerts','hm_mesa6_transfer_amount']
```
+ `sessionStorage.clear()` + `window.location.reload()`.

---

## 12. Configuraciones del owner/cajero

**Hoy, casi nada es configurable desde la UI del cajero.** El admin del owner es lo que hay que construir. Resumen de lo que el dueño/cajero "controlaría" en producción y dónde se ve hoy:

| Configurable | Dónde aparece hoy | Estado configurable |
|---|---|---|
| **Quick actions del mozo** (Hielo, Condimentos, Servilletas, Limpiar mesa) | Hardcoded en `QUICK_ACTIONS` de ClientePage.jsx | **No configurable.** Es una constante en código. Para el back: encajaría con `EventConfiguration` (eventos configurables por empresa con overrides). |
| **Menú** (categorías + items + precios) | Hardcoded en `menuItems.js` | **No configurable.** Nuevo modelo en back: `Category` + `MenuItem`. |
| **Alias de transferencia / titular / CUIT** | Hardcoded en TransferenciaPage.jsx (`CERVECERIA.HEYMOZO`, `Juan Perez`, `30-12345678-9`) | **No configurable.** Debería estar a nivel `Company` o `Branch`. |
| **Métodos de pago habilitados** (qué métodos muestra la PagarPage) | Hardcoded — siempre muestra los 4 | **No configurable.** Debería ser flag por sucursal. |
| **Visitas para voucher** (`VISITS_FOR_VOUCHER = 5`) | Constante en `loyaltyStore.js` | **No configurable.** Debería ser config por empresa. |
| **Mensaje del voucher** (texto "1× Pinta Gratis 🍺") | Hardcoded en ClientePage modal | **No configurable.** |
| **Mensaje WhatsApp masivo** | Editable en runtime, no persiste | Está editable en la UI del Cajero pero no se guarda en localStorage. Sería config por empresa. |
| **Tags de queja** (fria/demora/atencion/precio) | Hardcoded en PostPago y en Cajero | **No configurable.** Set fijo. |
| **Opciones de propina** (10%/15%/Otro/Nada) | Hardcoded `TIP_OPTIONS` en PagarPage | **No configurable.** |
| **Sectores del mozo** ("Sector A") | Hardcoded en Header.jsx dropdown — solo tiene "Sector A" | **No configurable**, placeholder. |
| **Nombre del restaurante / logo** | Hardcoded "Mi Resto" + ícono `restaurant` en background `#e8362a` | **No configurable**, pero HeyMozo destino ya tiene `Company` para esto. |

**Lugares donde un admin tendría sentido en el destino**:
- `/admin/:companyId/config`: agregar tabs para "Quick actions del mozo" (CRUD), "Métodos de pago", "Mensajes" (voucher, WhatsApp masivo), "Configuración Club" (visits-to-voucher).
- `/admin/:companyId/:branchId/config`: alias bancario + titular + CUIT por sucursal.
- Nuevo: `/admin/:companyId/menu` para CRUD del menú con drag-and-drop (HeyMozo destino ya tiene drag-drop para mesas, mismo pattern).

---

## 13. Decisiones de diseño no obvias

1. **Spacing inline en lugar de Tailwind utility-only.** Hay memoria explícita del usuario:
   > "User wants generous padding/margins with inline styles, not Tailwind-only spacing."

   Por eso ves `style={{ padding: '1.25rem', gap: '0.75rem' }}` en lugar de `className="p-5 gap-3"`. Mantener esto al portar — no convertir todo a clases Tailwind.

2. **No hay componentes Button/Input atómicos.** Es deliberado: cada CTA tiene shadow, gradient, radius específicos al contexto semántico (morado=primary, naranja=mozo, verde=pago, rojo=urgente). Consolidar en `<Button variant="">` perdería esa identidad sin un sistema más rico (gradients, shadows tinteadas, sizes). Si se consolida en HeyMozo, hacerlo con cuidado.

3. **Cliente y Cajero usan paletas distintas.** Cliente: dark + acentos morados/rojos. Cajero: dark más azulado (`#13151f` / `#1a1c29`) + verde cyan `#13eca7`. Esto refuerza visualmente "soy el dueño" vs "soy el cliente".

4. **MVP simplification commit (`c614251`)**: en la rama actual se removieron Factura A y AI explícitamente para el pitch. Si ves referencias a `facturasAStore.js` no las uses — está deprecated. La memoria `project_strategy.md` cubre esto.

5. **localStorage como state machine para una mesa única (`MESA 6`)**. El mockup está harcodeado a una mesa para no requerir routing por `:tableId`. Al portar, todos los `'MESA 6'` se vuelven dinámicos por `tableId` y el storage hay que pluralizar (`hm_mesa_${tableId}_session`, etc.) o migrar a estado server.

6. **Cross-tab sync con `StorageEvent` dispatch manual**. `cajaStore.js` y `facturasAStore.js` disparan `StorageEvent` manualmente además del CustomEvent. Esto es porque `localStorage.setItem` en la misma ventana NO dispara el `storage` event nativo (solo en otras ventanas). Para que el polling fallback en CajeroLayout pesque la actualización sin pestañas adicionales abiertas.

7. **`PEND/COOKING/OCCUPIED/GONE` state machine documentada en CLAUDE.md no se usa en el mockup actual.** El CLAUDE.md menciona estados de pedidos por mesa — eso era de una versión anterior. En el mockup actual el estado vive en alertas (`PENDING → GONE`, con `WAITING/APPROVED/REJECTED` solo para transferencia).

8. **El "Phone" wrapper NO es un frame de teléfono.** Es solo un flex column con `min-height: 100vh/100dvh`. No tiene marco visible. El mockup ocupa todo el viewport. El nombre "phone" es legacy de cuando había `<StatusBar>` y un frame visual.

9. **Cliente NO tiene un `Header` reutilizable**. Cada pantalla del cliente define su header inline (`<header className="sticky top-0">...</header>`). MenuPage / CartPage / PagarPage / TransferenciaPage tienen variantes parecidas pero no idénticas (commit reciente `57818e7 feat: unify headers across all client pages` — apenas se está unificando ahora). Si el otro Claude porta esto, **convendría hacer un `<ClientPageHeader>` ahora**.

10. **Las alertas se agrupan por mesa en la vista del mozo**, NO por orden de llegada. Una mesa puede tener 3 alertas distintas (Cuenta + Hielo + Corrección) y aparecen como UNA card con badge `3`. Tap → queue de modales secuenciales por prioridad (`red < purple < orange < paid`). Ver `VARIANT_PRIORITY` en ActiveAlertsPage.

11. **El mocking de fechas/tiempos es relativo en runtime**. `getTimeSince(createdAt)` calcula minutos desde `Date.now()`. Al refrescar la página, la wait time se recalcula. No hay backend de tiempo.

12. **`reactivity` se logra sin Context ni libs**: cada store define `use<Store>()` que internamente usa `useState` + listeners `'storage'` + `'<store-name>-changed'` custom event + polling fallback (1.5s) para invariantes hard. Es 100% local-first pero con cross-tab gratis. Patrón replicable, no copiar a HeyMozo donde ya hay servidor real.

---

## 14. Gaps conocidos

### Funcionales
- **No hay Stripe / MercadoPago real**: todos los flujos de pago son UI fake. En el demo el "pago" es solo notificación al mozo / cajero.
- **No hay confirmación de pago tarjeta**: cuando el cliente toca "Tarjeta / MODO" navega a `/cliente/posnet` que dice "Posnet en camino" pero el mozo no tiene un loop de confirmación (a diferencia de Transferencia donde sí hay aprobar/rechazar).
- **Google Maps redirect** está sin URL — botón "📍 También reseñar en Google Maps" no hace nada.
- **WhatsApp masivo** no envía. El template editable no se persiste.
- **Exportar a Excel** sin handler en Cajero.
- **Búsqueda en Club + búsqueda en Historial**: inputs sin handler. UI estática.
- **Quick actions del mozo no son configurables**. Lista cerrada de 4.
- **Menú no es editable** desde admin. Hardcoded en `menuItems.js`.
- **Sectores hardcoded a "Sector A"**: dropdown tiene un solo item.
- **No hay multi-mesa real**: todo el mockup está fijado a `MESA 6` para el cliente y `MESA 1/2/5` mock para el mozo. No hay routing por tableId.
- **No hay multi-sucursal / multi-empresa**: el mockup asume un solo restaurante (`Mi Resto`).
- **No hay autenticación**: no hay login, no hay rol por usuario. La distinción cliente/mozo/cajero es solo por ruta.

### Componentes legacy / muertos
- `<ClienteHeader>`, `<MesaCard>`, `<BottomNav>` (vacío), `<PayModal>` (único uso de HeroUI) — descartar.
- `facturasAStore.js` — store sin uso, removed del MVP.
- Algunos archivos CSS en `heymozo.css` (`.modal-overlay`, `.modal-card`, `.modal-table-header`, `.alert-card` con HTML clásico, `.action-btn`, `.btn-blue`, `.bottom-nav`, `.star-icon`, `.info-icon`) ya no se referencian porque los modales se reescribieron inline.

### Build / config
- Fuentes `Inter` / `Manrope` referenciadas en classNames pero no cargadas — caen al stack del sistema. Decisión: cargarlas con Google Fonts o eliminar override.
- Material Symbols Outlined no está enlazado en `index.html` — debería estar para que rendericen los iconos.
- Sin tests, sin storybook.
- `vite@^8.0.0-beta.13` (versión beta) — HeyMozo destino probablemente quiera estable.
- HeroUI beta dep instalada sin uso real — eliminar.

### Diferencias estructurales con HeyMozo destino
- **Mockup**: React 19, Router 7. **HeyMozo**: React 18, Router 6. APIs compatibles, sin breaking changes en lo que usamos.
- **Mockup**: Tailwind 4 CSS-first. **HeyMozo**: probablemente Tailwind 3 + config JS o CSS plano. Migrar `@theme {}` block a `tailwind.config.js`.
- **Mockup**: estado solo en localStorage. **HeyMozo**: tiene Express + PostgreSQL + Sequelize + polling cada 6s. Reemplazar todos los stores por fetch/mutate al back. El patrón de `use<Store>()` hooks puede convertirse fácilmente a hooks con fetch + interval.

---

**Fin del documento.** Cualquier duda, ver el código fuente desde [src/App.jsx](src/App.jsx) que es el punto de entrada del routing. Los archivos más densos son [src/pages/CajeroLayout.jsx](src/pages/CajeroLayout.jsx) (2103 líneas) y [src/pages/ClientePage.jsx](src/pages/ClientePage.jsx) (634 líneas).
