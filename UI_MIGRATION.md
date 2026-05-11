# UI_MIGRATION.md

Plan de migración del mockup `HeyMozo Mockup` (rama `feat/unified-headers`, commit base `c614251`) al proyecto destino `HeyMozo` (rama `feature/ui-redesign`).

> Documento fuente: [MOCKUP_HANDOFF.md](MOCKUP_HANDOFF.md). Acá no se repite el detalle del mockup — solo el mapeo a HeyMozo destino y el plan de ejecución.

---

## TL;DR

- **Fase 1 (UI-only, sin tocar back)**: rediseñar `UserScreen` y `AdminScreen`, traer design system (tokens, fuentes, animaciones), agregar componentes core (`Phone`, `AlertCard`, `AlertModal`, `OrderDetailModal`). Los quick actions del mozo (Hielo/Condimentos/etc.) ya son implementables 100% end-to-end usando el sistema existente de `EventType` + `EventConfiguration`. Esto significa que Fase 1 sale a producción con valor real, no es solo cosmético.
- **Fase 2 (features nuevas con back)**: menú interactivo, carrito/pedidos, pasarela de pagos, post-pago (rating + tags + club VIP), dashboard del cajero (Pulso/Pagos/Reseñas/Club).
- **3 deudas técnicas detectadas durante la auditoría** que conviene resolver antes de empezar — ver sección 8.

---

## 1. Mapeo pantalla por pantalla

Cada pantalla del mockup se clasifica en una de tres categorías:

- **REDISEÑO**: la pantalla equivalente ya existe en HeyMozo destino con un modelo de datos compatible. Cambia solo el front (look, layout, interacciones secundarias). Backend intacto.
- **REDISEÑO + tweaks back**: existe la pantalla equivalente, pero el rediseño introduce sub-features que requieren ajustes menores en el back (nuevos endpoints/campos, no nuevos modelos).
- **NUEVA**: no existe nada equivalente. Requiere nuevos modelos, endpoints y front desde cero.

