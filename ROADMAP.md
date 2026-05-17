# ROADMAP.md

Features de HeyMozo capturadas pero **fuera del MVP Core** (Sprints 1–7 de [PHASE2_PLAN.md](PHASE2_PLAN.md)). Cada sección tiene fase tentativa y por qué quedó afuera del primer release.

> Convención de nombres: lo que en [PHASE2_PLAN.md](PHASE2_PLAN.md) se llama "Fase 2" es el **MVP Core** (Sprints 1–7, dine-in). **Delivery** se llama Fase 3 y **channel manager / marketplaces** Fase 4.

---

## Carga de menú asistida por IA (candidata Sprint 2.6 o v1.5)

El dueño no carga el menú item por item. Tres fuentes de ingesta:

1. **PDF o foto del menú físico** — Claude Vision extrae categorías, nombres, descripciones y precios del menú impreso.
2. **Excel / CSV** — el dueño sube su planilla existente; la IA normaliza columnas heterogéneas al schema (`Category`, `MenuItem`).
3. **URL de menú online** — si el local ya tiene menú en web o en PedidosYa/Rappi, la IA scrapea y parsea.

**Flow obligatorio:** subir → IA parsea → preview editable por el dueño → confirmar. Nunca carga directa sin revisión humana (precios mal cargados son un problema real de negocio).

**Implementación técnica:**
- Claude API con `vision` para PDF/foto, texto para Excel/CSV.
- Response devuelve JSON estructurado con `Category[]` + `MenuItem[]`.
- Frontend muestra tabla editable con items detectados antes de guardar.
- Requiere proxy server-side (NO exponer API key al cliente).

**Why:** reducir fricción de onboarding. El mayor bloqueador para activar un venue nuevo es cargar el menú — si se hace en 2 minutos desde el menú impreso, el time-to-value cae drásticamente.

**Cuándo:** se diseñó pensando en Sprint 2 pero NO entra al MVP — el wizard de creación de sucursal (Sprint 2.4) acepta el primer venue con menú vacío o link externo, y la carga IA puede sumarse como sub-PR 2.6 o como mejora v1.5.

---

## Promos manuales en menú (candidata Sprint 2.6 o v1.5)

**Manual primero (entra como v1.5 o sub-PR 2.6):**

El dueño/cajero crea promos manualmente desde admin: nombre, descripción, descuento/beneficio, vigencia, condiciones. Las promos activas aparecen como categoría destacada al inicio del menú del cliente, con badge "PROMO" o countdown si tienen vigencia limitada.

**Modelo `Promo`** (esquema tentativo): `branchId`, `name`, `description`, `imageUrl`, `discountKind` (`percentage` | `fixed` | `freebie`), `discountValue`, `startsAt`, `endsAt`, `isActive`, `displayOrder`.

**Depende de:** módulo de menú (Sprint 2). Complejidad baja — es una categoría especial con renderizado diferente.

**Why:** valor real para el venue (mover items lentos, llenar franjas vacías) sin necesidad de IA todavía. Se prioriza tener algo funcional manual primero porque la IA necesita datos históricos para sugerir bien.

---

## Promos con IA generativa basada en estadísticas (post-MVP, cuando hay datos)

Con suficientes datos históricos (eventos, pedidos, horarios), un módulo de análisis detecta:

- Días y franjas horarias de baja concurrencia (mesas vacías, pocos eventos).
- Items del menú con baja rotación.
- Patrones de temporada.

La IA (Claude API) genera sugerencias de promo: "Los jueves entre 18 y 20h tienen 40% menos pedidos que el promedio. Podés ofrecer 2x1 en cervezas para esa franja."

El dueño aprueba / rechaza / edita la sugerencia antes de publicar.

**Why:** que la IA aporte valor real basado en datos, no genere promos vacías. Necesita al menos 30 días de datos de un venue real antes de tener algo útil que decir.

**Cuándo:** después de validar el MVP Core con ≥3 venues con datos reales.

---

## Reservas con mapa interactivo de mesas (v2)

Reserva con un selector visual estilo "compra de entradas de cine": cliente ve el layout del salón, mesas disponibles coloreadas por estado, reserva la suya.

**UX de configuración del layout (owner):**

