# PHASE2_STATUS.md

Tracker live de los sub-PRs de Fase 2. Una línea por sub-PR con commit, branch, PR# y estado.

**Última actualización:** 2026-05-26 (5.5 mergeado; 5.6 abierto)

> Cuando un PR se mergea, mover su sub-PR a "✅ Mergeado" abajo y actualizar el [PHASE2_PLAN.md](PHASE2_PLAN.md) si corresponde (cambiar 🚧 → ✅ para el sprint completo cuando todas las sub-PRs estén in).

---

## 🚧 En review / abiertos

| Sub-PR | Branch | Commit | PR | Notas |
|---|---|---|---|---|
| 5.6 | `feature/phase2-payment-mp-native` | — | — | feat(payments): MP nativo (Checkout Pro) + webhook HMAC. **Backend:** nuevo service `src/services/mercadoPago.js` (SDK oficial v3) con `createPreference` (Checkout Pro, items/external_reference/back_urls/auto_return/binary_mode), `fetchMpPayment`, `verifyWebhookSignature` (vía `WebhookSignatureValidator` de la SDK, tolerancia 10min), `mapMpStatus`. Helper `_resolveAccessToken` usa `Branch.mpAccessToken` (OAuth de 5.3) con fallback dev-only a `MP_ACCESS_TOKEN` global. `payments.js`: agrega `MP_METHODS=['mp_native']` a `SUPPORTED_METHODS`, `requestPayment` para mp_native fuerza tipCents=0 y no crea Event, y nuevo `applyMpPayment({ paymentId, nextStatus, mpPaymentId, mpRawPayload })` idempotente que marca paid/failed + auto-cierra sesión si balance=0. `customerSessions.js`: POST `/tables/:id/payments` extendido — si method='mp_native' crea preference y devuelve `mpInitPoint`. Nuevo endpoint **público** `POST /api/payments/mp/webhook?payment_id=<local>&data.id=<mp>` que verifica firma → resuelve branch desde Payment local → fetch MP payment con AT del branch → `applyMpPayment`. **Frontend:** `PaymentMethodSheet` activa chip MP (`apiMethod='mp_native'`); cuando el POST devuelve `mpInitPoint` redirige con `window.location.href`. `PagoConfirmadoPage` reescrito con polling 2s/timeout 30s mientras Payment está pending o awaiting_validation; muestra estados visuales para procesando/error/listo + subtítulos según método. **Env:** nueva `MP_WEBHOOK_SECRET` en `.env.example`, nota sobre ngrok para `APP_BASE_URL` en dev. **Sin migrations** (ENUM `mp_native` ya existía de 5.2). Sin smoke MP real todavía — espera ngrok + secret del user. |

---

## 📝 Pendientes (próximos)

_(Sprint 4 cerrado. Sprint 5.1 mergeado. Sprint 5 (Pagos digitales + Club VIP) en curso — diseño cerrado 2026-05-24, ver [PHASE2_PLAN.md](PHASE2_PLAN.md) §Sprint 5)._

Próximos sub-PRs Sprint 5: 5.7 (split monto) → 5.8 (CajaShell Acciones + liberar mesa) → 5.9 (PostPagoPage) → 5.10 (Club CajaShell) → 5.11 (Vouchers).

---

## ✅ Mergeado