| # | Pantalla mockup | Ruta mockup | Pantalla HeyMozo destino | Ruta destino | Categoría | Notas |
|---|---|---|---|---|---|---|
| 1 | ClientePage | `/cliente` | UserScreen | `/user/:companyId/:branchId/:tableId` | **REDISEÑO + tweaks back** | Mantiene "Llamar al Mozo" (ya existe). Agrega botón "Ver Menú" (nuevo, vínculo a Fase 2) y "Pagar" (nuevo, vínculo a Fase 2). Quick actions van adentro del modal de mozo. |
| 2 | MozoLayout + ActiveAlertsPage | `/mozo/*` | AdminScreen | `/admin/:companyId/:branchId` | **REDISEÑO** | Lógica existente (polling 6s, eventos, mark-seen, sonido) se preserva. Cambia el modelo visual: de tabla/grid con timeline → cards apiladas por urgencia con colores semánticos. |
| 3 | MenuPage | `/cliente/menu` | — | — | **NUEVA** | Requiere modelo `Category` + `MenuItem` + admin CRUD. Fase 2. |
| 4 | CartPage | `/cliente/pedido` | — | — | **NUEVA** | Requiere modelo `Order` + `OrderItem` + `TableSession`. Fase 2. |
| 5 | ConfirmadoPage | `/cliente/confirmado` | — | — | **NUEVA** | Pantalla de confirmación post-pedido. Trivial una vez exista `Order`. Fase 2. |
| 6 | PagarPage | `/cliente/pagar` | — | — | **NUEVA** | Pasarela. Requiere modelo `Payment` + integración Mercado Pago + flow de propina. Fase 2. |
| 7 | TransferenciaPage | `/cliente/transferencia` | — | — | **NUEVA** | Requiere config bancaria por sucursal (alias/CBU/CUIT) + ciclo aprobar/rechazar en admin. Fase 2. |
| 8 | PosnetPage | `/cliente/posnet` | — | — | **NUEVA** | Solo UI informativa "Mozo en camino" + alerta para mozo. Casi trivial. Fase 2. |
| 9 | EfectivoPage | `/cliente/efectivo` | — | — | **NUEVA** | Mismo patrón que PosnetPage. Fase 2. |
| 10 | ValidandoTransferenciaPage | `/cliente/validando-transferencia` | — | — | **NUEVA** | Polling cliente del estado de aprobación. Requiere endpoint `/payments/:id/status`. Fase 2. |
| 11 | ModoPagoLitePage | `/cliente/pago-lite` | — | — | **NUEVA** | "Pagar sin haber pedido por la app". Caso de uso de rollout barato (no necesita cocina). Fase 2 — buen candidato para shippear primero dentro de Fase 2. |
| 12 | PostPagoPage | `/cliente/post-pago` | — | — | **NUEVA** | Rating + tags + Club VIP. Requiere `Review`, `Customer`, `Visit`. Fase 2. |
| 13 | CajeroLayout (Pulso/Acciones/Pagos/Reseñas/Club) | `/cajero` | — | — | **NUEVA** | 5 tabs. Es el componente más grande del mockup (2103 LOC). Requiere endpoint agregador + acceso a `Payment`, `Review`, `Customer`. Fase 2. |
| — | (sin equivalente) | — | CompanyList | `/admin/config` | mantener | Listado de empresas del usuario. El mockup no toca esto. |
| — | (sin equivalente) | — | CompanyConfig | `/admin/:companyId/config` | mantener + extender en F2 | Listado de sucursales. En Fase 2 se le agregan tabs de config (quick actions, menú, métodos de pago, mensajes Club). |
| — | (sin equivalente) | — | BranchConfig | `/admin/:companyId/:branchId/config` | mantener + extender en F2 | Config de sucursal. En Fase 2 se le agrega config bancaria. |
| — | (sin equivalente) | — | TableUrls | `/admin/:companyId/:branchId/urls` | mantener | Generador de QR. Mockup no toca esto. |
| — | (sin equivalente) | — | LoginPage | `/admin/login` | mantener | Magic link. Mockup no tiene auth. |
| — | (sin equivalente) | — | App landing | `/` | revisar en F1 final | Landing pública con contact form. No prioridad. |
| — | (sin equivalente) | — | FAQ | `/faq` | mantener | Mockup no toca esto. |

---

## 2. Mapeo de componentes

### Componentes del mockup → componentes a crear/portar en HeyMozo

| Componente mockup | Archivo mockup | Acción en HeyMozo | Notas |
|---|---|---|---|
| `<Phone>` | `src/components/Phone.jsx` | **Crear nuevo** `src/components/Phone.js` | Wrapper `<div>` con `min-height: 100dvh` + flex column + bg `#1c1c1e`. Lo van a usar todas las pantallas `/user/*` redirseñadas. |
| `<AlertCard>` | `src/components/AlertCard.jsx` | **Crear nuevo** `src/components/AlertCard.js` | Core de la vista mozo rediseñada. 6 variants (red/orange/yellow/paid/purple/blue). Reemplaza la actual `TablesList` row item. |
| `<AlertModal>` | `src/components/AlertModal.jsx` | **Crear nuevo** `src/components/AlertModal.js` | Modal genérico "Mesa X / esperando Y min / EMOJI / LABEL / ¡VOY!". |
| `<OrderDetailModal>` | `src/components/OrderDetailModal.jsx` | **Crear nuevo** `src/components/OrderDetailModal.js` | Aparece en F2 cuando exista `Order`. Cabecera púrpura + lista de items. |
| `<Header>` (mozo) | `src/components/Header.jsx` | **Reemplaza** `src/components/AdminHeader.js` / `.css` | El AdminHeader actual ya tiene branch picker + settings; alinear visual con el del mockup (logo + sector picker + settings dropdown). Mantener integración con auth/permissions. |
| Cliente headers inline | (varios en cada `/cliente/*`) | **Crear nuevo** `src/components/ClientPageHeader.js` | El mockup todavía no unifica los headers del cliente (commit reciente lo está empezando). En la migración, **unificar de una** en un componente `<ClientPageHeader title back? rightSlot? />`. |
| `<Sidebar>` | `src/components/Sidebar.jsx` | Portar opcional | El mockup tiene un sidebar de desktop con 1 tab. No es crítico. Postponer. |
| `<StatusBar>` | `src/components/StatusBar.jsx` | **Descartar** | Frame iOS fake. Sin valor en producción. |
| `<ClienteHeader>` | `src/components/ClienteHeader.jsx` | **Descartar** | Legacy del mockup mismo. |
| `<MesaCard>` | `src/components/MesaCard.jsx` | **Descartar** | Legacy. La card es `<AlertCard>`. |
| `<BottomNav>` | `src/components/BottomNav.jsx` | **Descartar** | Vacío, `return null`. |
| `<PayModal>` | `src/components/PayModal.jsx` | **Descartar** | Único usuario de HeroUI. Código muerto. En Fase 2 la PagarPage tiene su propio layout. |

