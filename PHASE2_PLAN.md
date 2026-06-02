# PHASE2_PLAN.md

Plan de Fase 2 de HeyMozo. Paralelo a [UI_MIGRATION.md](UI_MIGRATION.md), que cubrió Fase 1 (rediseño visual ya mergeado a master en PR #1).

---

## TL;DR

- **MVP-B en 8 sprints** (~8 semanas). Modalidad B (con mozo) primero porque el venue piloto es B.
- **Modalidad A** (autoservicio con pago al pedir) sale **post-MVP** en Sprint 9 — A es subconjunto operativo de B, sale rápido.
- **Stack actual se conserva** — Express + Sequelize + CRA + CSS plano + magic-link auth. NO migrar a Fastify/Prisma/Vite/Tailwind.
- **Roles introducidos en Sprint 1**: `waiter` / `cashier` / `owner` / `platformAdmin`.
- **Branch por feature**, PRs chicos (1–3 días), master siempre deployable.
- **Reorganización de rutas** (`/admin/...` → `/piso`, `/caja`, `/config`; `/user/...` → `/m/...`) con redirects 301 permanentes 90 días.

---

## Producto: dos modalidades

El dueño del local elige una de las dos al crear la sucursal en el wizard de admin. NO hay toggle self-service post-onboarding en MVP — cambios los gestiona HeyMozo backoffice manual.

### Modalidad A — Autoservicio (post-MVP, Sprint 9)

Para cervecerías de barra, hamburgueserías, food courts, locales con beepers.

Cliente escanea QR → ve menú → arma carrito → paga con Mercado Pago → pedido va directo a cocina con pago confirmado → recibe número y aviso cuando está listo.

**Sin mecanismos de seguridad adicionales**: sin pago no hay pedido. El atacante remoto tendría que pagar con su propia tarjeta.

### Modalidad B — Servicio con mozo (MVP)

Para bares con servicio, restaurants, cafeterías tradicionales.

Permite ordenar sin pagar al instante. Usa sistema de **líder de mesa** + **aprobación entre dispositivos** + capas técnicas:

- Cookies HttpOnly + Secure + SameSite=Strict (la cookie es source of truth de la sesión, NO la URL del QR).
- Device fingerprinting con ThumbmarkJS.
- Hard limits configurables per-branch (monto/sesión, items/pedido, velocidad).
- Auto-close por inactividad (>30min sin heartbeat) y tope absoluto (4–6h).
- Heartbeat invisible cada 30–60s mientras la pestaña esté abierta.

Sin gate del mozo en el primer pedido — pedidos van directo a cocina, mozo ve **trust dot informativo** (verde / amarillo / rojo) en la AlertCard.

---

## Decisión sobre stack: NO migrar

Se evaluó migrar a Fastify + TypeScript + Prisma + Vite + Tailwind + shadcn/ui (recomendación de un análisis externo). Decisión: **quedarse con stack actual**.

**Por qué**:
- Las features de Fase 2 (TableSession, líder, fingerprinting, hard limits, SSE) se implementan igual de bien en Express + Sequelize.
- Performance no es un problema hoy (polling 6s es liviano hasta ~20-30 venues).
- El cliente del restaurante no nota la diferencia de stack.
- Migrar = tirar el redesign que se hizo en CSS plano sobre CRA durante Fase 1.
- Quien escribió el doc del stack nuevo no sabía que ya había código en producción — es un stack greenfield perfecto, no una recomendación contextual.

**TypeScript** se puede sumar incrementalmente en archivos `.ts` nuevos cuando aporte valor (preferentemente para nueva lógica de seguridad / sesiones). NO requiere rewrite.

**SSE vs polling**: el polling 6s actual queda hasta post-F2. Si el primer venue piloto pasa de ~30 simultáneos, migramos a Server-Sent Events sin tocar el resto del sistema.

---

## Roles (4 niveles, sin granularidad mayor en MVP)

| Rol | Pantallas | Responsabilidades |
|---|---|---|
| `waiter` | OpShell (`/piso/:branchId`) | Atiende mesas, ve alertas, marca como vistas |
| `cashier` | CajaShell (`/caja/:branchId/...`) | Pagos, reseñas, club VIP, monitoreo en vivo |
| `owner` | CajaShell + AdminShell (`/config/...`) | Todo lo del cajero **+** config de empresa, sucursal, modalidad, hard limits. **NO** opera en piso (si el dueño quiere atender, segunda cuenta con rol waiter). |
| `platformAdmin` | Todo | Superadmin de plataforma (uso interno HeyMozo, equivalente al `isAdmin: true` actual) |

**Migración de users existentes**: todos los users actuales con `isAdmin: true` quedan como `platformAdmin`. Los demás como `owner` (asunción razonable: hoy todos los users del cliente son dueños). Si el cliente piloto tiene mozos/cajeros, los crea con rol específico.

---

## Sobre el "panel de monitoreo del dueño"

El doc de seguridad del stack hablaba de un "panel de monitoreo del dueño" como pantalla separada. **No lo hacemos como pantalla aparte** — se fusiona con la CajaShell (cajero). Razón: el cajero ya ve métricas del día (Pulso) + alertas operativas, sumarle una sub-tab de seguridad (dispositivos bloqueados, intentos de fraude, logs) tiene cero costo cognitivo extra. Owner ve la misma CajaShell + adicional acceso a AdminShell para configuración.

---

## Decisiones cerradas (NO re-discutir)

### Identificación cliente

- **Sin auth de cliente.** Sesión por cookie HttpOnly + fingerprint.
- **Emoji auto-asignado** al crear Device (sin friction). Nombre 100% opcional sin incentivo.
- Cliente con QR viejo se redirige a su sesión actual (cookie es source of truth, no la URL).
- Teléfono / email solo en Club VIP (capturado en PostPagoPage).

### Validación primer pedido

- **SIN gate del mozo.** Pedidos van directo a cocina.
- Mozo ve **trust dot informativo** (verde / amarillo / rojo) en AlertCard.
- Único gate técnico: **hard limits configurables per-branch** (pedido > $X, items > N, velocidad).

### Transferencia mesa-a-mesa

- Mozo aprueba siempre, EXCEPTO cuando cliente escanea mesa nueva y elige "mover acá" (auto, sin pedidos previos).
- Mozo puede iniciar transferencia desde su panel cuando cliente avisa verbalmente.
- **Sin split parcial en MVP.**

### "Soy otra persona" (mesa caliente con sesión vieja)

Distinguir zombi (>30min sin heartbeat, pagos completos) vs realmente caliente:
- **Zombi** se auto-reactiva sin modal.
- **Realmente caliente** abre modal al mozo con 4 opciones pre-seleccionadas según señales: pagó en mano / se mudó / se fue sin pagar / cancelar.

### Aprobación entre amigos

- Aprobación transitiva: cualquier device habilitado aprueba al siguiente.
- Mozo escala solo cuando 60–90s sin respuesta (fallback) o cuando override manual desde panel.

### Otras decisiones

- **Sectores y asignación mozo↔mesa**: posponer hasta primer venue con 3+ mozos. MVP: todos los mozos ven todas las mesas.
- **Notif cliente Modalidad A** (pedido listo): pantalla con número grande + web push opcional. WhatsApp post-MVP solo si un venue lo pide explícito.
- **WhatsApp masivo Club VIP**: client-side `wa.me/...` desde panel del cajero en MVP. Server-side con WhatsApp Business API queda como paid feature post-F2.
- **Club VIP**: captura teléfono o email configurable per-company en `/config/:c/club`. Default teléfono.
- **Toggle de modalidad post-onboarding**: descartado para MVP.

---

## Plan de sprints

> **Reordenamiento 2026-05-18**: Sprint 4 cambió de "Pagos manuales B" a "Mozo agrega items". Razón: muchas mesas piden oral, no por la app — sin la capacidad de mozo de meter items al sistema, cualquier feature de split o cobro digital arranca sobre datos incompletos. Pagos digitales (antes Sprint 4-5) se unifican en Sprint 5 y se diseñan recién después de Sprint 4. Split por ítem (NUEVO) entra como Sprint 7 — depende de pagos digitales reales para tener valor. Sprints de QA/deploy y Modalidad A se corren a 8 y 9. MVP-B ahora son 8 sprints en vez de 7.

| # | Nombre | Status | Scope resumido |
|---|---|---|---|
| 1 | Foundation | ✅ | Roles + middleware + reorganización rutas + shells vacías + URL `/m/` + modelos `TableSession` + `Device` |
| 2 | Menú + onboarding | ✅ | Wizard crear sucursal (modo B) + modelos `Category`/`MenuItem` + vista admin menú + vista cliente menú |
| 3 | Pedido + identificación | ✅ | `Order`/`OrderItem` + carrito + ConfirmadoPage + AlertCard `new_order` + polling cliente + pantalla "PEDIDO LISTO" + emoji auto. Aprobación transitiva postergada a Sprint 6. |
| 4 | Mozo agrega items | ✅ | `POST /api/orders/staff` + `staffAddOrder` service + `AddOrderModal` en OpShell (mesa selector + menú agrupado por categorías con search + tabs + steppers qty) + `Order.createdByUserId` para auditoría. Event "Nuevo Pedido" queda **unseen** (el mozo de piso debe ver la card aunque la haya cargado otro staff). Reusa Order/OrderItem/MenuItem. **Prerequisito de split de cuenta** (sin esto los items orales no están en sistema). |
| 5 | Pagos digitales + Reviews + Club VIP | ✅ | **5 canales** (MP nativo / Transferencia / MODO Nivel 1 deeplink / Tarjeta posnet / Efectivo) + propinas **nunca a cuenta del dueño** (flag `Branch.mpMarketplaceEnabled`, trámite Marketplace MP en paralelo) + Split por monto + PostPagoPage (stars 1-5, tags negativos condicionales si stars≤3, Google Maps link siempre, sección "Propina pendiente" si MP sin Marketplace) + **Club VIP completo** (modelos + captura en PostPago + tab CajaShell + voucher con entrega "próxima visita" + WhatsApp manual + canje por mozo en OpShell + loyalty acceleration configurable). **Club VIP movido del cubo v1.5 al MVP por decisión user 2026-05-24.** 10 sub-PRs (5.2 a 5.11). Diseño cerrado 2026-05-24. Bloqueante para Sprint 7 (split) y Sprint 8.3 (tab Pagos). |
| 6 | Trust + hard limits + transferencias mesa | 📝 | Trust dot + hard limits enforcement + transferencia cliente-iniciada + mozo-iniciada + "soy otra persona" con clasificación zombi + aprobación transitiva |
| 7 | Split por item + modos de pago | 📝 | `OrderItemClaim { orderItemId, deviceId, qty }` + coordinación real-time entre devices + reglas items huérfanos + `TableSession.paymentMode` ENUM. Depende de Sprint 5 (pagos digitales reales). |
| 8 | Gestión de users + Pulso + QA + deploy | 📝 | UI de gestión de users (crear/editar/asignar permisos, invitación por magic link reusando infra de Sprint 1.1) + Tab Pulso básica + Tab Pagos + bug bash + deploy venue piloto. **8.1 es bloqueante para deploy**: sin UI no se pueden crear mozos/cajeros en el venue piloto. |
| 9 | (post-MVP) Sumar Modalidad A | 📝 | Habilitar `autoservicio` en wizard + PagarPage A simplificada (solo MP) + skipear flow de validación de mesa caliente + QA en venue A |

Status: 📝 planeado · 🚧 en curso · ✅ mergeado

> **Estado live de los sub-PRs** (qué está en review / mergeado): ver [PHASE2_STATUS.md](PHASE2_STATUS.md).

### Sprint 1 — desglose en sub-PRs

Sprint 1 es el más grande. Lo partimos en 4 PRs aislables, cada uno mergeable solo:

1. **1.1 Roles + middleware** — `User.role` ENUM, middleware `requireRole()`, defaults para users existentes (owner / platformAdmin). 0 cambios visibles en UI.
2. **1.2 Modelos `TableSession` + `Device`** — migration + modelos Sequelize + asociaciones. 0 cambios visibles en UI.
3. **1.3 Shells (`OpShell`, `CajaShell`, `AdminShell`)** — layouts vacíos con sidebar/topnav, ruteados desde `/piso`, `/caja`, `/config`. Pantallas viejas siguen funcionando con redirects 301 desde `/admin/...`.
4. **1.4 URL cliente `/m/:c/:b/:t`** — nueva ruta + redirect 301 desde `/user/:c/:b/:t`.

### Sprint 2 — desglose en sub-PRs

Sprint 2 introduce el **menú interno** (Category + MenuItem) a nivel sucursal y el **wizard de creación de sucursal**. 5 sub-PRs independientes (todas desde master).

#### Modelos nuevos

**`Category`** (paranoid)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK autoIncrement | |
| `branchId` | INTEGER FK NOT NULL | → Branch. Menú vive a nivel sucursal (no Company). |
| `name` | STRING NOT NULL | "Entradas", "Bebidas", etc. |
| `displayOrder` | INTEGER DEFAULT 0 | Para drag-drop ordering. |
| `isActive` | BOOLEAN DEFAULT true | Ocultar sin borrar. |

**`MenuItem`** (paranoid)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | INTEGER PK autoIncrement | |
| `categoryId` | INTEGER FK NOT NULL | → Category |
| `name` | STRING NOT NULL | (mockup usa `title` — renombramos a `name` por consistencia con `Branch.name`, `EventType.eventName`). |
| `description` | TEXT nullable | |
| `priceCents` | INTEGER NOT NULL | Centavos, NO decimal. |
| `imageUrl` | STRING nullable | URL externa (mismo patrón que `Branch.logo`). Sin upload propio en MVP. |
| `isAvailable` | BOOLEAN DEFAULT true | Toggle "agotado" manual. ÚNICO campo de stock en MVP. |
| `displayOrder` | INTEGER DEFAULT 0 | |
| `metaProductId` | STRING nullable | Para Meta Commerce sync (Fase 3 delivery). NULL hasta entonces. NO exponer en UI admin MVP. |
| `stock` | INTEGER nullable | Tracking numérico. NULL hasta Fase 3 delivery. NO exponer en UI admin MVP (mismo patrón que `metaProductId` — agregar columna ahora evita migration futura sobre tabla con datos reales). |

**`Branch` (alter)**

- `+ modality` ENUM(`'mozo'`, `'autoservicio'`) NOT NULL DEFAULT `'mozo'`
- `menu` (STRING link externo viejo) **se mantiene** como fallback cuando la sucursal aún no cargó menú interno.

#### Asociaciones (en `src/models/index.js`)

```js
Branch.hasMany(Category, { as: 'categories', foreignKey: 'branchId' });
Category.belongsTo(Branch, { as: 'branch', foreignKey: 'branchId' });
Category.hasMany(MenuItem, { as: 'items', foreignKey: 'categoryId' });
MenuItem.belongsTo(Category, { as: 'category', foreignKey: 'categoryId' });
```

Aliases en lowercase (`'categories'`, `'items'`, `'branch'`, `'category'`) — gotcha del codebase: alias case-sensitive, mismatch devuelve arrays vacíos sin error (ver [CLAUDE.md](CLAUDE.md) gotchas #2).

#### Sub-PRs

| # | Branch | Scope | Depende de |
|---|---|---|---|
| **2.1** | `feature/phase2-menu-models` | Migration crea `Categories` + `MenuItems` + ADD COLUMN `Branches.modality`. Modelos Sequelize. Asociaciones. Cero UI, cero endpoints. | — |
| **2.2** | `feature/phase2-menu-endpoints` | Rutas en `src/routes/index.js`: CRUD `/api/branches/:bid/categories`, CRUD `/api/categories/:cid/items`, endpoints reorder. Permisos vía `checkBranchPermission`. | 2.1 |
| **2.3** | `feature/phase2-menu-admin` | Vista admin `/config/:c/:b/menu` dentro de AdminShell. CRUD cat + ítems, drag-drop reorder, toggle `isAvailable`. NO mostrar `stock` ni `metaProductId`. | 2.2 |
| **2.4** | `feature/phase2-branch-wizard` | `BranchCreate.js` wizard 3 pasos: (1) datos básicos + logo, (2) modalidad (B preseleccionada y única — A bloqueada con tooltip "Disponible próximamente"), (3) cantidad+nombres de mesas iniciales. | — (paralelizable con 2.2/2.3) |
| **2.5** | `feature/phase2-menu-client` | Vista cliente `/m/:c/:b/:t/menu` (port de `MenuPage` del mockup, ver [MOCKUP_HANDOFF.md §menuPage](MOCKUP_HANDOFF.md)). En `UserScreen`: si branch tiene categorías cargadas → abre menú interno; sino → fallback al link `Branch.menu` actual (sin breaking change). | 2.2 |

#### Decisiones explícitas

- **Nivel del menú**: Branch (no Company, no override).
- **`name` no `title`**: consistencia con resto del schema.
- **`paranoid: true`** en Category y MenuItem.
- **Dual fallback en cliente**: menú interno si está cargado, sino link externo viejo.
- **Wizard pasos**: 3 (datos / modalidad / mesas). Modalidad A bloqueada.
- **`stock` y `metaProductId`** en DB ahora pero ocultos en UI MVP. Patrón "sumar columnas nullables anticipadamente para evitar migrations futuras sobre tabla con datos reales".

#### Lo que NO entra en Sprint 2 (capturado pero pospuesto)

- **Carga de menú asistida por IA** (PDF/Excel/URL via Claude Vision) — ver [ROADMAP.md](ROADMAP.md). Se diseñó pensando en Sprint 2 pero NO entra al MVP.
- **Promos en menú** — ver [ROADMAP.md](ROADMAP.md). Candidata a Sprint 2.6 o v1.5.
- **Upload propio de imágenes** — sigue siendo URL externa. S3/Cloudinary post-MVP.
- **Stock numérico funcional** — columna existe, lógica de decremento entra en Fase 3 delivery.

### Sprint 5 — desglose en sub-PRs

Sprint 5 cubre **pagos digitales (5 canales), reviews con tags y Google Maps, y Club VIP completo**. El user pidió "no importa el tiempo, importa que quede mejor posible y más funcional" → se diseñó sin recortar scope. Club VIP completo se movió del cubo v1.5 al MVP.

#### Decisiones cerradas (NO re-discutir)

**Canales y propinas:**
- 5 canales habilitados: MP nativo, Transferencia, MODO (Nivel 1 = deeplink + analytics, sin Business API), Tarjeta posnet, Efectivo.
- Propina default 10%. Excluida en transferencia/MODO (matchea decisión fiscal habitual del venue). Incluida en cash/posnet. **Excluida en MP hasta que Marketplace MP esté aprobado.**
- **Propinas NUNCA pasan por la cuenta del dueño** (requisito no negociable del user — MP cobraría fee extra sobre el monto de propina). Cash/posnet: mozo cobra off-system. MP pre-Marketplace: PostPagoPage muestra selector "Propina pendiente" (cash al mozo / transfer a alias del mozo). MP post-Marketplace: split automático al MP del mozo.
- Tracking en DB: `Payment.tipCents` + `Payment.collectedByUserId`. Suficiente para ranking de propinas por mozo (UI en Sprint 8).

**Marketplace MP:**
- Flag `Branch.mpMarketplaceEnabled` (default false). Mientras false: MP cobra solo consumo.
- Trámite de registro Marketplace en MP devs arranca en paralelo a 5.2. Plazo 1-2 sem, no bloquea.
- Sub-PR posterior al sprint activa split payment cuando llegue aprobación.

**Setup MP:**
- OAuth únicamente para el venue (sin paste manual). Registro app HeyMozo en MP devs es gratis e instantáneo.
- OAuth del mozo (futuro post-Marketplace) desde auto-perfil del mozo, no centralizado por el dueño.

**Split:**
- Split por monto (foto 2 del mockup: "El total completo" / "Solo mi parte $X") entra en Sprint 5.
- Split por ítem (claims, coordinación real-time entre devices) sigue en Sprint 7.

**PostPagoPage:**
- Stars 1-5 obligatorio.
- Si stars ≤ 3: grilla de tags negativos multi-select + textarea comment opcional + submit rojo.
- Si stars ≥ 4: solo botón submit amarillo. Cero tags. Cero comment.
- Post-submit: link "Dejá tu valoración en Google Maps" **siempre visible** (razón user: Google no permite filtrar reviews por nota, no podemos manipular). Tracking `Review.derivedToGoogle`.
- Card Club VIP siempre visible (independiente del rating).

**ReviewTag:**
- Solo negativos. 8 tags seed con emoji al crear branch: 🥶 Comida fría, ⏳ Demora en la atención, 🍳 Demora en la cocina, 😠 Mala atención del mozo, ❌ Pedido equivocado, 💰 Precios altos, 🧹 Lugar sucio, 🔊 Ambiente ruidoso.
- Columna `category` ENUM('general','food','drink','service','ambience') default 'general'. UI MVP solo muestra 'general'. Puerta abierta a separar por categoría en v1.5+ sin migration.

**Cajero — tab Acciones:**
- Renombre de "Pagos pendientes" → "Acciones" (matchea MOCKUP_HANDOFF línea 196).
- 4 tipos de cards en mismo feed: Transferencia con "Validar/Rechazar" (borde amarillo), MP/Tarjeta/Efectivo con solo "Entendido" (borde verde, acuse informativo).

**Cliente — pantalla espera transferencia:**
- Polling cada 5s a `GET /api/payments/:id/status`. Sin timeout automático. Botón "Cancelar pago" siempre visible.

**Validación + comprobante:**
- Comprobante de transferencia opcional. Cajero valida desde su app bancaria; si el cliente subió comprobante es ayuda extra.

**Liberación mesa:**
- **Auto-liberación**: cuando `sum(Payments paid.subtotalCents) >= sum(Orders.totalCents)`. Propina no cuenta para balance. Caso feliz, sin acción staff.
- **Liberación manual individual** (entra en 5.8): endpoint + botón "Liberar mesa" en CajaShell/OpShell con `releaseReason` text opcional. Para casos edge donde balance > 0 (cobro off-system, comp del dueño, walkout). Permiso: cashier/owner; waiter también desde OpShell.
- **Liberar todas las mesas** botón legacy ya existe en AdminScreen (`releaseAllTables(branchId)`) — sigue funcionando, no se toca.
- **Casos edge complejos van en Sprint 6** (no Sprint 5): clasificación zombi vs caliente, modal "Soy otra persona" con 4 opciones, transferencias mesa-a-mesa, auto-close por inactividad >30min, tope absoluto 4-6h.

**Config:**
- Per-branch (cada sucursal tiene MP token, alias, toggles).
- `Branch.paymentMethodPriority` (JSON array) controla jerarquía visual de botones — configurable per-branch.

**Review waiterId:**
- Híbrido D: auto-sugiere el mozo más activo de la sesión (más Orders), cliente puede cambiar a otro staff que tocó la mesa. Si solo hay un mozo, sin selector.

**Refunds:**
- NO en MVP. Status `refunded` existe en ENUM pero sin UI. Errores se resuelven off-system.

#### Club VIP completo (movido v1.5 → MVP)

- Modelos: `ClubMember` (phone, visits, lastVisitAt), `ClubVisit` (snapshot por sesión), `Voucher` (code único, reward snapshot, redeemedAt, redeemedByUserId).
- Captura en PostPagoPage: card siempre visible con input WhatsApp + contador "X de Y visitas".
- Config branch: `clubReward` (text), `clubGoal` (int default 5), `clubAccelerationAtVisit` (int nullable), `clubAccelerationMultiplier` (int default 2).
- **Loyalty acceleration** (psicología endowed progress): en la visita N == `clubAccelerationAtVisit`, sumamos `clubAccelerationMultiplier` en lugar de 1. Configurable per-branch.
- Entrega voucher: **dos métodos combinados** — (a) próxima visita: HeyMozo detecta voucher pendiente al escanear QR y lo muestra en UserScreen, (b) WhatsApp manual desde tab Club: batch de links `wa.me/...` con mensaje pre-armado.
- Validación voucher: **mozo desde OpShell** (botón "Canjear voucher" → input/scanner código → marca redeemed + reset visits a 0).
- Tab Club en CajaShell: lista members con filtros (días sin volver, voucher alcanzado, búsqueda phone), botón WhatsApp masivo client-side.
- **Lo único que sigue post-MVP**: WhatsApp Business API server-side (paid feature post-F2). MVP usa `wa.me` client-side.

#### Sub-PRs

| # | Branch | Scope | Depende |
|---|---|---|---|
| **5.1** | `feature/sprint-5.1-customer-order-history` | (mergeado en PR #28) CartSheet bottom sheet + historial sesión + `SessionOrdersList`. | — |
| **5.2** | `feature/phase2-payment-models` | Migrations + modelos Payment/Review/ReviewTag/ClubMember/ClubVisit/Voucher + asociaciones. Branch fields (mpMarketplaceEnabled, mpAccessToken/Refresh, transferAlias/Cbu/Titular/Cuit, googleMapsReviewUrl, paymentMethodPriority/Enabled, clubReward/Goal/Acceleration). User fields (mpAlias, mpAccessToken/Refresh). Seed 8 ReviewTags negativos al crear branch. Sin endpoints, sin UI. | — |
| **5.3** | `feature/phase2-payment-config-ui` | UI `/config/:c/:b/payments` (OAuth MP, alias transfer, toggles paymentMethodsEnabled, paymentMethodPriority, googleMapsReviewUrl, clubReward/Goal/Acceleration). UI `/profile` mozo (mpAlias). Endpoint OAuth callback MP. | 5.2 |
| **5.4** | `feature/phase2-payment-cash-card` | Endpoints + flow efectivo/tarjeta: Event `payment_request_cash`/`_card`, AlertCard mozo en OpShell, UI mozo "Cobré $X" → Payment paid. Opcional cash: cliente declara monto para vuelto. | 5.2 |
| **5.5** | `feature/phase2-payment-transfer-modo` | Endpoints + flow transfer/MODO: alias copiable, deeplink `modo://` con fallback, comprobante opcional, pantalla espera cliente con polling 5s. UI cajero validar va en 5.8. | 5.2 |
| **5.6** | `feature/phase2-payment-mp-native` | Endpoints + flow MP nativo: Checkout Pro o Payment Brick (decisión de UX al implementar), solo consumo cuando `mpMarketplaceEnabled=false`, webhook `POST /api/payments/mp/webhook` con verificación firma HMAC. | 5.2 |
| **5.7** | `feature/phase2-payment-split-monto` | Bottom sheet "¿Cuánto vas a pagar?" (foto 2 mockup). Cliente declara monto → Payment parcial → balance se actualiza. Mesa sigue activa hasta balance=0. | 5.4 + 5.5 + 5.6 |
| **5.8** | `feature/phase2-cajashell-acciones` | Tab "Acciones" en CajaShell con 4 tipos de cards. Push al cliente cuando cajero valida/rechaza transferencia. **+ Endpoint + botón "Liberar mesa" individual con `releaseReason` text opcional** (casos edge balance > 0). Refinamientos zombi/caliente quedan para Sprint 6. | 5.4 + 5.5 + 5.6 |
| **5.9** | `feature/phase2-postpago-review` | PostPagoPage: stars + tags negativos condicionales (stars≤3) + comment opcional + submit + Google Maps link siempre + card Club VIP (input WhatsApp). Sección "Propina pendiente" si MP sin Marketplace. | 5.4 + 5.5 + 5.6 |
| **5.10** | `feature/phase2-club-cajashell` | Tab Club en CajaShell: lista members con filtros (días sin volver, voucher alcanzado, búsqueda phone), botón WhatsApp masivo client-side (`wa.me/...`). | 5.9 |
| **5.11** | `feature/phase2-club-voucher` | Generación automática Voucher al alcanzar goal. Entrega "próxima visita" (detección + UI UserScreen). Entrega WhatsApp manual desde tab Club. Botón "Canjear voucher" en OpShell mozo + endpoint validar + reset visits. | 5.10 |

#### Lo que NO entra en Sprint 5 (capturado pero pospuesto)

- **Split por ítem** (claims, coordinación real-time entre devices) → Sprint 7.
- **MP Marketplace API activación** (split payment automático) → sub-PR posterior post-aprobación (trámite 1-2 sem en paralelo).
- **MODO Nivel 2** (Business API con webhook) → post-MVP cuando se valide demanda.
- **Tab Reseñas en CajaShell** (UI ranking mozos + feed reviews + edición ReviewTags) → Sprint 8 (nueva sub-PR a agregar al plan cuando se llegue).
- **WhatsApp Business API server-side** (envío automatizado) → paid feature post-F2.
- **Refunds UI** → v1.5.

### Sprint 8 — desglose en sub-PRs

Sprint 8 es el cierre del MVP-B: agrega la última pieza que falta para operar (gestión de users), QA + métricas, y deploy al venue piloto. Se ordena por dependencias: **8.1 va primero porque sin él no se puede hacer QA con roles reales ni deployar**.

| # | Branch | Scope | Depende de |
|---|---|---|---|
| **8.1** | `feature/phase2-user-management` | UI `/config/:companyId/users`: lista users con email + role + sucursales accesibles. Modal/form crear user (email + role + permisos branch). Editar role + permisos. Soft-delete. Al crear, dispara magic-link de bienvenida vía `/api/auth/login-request` (reusa Sprint 1.1). Permiso: solo `owner` (su company) y `platformAdmin`. **Backend ya tiene todos los endpoints (`/api/users/*`); este sub-PR es 100% frontend + cableado.** | — |
| **8.2** | `feature/phase2-pulso-tab` | Tab Pulso básica en CajaShell: KPIs del día (mesas activas, pedidos del turno, ticket promedio, conversión). Datos derivados de queries existentes — sin modelos nuevos. | — |
| **8.3** | `feature/phase2-pagos-tab` | Tab Pagos en CajaShell: lista de Payments con filtros, totales del día. Depende de Sprint 5 mergeado. | Sprint 5 |
| **8.4** | `feature/phase2-bug-bash` | Fixes de bugs encontrados durante QA. Branch viva, varios commits. | 8.1, 8.2, 8.3 |
| **8.5** | (deploy) | Deploy al venue piloto + onboarding del cliente. No es PR de código sino release activity. | Todo lo anterior |

#### Decisiones explícitas (Sprint 8.1)

- **Sin self-signup**: solo `owner` (su company) y `platformAdmin` pueden crear users. Coherente con la decisión cerrada de "sin auth de cliente, sin friction".
- **Sin password**: la invitación dispara un magic-link al mail del nuevo user. El user clickea → `verify-token` → JWT → setea su sesión. Reusa exactamente la infra de Sprint 1.1.
- **Permisos vía UI**: el form de crear/editar deja elegir sucursales accesibles para roles `waiter` / `cashier`. Para `owner` se asume permiso a toda la company.
- **Edit role**: permitido para `owner` sobre sus users, EXCEPTO que un `owner` no puede degradarse a sí mismo (si quiere, otro owner o un platformAdmin lo hace). Para evitar lock-out.
- **Soft-delete**: usa el `paranoid` existente. User borrado pierde acceso (los tokens activos invalidan en próximo `authenticate` por mirar el `deletedAt`).
- **NO entra**: 2FA, password recovery (no hay password), audit log de cambios de permiso, bulk import. Todo eso es v1.5+.

#### Lo que NO entra en Sprint 8 (capturado pero pospuesto)

- **Tab Seguridad** (devices bloqueados, intentos de fraude) — v1.5.
- **Tab Reseñas completa** — v1.5.
- **Tab Club VIP** — v1.5.
- **Audit log de cambios admin** — v1.5.
- **Bulk import de menú o users** — v1.5.

---

## Convenciones de trabajo en equipo

### Branches

- `master` siempre deployable.
- Una branch por sub-PR: `feature/phase2-roles-middleware`, `feature/phase2-tablesession-device`, `feature/phase2-shells`, etc.
- Branches cortas (1–3 días). NO una branch monstruosa de 7 semanas.

### Plantilla de PR

```
## Resumen
1-2 líneas de qué hace el PR.

## Cambios
- Lista concreta de cambios (modelos, endpoints, componentes, etc).

## Cómo probar
1. Pasos numerados.
2. Idealmente: smoke test del happy path + 1 edge case.

## Riesgos / breaking changes
- Lista o "ninguno".

## Referencia
PHASE2_PLAN.md sección "Sprint X.Y"
```

- Code review obligatoria del otro dev antes de mergear.
- Si urgente: "approved + revisa después" pero queda registrado.

### Commits

Mantener convención existente:
- `feat(scope): ...`, `fix(scope): ...`, `chore(scope): ...`, `docs(scope): ...`
- Co-Authored-By cuando hay asistencia de IA.
- Atomic: un cambio = un commit.

### Migrations

- Siempre con `down()` reversible (incluso si es no-op explícito).
- Idempotentes: cada step valida estado antes de escribir. Las migrations de Fase 1 son referencia, especialmente [`20260514_cleanup_duplicate_event_types.js`](src/database/migrations/20260514_cleanup_duplicate_event_types.js) por el patrón de cleanup defensivo.
- Steps comentados con el `por qué`, no solo el `qué`.

### División del trabajo

A definir entre los 2 devs antes de Sprint 1:
- **Opción A — por capa**: uno backend (modelos, middleware, endpoints), otro frontend (shells, layouts, pantallas). Coordinación por contrato de API.
- **Opción B — por feature**: cada uno full-stack en sprints alternados.

A es mejor si los devs tienen skills muy distintos. B si los dos son full-stack y prefieren ownership end-to-end.

### Comunicación

- Slack/WhatsApp para avisos puntuales ("voy a tocar `User`, no toques en 2hs").
- Daily async corto: qué hice ayer, qué hago hoy, bloqueadores.
- Issues/Linear/Trello: ticket por sprint con checkboxes, PRs linkeados.

---

## Riesgos identificados

- **Polling 6s no escala >20-30 venues** — aceptable hasta esa escala. Migrar a SSE post-F2.
- **Web push tiene baja adopción en iOS** (requiere PWA instalada) — mitigar con número de pedido visible + sonido en pestaña abierta.
- **Reorganización de rutas rompe bookmarks viejos** — mitigar con redirects 301 permanentes 90 días.
- **Cookie como source of truth de sesión** — si el cliente borra cookies pierde sesión activa, pero esto es UX aceptable (es lo que el usuario espera).

---

## Lo que queda fuera del MVP (v1.5)

- **Modalidad A completa** (sale en Sprint 9 con PagarPage A simplificada solamente; UI/QA completos para A en v1.5).
- ~~**Club VIP UI completa**~~ — **movido al MVP en Sprint 5** (decisión user 2026-05-24).
- **Trust dot enforcement** (en MVP es solo informativo).
- **Auditoría completa** (logs estructurados sí, dashboard no).
- **Tab Seguridad** en CajaShell.
- **Reseñas tab completa**.
- **Sectores y asignación mozo↔mesa**.
- **EventConfigModal refactor** (sigue como está hoy).
- **Hard limits enforcement avanzado** (MVP: rechazo simple si supera).

---

## Referencias

- [PHASE2_STATUS.md](PHASE2_STATUS.md) — tracker live de sub-PRs (qué está en review / mergeado).
- [ROADMAP.md](ROADMAP.md) — features post-MVP (reservas con mapa, promos con IA, carga de menú con IA, delivery Fase 3 y 4).
- [UI_MIGRATION.md](UI_MIGRATION.md) — plan de Fase 1 (completado).
- [MOCKUP_HANDOFF.md](MOCKUP_HANDOFF.md) — fuente de verdad del mockup original.
- [CLAUDE.md](CLAUDE.md) — arquitectura del codebase y convenciones.
