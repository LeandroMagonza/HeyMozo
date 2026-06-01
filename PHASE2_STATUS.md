# PHASE2_STATUS.md

Tracker live de los sub-PRs de Fase 2. Una línea por sub-PR con commit, branch, PR# y estado.

**Última actualización:** 2026-06-01 (5.11 Vouchers implementado en `feature/phase2-club-voucher`, smoke servicio 21/21 + build OK; pendiente push/PR. Cierra Sprint 5.)

> Cuando un PR se mergea, mover su sub-PR a "✅ Mergeado" abajo y actualizar el [PHASE2_PLAN.md](PHASE2_PLAN.md) si corresponde (cambiar 🚧 → ✅ para el sprint completo cuando todas las sub-PRs estén in).

---

## 🚧 En review / abiertos

**5.11 (Vouchers)** — código completo en `feature/phase2-club-voucher`, **pendiente de push + abrir PR**. Último sub-PR de Sprint 5: al mergear, marcar Sprint 5 ✅ en PHASE2_PLAN.
- Modelo `ClubMemberDevice` (link device↔member) + migración `20260602_add_club_member_device.js`.
- `club.js`: generación automática de Voucher al alcanzar `clubGoal` (guard "1 voucher pendiente por member", no resetea visits hasta el canje), `getPendingVoucherForDevice`, `redeemVoucher` (valida branch + ya-canjeado → reset visits a 0), voucher pendiente en `listMembersForBranch` y `getClubStatusForSession`.
- Rutas: `club-join` ahora pasa `deviceId`; `GET /tables/:id/club-voucher` (público, best-effort, 200 `{voucher:null}` sin cookie); `POST /branches/:id/vouchers/redeem` (requireRole waiter/cashier/owner + checkBranchPermission).
- Frontend: `VoucherBanner` en UserScreen (detección "próxima visita" al escanear), `RedeemVoucherModal` + botón "Canjear voucher" en OpShell, `ClubMembersTab` con badge 🎁 + template `{codigo}` + filtro "Voucher pendiente", celebración del código en PagoConfirmadoPage.
- Smoke de servicio 21/21 (generación al goal, no-duplicación, detección por device + aislamiento de comensal/otra sucursal, listado, canje, doble-canje 409, código inválido 404, post-canje sin voucher). Build CRA OK (mis archivos sin warnings).

> Aparte de Fase 2: **#36** (`fix/mp-webhook-verification`) sigue abierta — fix de robustez del webhook MP, ortogonal al Club. Requiere smoke MP propio antes de mergear (ver [SPRINT_5_6_PROD_CHECKLIST.md]).

---

## 📝 Pendientes (próximos)