### Componentes actuales de HeyMozo destino → qué pasa con cada uno

| Componente actual | Archivo | Acción | Razón |
|---|---|---|---|
| `UserScreen` | `src/components/UserScreen.js` | **Rediseñar completo** | Mantiene API (recibe `companyId/branchId/tableId`, hace SCAN, lista de event buttons). Cambia el layout, paleta, tamaños, agrega botones Menu/Pagar (los dos como "próximamente" en F1, funcionales en F2). |
| `UserScreen.css` | `src/components/UserScreen.css` | **Rediseñar completo** | Adoptar tokens dark del mockup. |
| `ButtonsGroup` | `src/components/ButtonsGroup.js` | **Rediseñar** | Lógica de "renderizar botones dinámicos según `availableEvents`" se preserva. Cambian estilos (gradient shadows, sizes). El modal de "Llamar al Mozo con quick actions" se agrega como un nuevo componente o se integra acá. |
| `ButtonsGroup.css` | `src/components/ButtonsGroup.css` | **Rediseñar** | Tokens dark + sombras coloreadas. |
| `HistoryModal` | `src/components/HistoryModal.js` | **Mantener funcional, repintar** | El mockup no tiene equivalente directo. HeyMozo ya tiene historial de sesión local. Mantener y solo adaptar estilos al nuevo tema dark. |
| `AdminScreen` | `src/components/AdminScreen.js` | **Rediseñar completo** | Mantiene polling 6s, countUnseenEvents, sound notif, useMemo de sort. Reemplaza el render: en vez de tabla de mesas con timeline → grid de `<AlertCard>` agrupadas por mesa. |
| `AdminScreen.css` | `src/components/AdminScreen.css` | **Rediseñar completo** | Nuevo tema. |
| `AdminHeader` | `src/components/AdminHeader.js` | **Rediseñar para que matchee `<Header>` del mockup** | Mantener auth/branch picker. Hay cambios pendientes uncommitted en `AdminHeader.css` — incorporarlos o resetearlos antes de empezar. |
| `TablesList` | `src/components/TablesList.js` | **Reemplazar render con `<AlertCard>` grid** | La lógica de filtrar/ordenar/agrupar mesas se preserva. Cambia lo que renderea cada item. |
| `EventsList`, `EventModal`, `AdminHistoryModal` | varios | **Repintar** | Funcionalmente se mantienen. Solo adaptar tema. |
| `CompanyList`, `CompanyConfig`, `BranchConfig`, `TableUrls`, `EventConfigModal`, `IconPicker`, `QRGenerator*` | varios | **Mantener — repintar opcional en F1** | El admin profundo (config) puede pintarse en una iteración separada. No es del path de pitch. |
| `BenefitsSection`, `FeatureCarousel`, `HowItWorks`, `FAQ` | varios | **Mantener** | Landing pública. Mockup no toca. |
| `LoginForm`, `LoginPage`, `ProtectedRoute`, `SoundToggleButton` | varios | **Mantener** | Mockup no tiene auth. |

---

## 3. Mapeo de features (backend)

Tabla de qué feature del mockup tiene contraparte en el back de HeyMozo destino y cuál requiere modelos/endpoints nuevos.