- Drag & drop en un canvas con paleta de objetos (mesa redonda, rectangular, barra, etc.).
- El dueño define dimensiones del salón, arrastra mesas, configura nombre / capacidad / forma.
- **IA desde foto aérea**: el dueño sube una foto del salón (plano, Google Maps, foto propia) → IA detecta posición y forma de las mesas → genera layout inicial → el dueño ajusta con drag & drop.

**Componentes requeridos:**

- Modelo `TableLayout` / `SalonLayout` — coordenadas/posición de cada mesa en el plano.
- Modelo `Reservation` — cliente, mesa, fecha/hora, estado (pendiente / confirmada / cancelada / no-show).
- Vista cliente: componente de mapa SVG o canvas interactivo.
- Vista admin/cajero: gestión de reservas del día (confirmar, cancelar, marcar no-show).
- Integración con `TableSession`: al llegar el cliente con reserva, la mesa se "activa" y la sesión arranca.

**Why:** pedido del dueño, analogía cine es la referencia de UX.

**Cuándo:** no antes de cerrar MVP Core + delivery. Evaluar como v2 feature principal.

---

## Delivery + multi-canal (Fase 3 y 4 — post validación MVP Core)

Plan completo analizado. **Activar solo después de tener ≥3 clientes pagos del MVP Core.**

### Fase 3 — Canales propios (mes 5–7 post-launch)

**A) Web store** — `/pedidos/:branchSlug` pública. Mismo backend, mismo dashboard. MP Checkout Pro (ya integrado en Sprint 5). `channel = 'web'`.

**B) WhatsApp ordering** — migrar número del local a WhatsApp Business API (BSP: 360dialog ~USD 25-30/mes). Bot deterministico (NO IA libre — prohibido por Meta desde enero 2026). Carrito estructurado → link de pago MP → templates utility para tracking. `channel = 'whatsapp'`.

**C) Meta Commerce Manager sync** — menú cargado en HeyMozo se sincroniza vía Commerce API a WhatsApp + Instagram Shop + Facebook Shop. Diferenciador clave vs Fudo. Complejidad alta. Es por esto que `MenuItem.metaProductId` ya existe (nullable) desde Sprint 2.

### Fase 4 — Marketplaces (mes 8–14)

**PedidosYa primero** (API self-serve en developer.pedidosya.com). **Rappi después** (requiere aprobación manual + venue establecido que avale). **Uber Eats** si vuelve a AR en 2026.

Equivalentes globales: Deliverect, Otter, Cuboh. Ninguno fuerte en AR = oportunidad de mercado.

### Pricing propuesto (post-MVP)

| Plan | USD/mes |
|---|---|
| Salón | 49 |
| Salón + Web | 79 |
| Completo (+ WhatsApp + Meta Commerce sync) | 119 |
| Multi-sucursal | 199 |

### Definir antes de implementar

- **Horarios de servicio por canal** (modelo `branch_hours`) — sin esto el bot acepta pedidos a las 3am.
- **Stock en tiempo real** (`MenuItem.stock` ya existe nullable) — sin esto el local vende items agotados.
- **Toggle "pausar delivery"** desde dashboard del dueño.
- **Política de cancelación y devolución MP**.
- **Modificadores complejos** (abordaje simple MVP: campo libre `order.notes` al final del bot).
- **Abandono de carrito** — Meta prohíbe follow-up si el usuario no inicia la conversación.

### Decisiones arquitectónicas que se toman ANTES de Fase 3

- **Sprint 3:** agregar `channel VARCHAR(20) NOT NULL DEFAULT 'dine_in'` al modelo `Order` desde su creación. No cambia nada del flujo dine-in pero evita una migración riesgosa sobre tabla con datos reales.
- **Sprint 2 ✅:** `MenuItem.metaProductId` (nullable) ya creado, queda en null hasta Fase 3.
- **Sprint 2 ✅:** `MenuItem.stock` (nullable) ya creado, lógica de decremento entra en Fase 3.

---

## Lo que queda fuera del MVP pero NO va en este roadmap

Estas cosas ya están listadas en [PHASE2_PLAN.md §"Lo que queda fuera del MVP (v1.5)"](PHASE2_PLAN.md): Club VIP UI completa, trust dot enforcement, auditoría dashboard, tab Seguridad CajaShell, Reseñas tab completa, sectores y asignación mozo↔mesa, EventConfigModal refactor, hard limits enforcement avanzado. No se duplican acá.
