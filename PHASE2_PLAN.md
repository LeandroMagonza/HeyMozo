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
| 3 | Pedido + identificación | 🚧 | `Order`/`OrderItem` + carrito + ConfirmadoPage + AlertCard `new_order` + polling cliente + pantalla "PEDIDO LISTO" + emoji auto. Aprobación transitiva postergada a Sprint 6. |
| 4 | Mozo agrega items | 📝 | `POST /api/orders/staff` + `AddOrderModal` en OpShell (menú agrupado por categorías + stepper qty). Event "Nuevo Pedido" auto-seen. Reusa Order/OrderItem/MenuItem sin migrations. **Prerequisito de split de cuenta** (sin esto los items orales no están en sistema). |
| 5 | Pagos digitales | 📝 | A diseñar: canal (MP nativo / transferencia con validación cajero / ambos) + `Payment` + PostPagoPage con rating + `Review`/`ReviewTag`. Decisión bloqueante para Sprint 7 (split). |
| 6 | Trust + hard limits + transferencias mesa | 📝 | Trust dot + hard limits enforcement + transferencia cliente-iniciada + mozo-iniciada + "soy otra persona" con clasificación zombi + aprobación transitiva |
| 7 | Split por item + modos de pago | 📝 | `OrderItemClaim { orderItemId, deviceId, qty }` + coordinación real-time entre devices + reglas items huérfanos + `TableSession.paymentMode` ENUM. Depende de Sprint 5 (pagos digitales reales). |
| 8 | Pulso + QA + deploy | 📝 | Tab Pulso básica + Tab Pagos + bug bash + deploy venue piloto |
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
- **Club VIP UI completa**.
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