| Feature mockup | ¿Existe en back HeyMozo? | Trabajo back necesario | Fase |
|---|---|---|---|
| **Llamar al mozo** (botón básico) | ✅ Sí — `Event` + `EventType` (`CALL_WAITER` legacy o custom) | Ninguno | F1 (UI-only) |
| **Quick actions** (Hielo, Condimentos, Servilletas, Limpiar mesa) | ✅ Soportable con `EventType` + `EventConfiguration` existente | **Seed**: crear estos 4 `EventType` custom por empresa al crear company (extender `routes/index.js` `POST /companies`). Opcional: UI de admin para CRUD-earlos en F2. | F1 (back: seed only; UI: el modal de quick actions consume `availableEvents` filtrados) |
| **Notif al mozo de pago Tarjeta/Efectivo** | ✅ Mismo patrón, es un Event | Crear `EventType` "Pago tarjeta" y "Pago efectivo" (variant `red`) en seed | F1 si el botón de Pagar abre solo eso, F2 con la pasarela completa |
| **Menú interactivo** | ❌ Solo link a menú externo PDF | **Nuevos modelos**: `Category { id, companyId, name, order }`, `MenuItem { id, categoryId, title, description, priceCents, imageUrl, available }`. **Endpoints**: público `GET /api/menu/:companyId`, admin CRUD. **Admin UI**: `/admin/:companyId/menu` con drag-and-drop reusando patrón de mesas. | F2 |
| **Carrito + Pedido** | ❌ No existe | **Nuevos modelos**: `TableSession { id, tableId, openedAt, closedAt, totalCents }`, `Order { id, sessionId, status enum(pending\|sent\|preparing\|served), totalCents }`, `OrderItem { id, orderId, menuItemId, qty, unitPriceCents, notes? }`. **Endpoints**: `POST /api/tables/:id/orders`, `PATCH /api/orders/:id`, etc. | F2 |
| **"Agregar al pedido ya enviado"** (merge a alerta existente) | ❌ | Lógica del controller: si existe `Order` con status `sent` y no `served`, hacer append de items en lugar de crear nuevo. | F2 |
| **Pago Mercado Pago** | ❌ | **Integración MP API** (preference + webhook de confirmación). Modelo `Payment { id, sessionId, method enum, amountCents, tipCents, status, processedAt, externalRef? }`. | F2 |
| **Pago Transferencia + validación cajero** | ❌ | Config bancaria por `Branch` (alias, titular, cuit). Flow: cliente toca "Ya transferí" → `Payment status=waiting`. Admin ve en feed → aprueba/rechaza → status `approved/rejected`. Cliente polea estado. | F2 |
| **Pago Tarjeta / Efectivo** | ❌ | `Payment` con status `manual_ack` que genera un `Event` para el mozo. | F2 |
| **Propina** | ❌ | Campo `tipCents` en `Payment`. Sin tabla extra. | F2 |
| **Dividir cuenta** | ❌ (no es split real, es calculador) | Nada en back. Solo cálculo en cliente. | F2 |
| **Rating + comentario + tags queja** | ❌ | **Nuevos modelos**: `Review { id, sessionId, branchId, stars, comment, derivedToGoogle, createdAt }`, `ReviewTag { id, reviewId, tag enum }`. Endpoint público `POST /api/reviews`. | F2 |
| **Google Maps redirect** | ❌ | Campo `googleMapsUrl` en `Branch` (o `Company`). Solo si `rating >= 4` mostrar CTA con esa URL. | F2 |
| **Club VIP / Loyalty** | ❌ | **Nuevos modelos**: `Customer { id, companyId, phone, totalVisits, voucherActive, lastVisitAt }`, `Visit { id, customerId, sessionId, branchId, visitedAt }`. Config `visitsForVoucher` por empresa. Endpoints: `POST /api/customers/register-visit`, `POST /api/customers/redeem-voucher`. | F2 |
| **WhatsApp masivo a "dormidos"** | ❌ | Endpoint admin `POST /api/companies/:id/wpp-broadcast` que devuelve URLs `wa.me/<phone>?text=<encoded>` para abrir en serie (no enviar desde el server). Template editable persiste en `Company.wppTemplate`. | F2 |
| **Dashboard métricas (Pulso)** | ❌ | Endpoint agregador `GET /api/admin/branches/:id/dashboard?period=week`. Calcula ticket promedio, nuevos clientes, promedio rating, clientes a recuperar, top items pedidos, motivos de queja, propinas por mozo. | F2 |
| **Sesión de mesa** (TableSession) | ❌ | Ver fila "Carrito + Pedido". | F2 |
| **Sectores del mozo** | ❌ (mockup también lo tiene hardcoded) | Considerar como mejora separada, post-F2. | postpuesto |
| **Auth** | ✅ Magic link en HeyMozo | El mockup no tiene auth. Mantener la actual. | — |
| **Multi-empresa / Multi-sucursal / Multi-mesa** | ✅ HeyMozo ya tiene Company → Branch → Table | Al portar el mockup, convertir todas las refs hardcoded `MESA 6` a `tableId` real. | F1 (parte de la portación de UserScreen) |

