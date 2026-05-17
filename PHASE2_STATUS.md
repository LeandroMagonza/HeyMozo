# PHASE2_STATUS.md

Tracker live de los sub-PRs de Fase 2. Una línea por sub-PR con commit, branch, PR# y estado.

**Última actualización:** 2026-05-16

> Cuando un PR se mergea, mover su sub-PR a "✅ Mergeado" abajo y actualizar el [PHASE2_PLAN.md](PHASE2_PLAN.md) si corresponde (cambiar 🚧 → ✅ para el sprint completo cuando todas las sub-PRs estén in).

---

## 🚧 En review / abiertos

| Sub-PR | Branch | Commit | PR | Notas |
|---|---|---|---|---|
| 1.1 | `feature/phase2-roles-middleware` | `b11c118` | [#3](https://github.com/LeandroMagonza/HeyMozo/pull/3) | feat(auth): add `User.role` ENUM + `requireRole` middleware |
| 1.2 | `feature/phase2-tablesession-device` | `95ec92e` | [#4](https://github.com/LeandroMagonza/HeyMozo/pull/4) | feat(session): add Device + TableSession + TableSessionDevice models |
| 1.3 | `feature/phase2-shells` | `21630fc` | — (pendiente abrir) | feat(shells): add OpShell, CajaShell, AdminShell + routing |
| 1.4 | `feature/phase2-client-url` | `515a616` | — (pendiente abrir) | feat(routing): migrate customer URL `/user/` → `/m/` |
| 2.1 | `feature/phase2-menu-models` | `ea536a9` | [#7](https://github.com/LeandroMagonza/HeyMozo/pull/7) | feat(menu): add Category + MenuItem models + `Branch.modality` |

---

## 📝 Pendientes (próximos)

| Sub-PR | Branch (a crear) | Scope corto | Depende de |
|---|---|---|---|
| 2.2 | `feature/phase2-menu-endpoints` | CRUD endpoints menú admin | 2.1 |
| 2.3 | `feature/phase2-menu-admin` | Vista admin `/config/:c/:b/menu` | 2.2 |
| 2.4 | `feature/phase2-branch-wizard` | `BranchCreate.js` wizard 3 pasos | — (paralelizable) |
| 2.5 | `feature/phase2-menu-client` | Vista cliente `/m/:c/:b/:t/menu` + fallback link viejo | 2.2 |

Para detalle de scope de cada sub-PR de Sprint 2 ver [PHASE2_PLAN.md §Sprint 2 — desglose](PHASE2_PLAN.md).

---

## ✅ Mergeado

_(vacío hasta que Leandro mergee la primera sub-PR de Fase 2)_

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
