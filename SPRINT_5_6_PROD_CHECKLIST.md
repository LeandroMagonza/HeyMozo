# Sprint 5.6 — Checklist de producción (MP nativo)

Tareas que hay que hacer **antes de habilitar MP nativo en el venue piloto**. El código del [PR #34](https://github.com/LeandroMagonza/HeyMozo/pull/34) está listo; lo que sigue es configuración + verificación contra credenciales reales.

> Marcar cada ítem al ejecutarlo. Si algún paso falla, frenar y registrar el bloqueante antes de seguir.

---

## 1. Credenciales MP — pasar de TEST a PROD

Hoy `.env.development` usa credenciales TEST de la app `4740630977962697`. En producción:

- [ ] Crear (o usar existente) **app productiva** en [MP devs](https://www.mercadopago.com.ar/developers/panel) — distinta de la app TEST.
- [ ] Copiar credenciales **de producción** (no las de prueba) al `.env` del servidor productivo:
  - `MP_APP_ID` — App ID productivo.
  - `MP_APP_SECRET` — Client Secret productivo (sigue siendo el Access Token de la app).
  - `MP_ACCESS_TOKEN` — Access Token productivo. **Sólo se usa como fallback dev**; en prod lo ignora el código.
  - `REACT_APP_MP_PUBLIC_KEY` — Public Key productiva.
  - `REACT_APP_MP_APP_ID` — espejo del App ID productivo, expuesto al front para el OAuth redirect.
- [ ] **NO usar** las credenciales TEST en el deploy productivo. MP rechaza pagos reales con AT TEST.

---

## 2. APP_BASE_URL — apuntar al dominio prod

- [ ] Reemplazar el valor ngrok por:
  ```
  APP_BASE_URL=https://www.heymozo.com.ar
  ```
- [ ] Verificar que la URL es **HTTPS** (sin HTTPS, MP rechaza `auto_return: 'approved'` — el fix de [src/services/mercadoPago.js](src/services/mercadoPago.js) detecta el esquema y omite `auto_return` para http; en prod nunca debería caer en esa rama).

---

## 3. Webhook MP — configurar contra el dominio prod

- [ ] En MP devs panel → la **app productiva** → **Webhooks**:
  - URL: `https://www.heymozo.com.ar/api/payments/mp/webhook`
  - Modo: **Producción**
  - Eventos: marcar **Pagos** (`payment.*`) — y solo eso.
  - Guardar.
- [ ] Copiar la **"Clave secreta"** que MP muestra (64 chars hex) y pegarla en `MP_WEBHOOK_SECRET` del `.env` productivo.
- [ ] Verificar que **NO existe ningún otro webhook activo** en la misma app — múltiples webhooks con la misma URL generan secrets distintos y rompen la firma (caso vivido en el smoke local: 12 variantes de manifest probadas, ninguna matcheó porque el secret estaba mal). Borrar configuraciones huérfanas si las hay.

---

## 4. Apagar escape hatches de dev

- [ ] **Quitar** `MP_SKIP_WEBHOOK_SIGNATURE` del `.env` productivo (o dejarlo vacío). La flag se ignora en `NODE_ENV=production` por código, pero limpiar el `.env` evita confusiones.
- [ ] Confirmar que `NODE_ENV=production` en el deploy.
- [ ] Confirmar que el fallback dev a `MP_ACCESS_TOKEN` global no se va a disparar — verificado por código en [src/services/mercadoPago.js:35-37](src/services/mercadoPago.js#L35-L37) (`process.env.NODE_ENV !== 'production'`). Si en prod no hay `Branch.mpAccessToken`, el endpoint debe devolver 400 "Mercado Pago no está configurado en este local".

---

## 5. OAuth por venue — completar el flow real

Mientras desarrollábamos, todos los pagos usaban `MP_ACCESS_TOKEN` global como fallback. En prod cada branch tiene que pasar por el OAuth de Sprint 5.3 para guardar su propio `mpAccessToken`:

- [ ] Loguear el dueño del venue (rol `owner`) en `/admin/login`.
- [ ] Ir a `/config/<companyId>/<branchId>/payments`.
- [ ] Apretar **"Conectar Mercado Pago"** → completa OAuth contra la cuenta MP del venue → vuelve a la app con `Branch.mpAccessToken` poblado.
- [ ] Verificar en DB:
  ```sql
  SELECT id, name, "mpAccessToken" IS NOT NULL AS mp_ok, "mpRefreshToken" IS NOT NULL AS refresh_ok
  FROM "Branches" WHERE id = <branchId>;
  ```
- [ ] Cuando el cobro se ejecute con el AT del branch, el dinero va a la cuenta MP del venue — **no** a la plataforma. Verificar el primer pago real en el panel MP del venue.

---

## 6. Marketplace MP — habilitar split de propinas (post-aprobación)

Cuando se apruebe el trámite Marketplace MP (ver [memoria `project_mp_marketplace_pending`](C:/Users/tomas/.claude/projects/c--Users-tomas-OneDrive-Documentos-Programacion-HeyMozo/memory/project_mp_marketplace_pending.md)):

- [ ] Activar el flag por venue:
  ```sql
  UPDATE "Branches" SET "mpMarketplaceEnabled" = true WHERE id = <branchId>;
  ```
- [ ] Sub-PR posterior va a:
  - Incluir `tipCents` en `Payment` MP nativo (hoy forzado a 0 — [src/services/payments.js:90](src/services/payments.js#L90)).
  - Agregar `marketplace_fee` + `application_fee` en `createPreference` para split automático: consumo al venue, propina al `User.mpAlias`/AT del mozo (`collectedByUserId`).
  - Eliminar el bloque "Propina pendiente" de PostPagoPage (que en Sprint 5.9 muestra opciones offline cuando MP no tiene Marketplace).
- [ ] No tocar `mpMarketplaceEnabled` hasta que la cuenta MP plataforma esté formalmente aprobada — habilitarlo antes hace que MP rechace los pagos con error de permisos.

---

## 7. Smoke productivo (primer pago real)

Antes de avisar al venue que ya pueden cobrar por MP:

- [ ] Pagar **tu mismo consumo** ($1–$5 ARS) en una mesa del venue desde tu celular real (no sandbox).
  - Tarjeta real propia, no de test.
- [ ] Verificar en orden:
  1. Redirect a Checkout Pro de MP (no a sandbox).
  2. Pantalla de cobro real (logo del venue, tu nombre, etc.).
  3. Pago aprobado en MP.
  4. Vuelta automática a `/m/.../pago-confirmado/<id>` por `auto_return: 'approved'`.
  5. UI "¡Listo!" con breakdown correcto.
  6. **Webhook MP recibido con firma válida** — chequear logs del server productivo, debe loguear `💳 MP webhook OK — payment X → paid`. Si aparece `❌ MP webhook 401: SignatureMismatch`, parar y revisar paso 3 de este checklist.
  7. `Payment` en DB con `status='paid'`, `mpPaymentId` poblado.
  8. `TableSession` cerrada si el balance llegó a 0.
- [ ] Cobrarte a vos mismo el reembolso desde MP devs (o admitir el costo como gasto de testing).

---

## 8. Bugs conocidos a monitorear post-deploy

Estos no son bloqueantes pero conviene observarlos en el primer mes:

- **Title MP "Mesa Mesa 1"** — duplicación cosmética en el title de la preference (el código arma `Mesa ${table.tableName}` y `tableName` ya viene como "Mesa N"). Fix de 1 línea en [src/services/mercadoPago.js:62](src/services/mercadoPago.js#L62). Bajo bloqueo: no rompe nada.
- **Axios interceptor 401 redirect a "/"** — preexistente, fuera del scope del Sprint 5.6. Si un endpoint customer (sin JWT) devuelve 401 por algo legítimo (e.g., device cookie perdida), el interceptor pega un redirect a "/" pensando que es JWT expirado. Mejor abordar en un sub-PR aparte de QA.
- **Webhook MP con `data.id` vacío** — algunas notificaciones MP (merchant_order, plan, etc.) llegan sin `data.id`. El handler responde 200 con `ignored: 'missing_data_id'` — verificar que no se acumulen muchas en los logs (si más del 10% del tráfico de webhooks, abrir ticket en MP support).

---

## 9. Rollback de emergencia

Si MP nativo causa problemas en producción y hay que apagarlo sin re-deploy:

- [ ] En MP devs → app productiva → Webhooks → **desactivar** la config (no borrar). Esto detiene futuros webhooks pero no bloquea preferences ya creadas.
- [ ] En la UI de admin (`/config/<c>/<b>/payments`), apagar el toggle de MP en `paymentMethodsEnabled`. El chip "Mercado Pago" desaparece del `PaymentMethodSheet` del cliente — los pedidos siguen funcionando con cash/card/transfer/MODO.
- [ ] Pagos MP **ya iniciados** (preferences creadas) siguen procesándose porque la preference vive del lado MP; lo único que se interrumpe es la creación de nuevas y el procesado de webhooks (que el cliente puede compensar refrescando PagoConfirmadoPage).
- [ ] Si hay Payments MP `pending` huérfanos por días, marcarlos `failed` manualmente:
  ```sql
  UPDATE "Payments" SET status='failed' WHERE method='mp_native' AND status='pending' AND "createdAt" < NOW() - INTERVAL '1 day';
  ```