---

## 4. Mapeo de stores → fuentes de datos en HeyMozo

El mockup usa 5 stores en localStorage. En HeyMozo destino se reemplazan así:

| Store mockup | Archivo | Datos | Reemplazo en HeyMozo | Cuándo |
|---|---|---|---|---|
| `alertStore.js` | `hm_alerts` (cross-tab via storage events) | Alertas activas para vista mozo | Fetch a `/api/branches/:id/tables` que ya devuelve eventos. El polling 6s actual ya replica el "cross-tab" del mockup contra el server. | F1 |
| `cartStore.js` | `hm_cart`, `hm_order` | Carrito + pedido confirmado | Nuevo: fetch a `/api/sessions/:id/cart` + `/api/sessions/:id/order`. localStorage sólo como cache local opcional, fuente de verdad = back. | F2 |
| `cajaStore.js` | `hm_caja_alerts` | Alertas del cajero (acuses de pago) | Nuevo: feed de `Payment` con status reciente. WebSocket o polling. | F2 |
| `loyaltyStore.js` | `hm_vip_registry`, `hm_vip_phone`, etc. | Registry de teléfonos VIP | Nuevo: `Customer` model en back. Cliente solo guarda el `phone` activo de la sesión en localStorage. | F2 |
| `facturasAStore.js` | (sin uso) | — | Ignorar. Removido del MVP del mockup. | — |

---

## 5. Design system — qué traer en Fase 1

Estos elementos del [MOCKUP_HANDOFF.md §5](MOCKUP_HANDOFF.md) van al destino al principio de Fase 1, antes de empezar a portar pantallas:

### 5.1 Tokens (CSS variables / `index.css` global)
- Fondo body: `#1c1c1e`.
- Paletas semánticas (ver tabla de "Paleta — Acentos" en handoff): morado `#9333ea`, naranja `#e07b00`, verde `#16a34a`, verde-cajero `#13eca7`, rojo-brand `#e8362a`, amarillo `#fbbf24`.
- Texto: blanco / `#e4e2e4` / `#9ca3af` / `#6b7280`.
- Bordes: `#3a3a3c` / `rgba(147,51,234,0.25)`.
- Stack tipográfico: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif`.

Decisión a tomar antes de empezar: ¿se usa Tailwind acá? El mockup usa Tailwind 4 CSS-first; HeyMozo destino hoy es **CSS plano + clases** (no detecto `tailwindcss` en `package.json`). **Recomendación**: NO introducir Tailwind ahora. Portar las clases del mockup a CSS plano usando los mismos tokens. Es más trabajo de transcripción pero evita un bump de toolchain mid-feature.

> ⚠️ Confirmar con el usuario antes de F1.

### 5.2 Fuentes externas
Agregar a `public/index.html`:
- `<link href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined" rel="stylesheet">` — el mockup lo usa y no estaba enlazado (gap conocido).
- Decidir si se cargan `Inter` y `Manrope` (el mockup las referencia inline pero no las carga). Recomendación: cargar `Inter` (es la que pisa más veces) y eliminar los overrides de `Manrope`.