_(Sprint 4 cerrado. Sprint 5.1–5.10 mergeados + hardening conteo Club (#40). **Sprint 5.11 implementado** (en review/pendiente PR). Al mergear 5.11 → Sprint 5 completo. Diseño cerrado 2026-05-24, ver [PHASE2_PLAN.md](PHASE2_PLAN.md) §Sprint 5)._

Sub-PRs Sprint 5: ~~5.8~~ ~~5.9~~ ~~5.10~~ ~~5.11~~ → todos los sub-PRs in (5.11 pendiente de merge). **Próximo macro: cerrar Sprint 5 y arrancar Sprint 6** (casos edge de liberación: zombi vs caliente, modal "soy otra persona", transferencias mesa-a-mesa, auto-close por inactividad) — ver PHASE2_PLAN.

**Tarea operacional pendiente (MP nativo, pre-deploy):** el smoke 5.6 confirmó que los webhooks reales de MP dan `SignatureMismatch` cuando hay **múltiples webhooks configurados en el panel MP devs** (se acumularon al rotar ngrok en dev). Antes de prod: dejar UN solo webhook y sincronizar su Clave Secreta con `MP_WEBHOOK_SECRET`. El código de validación de firma está OK (validado crafteando un webhook firmado). Ver `SPRINT_5_6_PROD_CHECKLIST.md`.

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
| 5.5 | `feature/phase2-payment-transfer-modo` | `7927771` | [#33](https://github.com/LeandroMagonza/HeyMozo/pull/33) | feat(payments): flow transferencia + MODO cliente + endpoints cajero. `payments.js` agrega `ONLINE_METHODS=['transfer','modo']` con flujo `pending → awaiting_validation → paid/failed` (cliente declara → cajero valida). `declarePaid`, `validatePayment`, `rejectPayment` services. `listAwaitingValidationForBranch` para el tab Acciones (en 5.8). Frontend: `TransferWaitingSheet` (alias copiable + comprobante opcional + "Ya transferí"), `ModoWaitingSheet` (deeplink `modo://` con fallback web), polling cliente cada 4s. Propina forzada a 0 en transfer/MODO (decisión PHASE2_PLAN — evita ruido fiscal). |
| 5.6 | `feature/phase2-payment-mp-native` | `287c28b` | [#34](https://github.com/LeandroMagonza/HeyMozo/pull/34) | feat(payments): MP nativo (Checkout Pro) + webhook HMAC. **Backend:** nuevo service `src/services/mercadoPago.js` (SDK oficial v3) con `createPreference` (Checkout Pro, items/external_reference/back_urls/auto_return/binary_mode), `fetchMpPayment`, `verifyWebhookSignature` (vía `WebhookSignatureValidator` de la SDK, tolerancia 10min), `mapMpStatus`. Helper `_resolveAccessToken` usa `Branch.mpAccessToken` (OAuth de 5.3) con fallback dev-only a `MP_ACCESS_TOKEN` global. `payments.js`: agrega `MP_METHODS=['mp_native']` a `SUPPORTED_METHODS`, `requestPayment` para mp_native fuerza tipCents=0 y no crea Event, y nuevo `applyMpPayment` idempotente que marca paid/failed + auto-cierra sesión si balance=0. `customerSessions.js`: POST `/tables/:id/payments` extendido — si method='mp_native' crea preference y devuelve `mpInitPoint`. Nuevo endpoint público `POST /api/payments/mp/webhook?payment_id=<local>` que verifica firma → resuelve branch desde Payment local → fetch MP con AT del branch → `applyMpPayment`. **Frontend:** `PaymentMethodSheet` activa chip MP, redirect `window.location.href = mpInitPoint`. `PagoConfirmadoPage` polling 2s/timeout 30s. **Env:** nueva `MP_WEBHOOK_SECRET`, nota sobre ngrok para `APP_BASE_URL` dev. Sin migrations (ENUM `mp_native` existía de 5.2). Smoke MP real hecho con ngrok + bugs descubiertos fixeados (commit `b70daf6`). Checklist de pasaje a prod: `SPRINT_5_6_PROD_CHECKLIST.md`. |
| 5.7 | `feature/phase2-payment-split-monto` | `1dbafb2` | [#35](https://github.com/LeandroMagonza/HeyMozo/pull/35) | feat(payments): split por monto + 4 fixes del smoke. **Split:** `requestPayment` acepta `splitAmountCents` opcional (validado ≤ outstanding en transacción; 409 si difiere de un pending activo). `SplitAmountSheet` (radio Total/Solo-mi-parte + input libre + chips 1/2,1/3,1/4). `PaymentMethodSheet` activa "Dividir cuenta" + chip "Pagás $X de $Y". Propina sobre la parte que paga. Sin migrations (auto-liberación balance=0 ya existía de 5.4). **Fixes pre-existentes hallados en el smoke:** (1) `GET /orders` devolvía 401 sin cookie → axios interceptor redirigía a "/" → rompía clientes nuevos; ahora 200 `{orders:[]}`. (2) `UserScreen` no bootstrap-eaba la sesión en mount → pagos fallaban; ahora sí. (3) MP nativo pending mostraba el sheet de cash/card ("mozo con tarjeta"); ahora `MpPendingSheet` propio. (4) MP pending colgado sin salida si se abandona Checkout Pro; ahora expira a failed tras 15min (lazy en `findPendingForSession`) + cancel manual. **Smoke MP 5.6 validado E2E** (pago aprobado→webhook firmado→paid→sesión cerrada); `SignatureMismatch` con webhooks reales = config panel (múltiples webhooks), no código. |
| 5.8 | `feature/phase2-cajashell-acciones` | `aac1717` | [#37](https://github.com/LeandroMagonza/HeyMozo/pull/37) | feat(payments): CajaShell tab **Acciones** (cards transfer Validar/Rechazar + acuse "Entendido") + **Mesas activas** (balance + Liberar). OpShell con tabs Alertas/Mesas. Migration `20260530_add_payment_ack_and_session_release`. `payments.listActionsForBranch`/`acknowledgePayment`, `sessions.listActiveSessionsForBranch`/`releaseTable` (VACATE + cancela pending). Componentes `PaymentActionCard`/`ReleaseTableModal`/`ActiveTablesList`. Edge pago-adelantado documentado → Sprint 6. |
| 5.9 | `feature/phase2-postpago-review` | `b81c144` | [#38](https://github.com/LeandroMagonza/HeyMozo/pull/38) | feat(payments): PostPagoPage reescrito (stars → tags negativos ≤3 → submit + Google Maps siempre + card Club VIP). `reviews.js` (getPostpagoContext/submitReview/markReviewDerivedToGoogle) + `club.js` (joinClub con loyalty acceleration + getClubStatusForSession). Rutas públicas en `customerSessions.js`. Sticky redirect a PostPago vía flag localStorage `hm_postpago_<c>_<b>_<t>`; botón "← Volver al inicio" como único exit. Mergeado tras resolver conflictos con 5.8 (`api.js` + `PHASE2_STATUS.md`, ambos aditivos). |
| 5.10 | `feature/phase2-club-cajashell` | `5660429` | [#39](https://github.com/LeandroMagonza/HeyMozo/pull/39) | feat(club): tab **Club VIP** en CajaShell. `club.listMembersForBranch` + `GET /branches/:id/club/members` (`checkBranchPermission`). `ClubMembersTab`: búsqueda por teléfono, chips inactividad (+7/+14/+30d) + toggle "Voucher alcanzado", barra progreso, mensaje WhatsApp editable (vars sucursal/visitas/meta/premio), envío individual + masivo como cola (`wa.me`, "Abrir siguiente" respeta popup-blocker). Smoke servicio 12/12 + prueba visual OK. |
| 5.10-hard | `feature/phase2-club-visit-integrity` | `6c230eb` | [#40](https://github.com/LeandroMagonza/HeyMozo/pull/40) | feat(club): integridad del conteo de visitas. `joinClub` ahora: (2) gate **pago paid** (409 si no), (3) **cooldown por member** `Branch.clubVisitCooldownHours` (default 12h) — no suma dentro de la ventana, registra `ClubVisit` visitsAdded=0 sin mover visits/lastVisitAt, devuelve `cooldownActive`. Migration `20260601_add_club_visit_cooldown` (idempotente). Copy cooldown en PagoConfirmadoPage + input en config Club. Captura sigue solo-teléfono (extensible a email post-MVP). Smoke servicio 9/9. |

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
