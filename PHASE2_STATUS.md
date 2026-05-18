# PHASE2_STATUS.md

Tracker live de los sub-PRs de Fase 2. Una línea por sub-PR con commit, branch, PR# y estado.

**Última actualización:** 2026-05-18

> Cuando un PR se mergea, mover su sub-PR a "✅ Mergeado" abajo y actualizar el [PHASE2_PLAN.md](PHASE2_PLAN.md) si corresponde (cambiar 🚧 → ✅ para el sprint completo cuando todas las sub-PRs estén in).

---

## 🚧 En review / abiertos

| Sub-PR | Branch | Commit | PR | Notas |
|---|---|---|---|---|
| 3.4b | `feature/phase2-opshell-listo` | _(local)_ | — (a abrir) | feat(opshell): acción LISTO + OrderDetailModal + redirect AdminScreen |

---

## 📝 Pendientes (próximos)

| Sub-PR | Branch (a crear) | Scope corto | Depende de |
|---|---|---|---|
| 3.3 | `feature/phase2-order-client-ui` | MenuClient "+", CartPage, ConfirmadoPage, pantalla LISTO, ThumbmarkJS | 3.2 |

Para detalle de scope de Sprint 3 ver [PHASE2_PLAN.md §Sprint 3](PHASE2_PLAN.md).

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
| 3.4a | `feature/phase2-opshell-alerts` | `dbfbfc4` | [#16](https://github.com/LeandroMagonza/HeyMozo/pull/16) | feat(opshell): grid AlertCards purple `new_order` + polling 6s (render only) |

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