### 5.3 Animaciones globales
Agregar a `index.css` (o un nuevo `styles/animations.css`):
- `@keyframes modal-in` — `cubic-bezier(0.34, 1.56, 0.64, 1)`, scale 0.85→1.
- `@keyframes slide-up` — bottom sheets (`translateY(100%) → 0`, ease-out 0.3s).
- `@keyframes ring-pulse` — pulses de éxito.
- `@keyframes spin-360` — spinner de validación.
- Utility `.active-scale` — `active:transform: scale(0.95); transition: transform 0.1s`.

### 5.4 Glow decorativo fijo
Pattern de "dos blobs blureados en esquinas opuestas" que aparece en todas las pantallas del cliente. Encapsular en un componente `<DecorativeGlow accent1 accent2 />` para no copiar/pegar.

---

## 6. Plan de ejecución — Fase 1 (UI-only, sin cambios de back)

Objetivo: poner el rediseño visual de las dos pantallas core (cliente y mozo) en producción, con el sistema existente de eventos. El cliente ve menú externo y "Pagar" como "próximamente" (botones disabled o que no aparecen). Los quick actions del mozo sí funcionan end-to-end porque usan `EventType`.

### Sprint 1 — Foundation (1–2 días)
1. Confirmar decisión Tailwind vs CSS plano (con el usuario).
2. Cargar fuentes y Material Symbols en `public/index.html`.
3. Crear `src/styles/tokens.css` (o `theme.css`) con paletas + animaciones globales.
4. Crear componentes base: `<Phone>`, `<ClientPageHeader>`, `<DecorativeGlow>`.
5. Resolver deudas técnicas previas (ver §8).

### Sprint 2 — Rediseño UserScreen (2–3 días)
1. Crear nuevos `src/components/UserScreen.js` + `.css` con layout del mockup (saludo gigante, 3 botones grandes).
2. Botones:
   - **Ver Menú**: si la company tiene `menu` link, abre externo (igual que hoy). Si no, queda disabled con label "Próximamente". En F2 se reemplaza por navegación a `/user/.../menu` interactivo.
   - **Llamar al Mozo**: abre bottom sheet con quick actions (renderizadas desde `availableEvents` filtrados por una nueva flag `isQuickAction` o por convención de nombre). En F1 inicial puede ser hardcoded a 4 botones que disparan los 4 `EventType` custom creados por seed.
   - **Pagar / Dejar Propina**: en F1, este botón dispara el `EventType` `REQUEST_CHECK` legacy o el equivalente custom y muestra un toast "Avisado al mozo". En F2 navega a `/user/.../pagar`.
3. Badge VIP Club: en F1 NO se muestra (depende de modelo `Customer`). Reservado para F2.
4. Reemplazar `ButtonsGroup` o rediseñarlo: el nuevo cliente tiene un solo "Llamar al Mozo" que abre modal, no una grilla de botones por evento. Los eventos custom se vuelven sub-botones dentro del modal.
5. Adaptar `HistoryModal` al nuevo tema.

### Sprint 3 — Rediseño AdminScreen / Vista Mozo (3–4 días)
1. Crear `<AlertCard>` con las 6 variants.
2. Crear `<AlertModal>` y `<OrderDetailModal>` (este último vacío en F1, listo para F2).
3. Reemplazar el render de `TablesList` por un grid de `<AlertCard>`.
4. Implementar agrupación de eventos por mesa con badge contador (preservar la lógica de `countUnseenEvents` y `processedTables` de `AdminScreen.js`).
5. Implementar el queue de modales (tap card con 3 alertas → 3 modales secuenciales). Mantener `mark-seen` en cada confirm.
6. Mapear `EventType` → variant de `<AlertCard>`:
   - Sistema `SCAN` → no genera card (es interno).
   - Eventos custom de tipo "pago" → variant `red`.
   - Eventos custom de quick action → variant `orange`.
   - Eventos pendientes de mozo → variant `yellow`.
   - Pago confirmado / mark-available → variant `paid` (verde).
   - Nuevo pedido (F2) → variant `purple`.

   **Sugerencia**: agregar campo `cardVariant` opcional al `EventType` para que el admin lo configure. En F1 hardcodear el mapping; en F2 hacerlo configurable.