| Sub-PR | Branch | Commit | PR | Notas |
|---|---|---|---|---|
| 1.1 | `feature/phase2-roles-middleware` | `b11c118` | [#3](https://github.com/LeandroMagonza/HeyMozo/pull/3) | feat(auth): `User.role` ENUM + `requireRole` middleware |
| 1.2 | `feature/phase2-tablesession-device` | `95ec92e` | [#4](https://github.com/LeandroMagonza/HeyMozo/pull/4) | feat(session): Device + TableSession + TableSessionDevice |
| 1.3 | `feature/phase2-shells` | `21630fc` | [#5](https://github.com/LeandroMagonza/HeyMozo/pull/5) | feat(shells): OpShell + CajaShell + AdminShell + routing |
| 1.4 | `feature/phase2-client-url` | `515a616` | [#6](https://github.com/LeandroMagonza/HeyMozo/pull/6) | feat(routing): customer URL `/user/` → `/m/` |
| 2.1 | `feature/phase2-menu-models` | `ea536a9` | [#7](https://github.com/LeandroMagonza/HeyMozo/pull/7) | feat(menu): Category + MenuItem + `Branch.modality` |
| 2.2 | `feature/phase2-menu-endpoints` | — | [#8](https://github.com/LeandroMagonza/HeyMozo/pull/8) | feat(menu): CRUD endpoints menú admin |
| 2.3 | `feature/phase2-menu-admin` | — | [#9](https://github.com/LeandroMagonza/HeyMozo/pull/9) | feat(menu): vista admin `/config/:c/:b/menu` |
| 2.4 | `feature/phase2-branch-wizard` | — | [#11](https://github.com/LeandroMagonza/HeyMozo/pull/11) | feat(branch): wizard 3 pasos |
| 2.5 | `feature/phase2-menu-client` | — | [#12](https://github.com/LeandroMagonza/HeyMozo/pull/12) | feat(menu): vista cliente `/m/:c/:b/:t/menu` |
| 3.1 | `feature/phase2-order-models` | `fe31025` | [#13](https://github.com/LeandroMagonza/HeyMozo/pull/13) | feat(orders): Order + OrderItem + EventType "Nuevo Pedido" |
| 3.2 | `feature/phase2-order-endpoints` | `6c9b332` | [#14](https://github.com/LeandroMagonza/HeyMozo/pull/14) | feat(orders): device cookie + session attach + order endpoints |
| 3.3 | `feature/phase2-order-client-ui` | `a3e51c2` | [#15](https://github.com/LeandroMagonza/HeyMozo/pull/15) | feat(client): MenuClient "+", CartPage, ConfirmadoPage + polling LISTO, ThumbmarkJS |
| 3.4a | `feature/phase2-opshell-alerts` | `dbfbfc4` | [#16](https://github.com/LeandroMagonza/HeyMozo/pull/16) | feat(opshell): grid AlertCards purple `new_order` + polling 6s (render only) |
| 3.4b | `feature/phase2-opshell-listo` | `c7db4f1` | [#17](https://github.com/LeandroMagonza/HeyMozo/pull/17) | feat(opshell): acción LISTO + OrderDetailModal + redirect AdminScreen |
| 4.1 | `feature/phase2-staff-order-service` | `e3b9453` | [#19](https://github.com/LeandroMagonza/HeyMozo/pull/19) | feat(orders): `staffAddOrder` + helper `_createOrderWithItemsTx` + `Order.createdByUserId` migration + `ensureActiveSessionForStaff` |
| 4.2 | `feature/phase2-staff-order-endpoint` | `3a60a07` | [#20](https://github.com/LeandroMagonza/HeyMozo/pull/20) | feat(orders): `POST /api/orders/staff` (requireRole waiter/cashier/owner + checkBranchPermission) |
| 4.3 | `feature/phase2-add-order-modal` | `16b382e` | [#21](https://github.com/LeandroMagonza/HeyMozo/pull/21) | feat(opshell): AddOrderModal — mesa selector, menú por categorías con search + tabs sticky, steppers qty. Botón "Nuevo pedido" en topnav. |
| OPS-1 | `feature/opshell-stacked-cards` | `7876e0e` | [#25](https://github.com/LeandroMagonza/HeyMozo/pull/25) | feat(opshell): OrderStack — pila colapsable para mesas con 2+ pedidos, shadows offset diagonal, badge +N, drop-down expandido in-place, LISTO por card individual. Reemplazado en PR #26 por TableStack. |
| OPS-2 | `feature/opshell-stacked-cards` | `b905187` | [#26](https://github.com/LeandroMagonza/HeyMozo/pull/26) | feat(opshell): alertas de EventType + stack mixto — endpoint `/active-alerts`, TableStack heterogéneo (Order + Event), "Atender" marca seen masivo, **bloqueante de deploy resuelto** |
| FIX-1 | `fix/auth-middleware-duplicate` | `b2ddfda` | [#27](https://github.com/LeandroMagonza/HeyMozo/pull/27) | fix(auth): eliminar middleware `authenticate` redundante (2-3× → 1× por request) |
| 5.1 | `feature/sprint-5.1-customer-order-history` | `3ca6d20` | [#28](https://github.com/LeandroMagonza/HeyMozo/pull/28) | feat(client): historial de pedidos de sesión + CartSheet — GET /api/tables/:id/orders, `CartSheet` bottom sheet reemplaza `CartPage`, `SessionOrdersList`, bottom bar ampliada. Prerequisito de Pagos digitales (Sprint 5). |
| 5.2 | `feature/phase2-payment-models` | `9e9f6a2` | [#29](https://github.com/LeandroMagonza/HeyMozo/pull/29) | feat(payments): migrations + modelos Payment/Review/ReviewTag/ReviewTagAssignment/ClubMember/ClubVisit/Voucher + campos nuevos en Branch y User. Seed de 8 ReviewTags negativos al crear branch. Sin endpoints, sin UI. |
| 5.3 | `feature/phase2-payment-config-ui` | `83ceaf4` | [#30](https://github.com/LeandroMagonza/HeyMozo/pull/30) | feat(payments): UI `/config/:c/:b/payments` (OAuth MP, alias transfer, toggles paymentMethodsEnabled, prioridad drag-drop, googleMapsReviewUrl, Club VIP config). UI `/profile` mozo (mpAlias). Endpoint OAuth callback MP + PUT /users/me. |
| 5.4 | `feature/phase2-payment-cash-card` | `fcc28f7` | [#31](https://github.com/LeandroMagonza/HeyMozo/pull/31) | feat(payments): flow cash/tarjeta + UX redesign no bloqueante. Migration `Payment.eventId` + seed 2 EventTypes (`Cobrar efectivo`/`Cobrar tarjeta`, cardVariant=red). Endpoints `POST /tables/:id/payments`, `GET /payments/:id/status`, `POST /payments/:id/cancel`, `POST /payments/:id/collect`, `GET /tables/:id/pending-payment`. `PaymentMethodSheet` (items + propina 10/15/Otro/Nada + jerarquía MP/Transferencia/Tarjeta+Efectivo). UX no bloqueante: botón "Pagar" en UserScreen muta a "Esperando al mozo · efectivo/tarjeta"; re-tap abre `WaiterOnTheWaySheet`. Hook `usePendingPayment` con polling 4s + auto-redirect a `/pago-confirmado`. OpShell: AlertCard "Cobré $X". Auto-cierre TableSession si balance=0. |

---

## Convenciones de trabajo

Todas las branches de sub-PR se crean **desde master**, independientes entre sí (incluso cuando una depende lógicamente de otra). Razón: Leandro revisa en su propio tempo; el dev que avanza no se bloquea esperando un merge.

**How to apply** al arrancar un sub-PR nuevo:

1. `git checkout master && git pull`
2. `git checkout -b feature/phase2-<scope>`
3. Implementar el scope acotado del sub-PR (sin spillover de otro).
4. Commit con prefijo convencional (`feat(scope):`, `fix(scope):`, etc.).
5. `git push -u origin <branch>` + abrir PR contra master.
6. Actualizar este archivo: mover el sub-PR a "🚧 En review" con commit y PR#.

Si el sub-PR previo aún no mergeó pero su código es prerequisito (ej: 2.2 necesita los modelos de 2.1), trabajar igual desde master — al mergear 2.1 primero, los conflictos de 2.2 serán mínimos (modelos nuevos no chocan). En la PR mencionarlo explícitamente: "Depende de #7 (Sprint 2.1) — mergear primero".