7. Adaptar `AdminHeader` al estilo del mockup (logo + sector picker placeholder + settings dropdown).
8. Mantener: polling 6s, sonido notification.mp3, contador, ordenamiento por priority/tableNumber.

### Sprint 4 — Repintar el resto del admin (opcional, 2 días)
- `CompanyList`, `CompanyConfig`, `BranchConfig`, `TableUrls`, `EventConfigModal`, `IconPicker` reciben el nuevo tema sin cambios funcionales.
- Si el tiempo aprieta, se puede dejar el admin "viejo" hasta F2.

### Sprint 5 — QA y deploy de F1 (1 día)
- Verificar en dispositivos reales (mobile + tablet).
- Cross-browser: Safari mobile es el caso crítico (el mockup usa muchas features modernas).
- Smoke test del flow completo: escanear QR → llamar al mozo → atender desde admin.

---

## 7. Plan de ejecución — Fase 2 (features nuevas con back)

Solo bullet points alto-nivel. Cada uno es su propio sprint.

1. **Modelos + migrations**: `Category`, `MenuItem`, `TableSession`, `Order`, `OrderItem`, `Payment`, `Review`, `ReviewTag`, `Customer`, `Visit`. Agregar campos a `Branch` (bank info, googleMapsUrl) y `Company` (wppTemplate, visitsForVoucher, googleMapsUrl).
2. **Endpoints públicos**: `GET /api/menu/:companyId`, `POST /api/sessions/:tableId`, `POST /api/orders`, `POST /api/payments`, `POST /api/reviews`, `POST /api/customers/register-visit`, `POST /api/customers/redeem-voucher`.
3. **Endpoints admin**: CRUD menú, dashboard agregador, validación de transferencias, broadcast WPP.
4. **Integración Mercado Pago**: preference creation + webhook de confirmación.
5. **Pantallas cliente**: MenuPage, CartPage, ConfirmadoPage, PagarPage, TransferenciaPage, PosnetPage, EfectivoPage, ValidandoTransferenciaPage, ModoPagoLitePage, PostPagoPage.
6. **Pantalla cajero**: CajeroLayout completo (5 tabs).
7. **Extensiones de admin existente**: tabs nuevas en `/admin/:companyId/config` (quick actions, métodos de pago, mensajes Club, config Club). Tab nueva en `/admin/:companyId/:branchId/config` (config bancaria).

**Orden sugerido dentro de F2**:
1. Menú + Pedido + Confirmado (es el flujo nuevo más obvio).
2. Pago Mercado Pago (la versión Lite primero — pagar sin haber pedido, no requiere `Order`).
3. Pago Transferencia + flujo validación cajero.
4. Pago Tarjeta + Efectivo.
5. PostPago (rating + tags).
6. Club VIP (en cliente + en cajero).
7. Cajero dashboard completo.

---

## 8. Deudas técnicas a resolver antes de empezar

Detectadas durante la auditoría de HeyMozo destino (sesión previa). **Resolver en Sprint 1 de F1.**

1. **Bug latente en `src/routes/index.js` ~línea 199**: referencia a `EventType` sin import. Solo los modelos `Company, Branch, Table, Event, Permission` están importados al tope del archivo. Si esa rama de código se ejecuta, runtime error. Agregar `EventType` al import.

2. **Ruta duplicada `release-all-tables`**: existe tanto en `server.js` como en `src/routes/index.js`. Decidir cuál es la fuente de verdad y borrar la otra.

3. **`CLAUDE.md` desactualizado**: el archivo describe el sistema legacy (CALL_WAITER etc. como core) pero omite toda la arquitectura `EventType` + `EventConfiguration` + sistema de permisos jerárquico + polling/sonido. Reescribir antes de empezar F1, así los próximos prompts tienen el contexto correcto. *(El usuario ya dio luz verde a esto en la conversación previa.)*

4. **`.claude/worktrees/`** untracked en git status — verificar si va a `.gitignore`. Sin urgencia.

5. **`src/components/AdminHeader.css` tiene cambios uncommitted en la rama `feature/payment-method-selector`**: decidir si esos cambios se trasladan a `feature/ui-redesign` (probablemente sí — son cambios visuales) o se descartan. Revisar el diff antes de empezar.

---

## 9. Riesgos y decisiones abiertas

| # | Decisión / riesgo | Cuándo resolver | Notas |
|---|---|---|---|
| 1 | ¿Adoptar Tailwind 4 o quedarse con CSS plano? | Antes de Sprint 1 | Si no se adopta Tailwind, hay que portar todas las clases `text-xl flex gap-3` etc. a clases CSS propias o estilos inline. Más trabajo de transcripción inicial pero menos cambios en la toolchain. |
| 2 | ¿`<Button>` reutilizable o inline (como el mockup)? | Antes de Sprint 2 | El mockup tiene memoria explícita: "no botones reutilizables, cada CTA es contextual". Mantener ese principio o consolidar. **Recomendación**: empezar inline, ver si emerge un pattern claro, consolidar al final si conviene. |
| 3 | ¿Cargar `Inter` o quedarse con stack del sistema? | Sprint 1 | El stack del sistema es 0kb y rinde bien. `Inter` da más identidad pero pesa. Recomendado: stack del sistema para F1, decidir en F2. |
| 4 | ¿Mantener `localStorage` para historial de sesión del cliente o moverlo al back? | F1 | Hoy `HistoryModal` lee de localStorage. El mockup también es local. Mantener local en F1 — barato y funciona. |
| 5 | ¿El campo `cardVariant` en `EventType` se agrega como migration o se hardcodea el mapping en front? | Sprint 3 | Si hardcoded, el admin no puede personalizar. Si migration, hay un cambio de schema en F1. Recomendado: hardcoded en F1 (con el mapeo en una constante en `AdminScreen.js`), migration en F2 cuando ya haya más config del cajero. |
| 6 | El mockup hardcodea `MESA 6`. Al portar, todos esos refs se vuelven dinámicos por `tableId` real. | Sprint 2 | Riesgo: regresiones por copy/paste de strings hardcoded. Buscar con grep `MESA 6` después de portar cada pantalla. |
| 7 | Material Symbols vs SVG inline | Sprint 1 | El mockup mezcla ambos. Mantener mezcla está OK. Solo asegurarse de cargar la fuente. |
| 8 | Cross-tab sync: el mockup lo usa para el demo (cliente y mozo en mismo browser). En HeyMozo destino esto **NO aplica** porque cliente y admin son ventanas distintas con servidor real en el medio. **No portar** la lógica de `storage` events / custom events del mockup. | siempre | El polling 6s actual del admin reemplaza esto. |

---

## 10. Métricas de éxito de la migración

Cómo sabemos que F1 está listo para mergearse a master:

- [ ] Cliente puede escanear QR, ver la nueva landing (3 botones grandes), tocar "Llamar al Mozo", elegir un quick action y el evento aparece en la vista admin en <8s.
- [ ] Admin ve mesas como cards de color con badge de conteo, puede tocar una card y procesar eventos en queue.
- [ ] El sonido de notificación sigue funcionando cuando llega un evento nuevo.
- [ ] El polling de 6s sigue activo (no regresión).
- [ ] No hay errores en consola en Safari mobile + Chrome desktop.
- [ ] Los flujos existentes (mark-seen, mark-available, mark-occupied, release-all-tables) siguen funcionando.
- [ ] Los QR generados (PDF) siguen funcionando.
- [ ] La auth con magic link sigue funcionando (mockup no la toca pero hay que confirmar que el rediseño visual no rompe el ProtectedRoute).
- [ ] Todos los tests existentes pasan.

---

**Fin del documento.** Ver [MOCKUP_HANDOFF.md](MOCKUP_HANDOFF.md) para el detalle del mockup y `CLAUDE.md` (a actualizar) para el detalle de HeyMozo destino.
