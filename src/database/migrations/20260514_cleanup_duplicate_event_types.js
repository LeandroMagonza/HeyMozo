// Migration: limpia EventTypes duplicados (mismo companyId + eventName).
//
// Origen del bug: la migration 20260511 Step 4 chequeaba `WHERE eventName =
// 'Pedir Hielo'` antes de insertar, pero la migration 20260512 después
// renombraba "Pedir Hielo" → "Hielo". Cada nueva corrida de `npm run migrate`
// volvía a encontrar el "Pedir Hielo" ausente y lo recreaba. Resultado:
// múltiples filas con el mismo (companyId, "Hielo").
//
// Estrategia:
//   1. Para cada (companyId, eventName) con duplicados, identificar el
//      canónico = fila con MIN id.
//   2. Reasignar Events.eventTypeId del duplicado → canónico (preserva
//      historial sin perder FK).
//   3. Borrar EventConfigurations.eventTypeId del duplicado.
//   4. Soft-delete (paranoid) los EventType duplicados.
//
// Idempotente: si no hay duplicados, no escribe nada.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: cleanup duplicate EventTypes');

    try {
      // 1) Encontrar grupos con duplicados (ignorando filas ya soft-deleted)
      const duplicates = await queryInterface.sequelize.query(
        `SELECT "companyId", "eventName", array_agg(id ORDER BY id) AS ids
           FROM "EventTypes"
          WHERE "deletedAt" IS NULL
          GROUP BY "companyId", "eventName"
         HAVING COUNT(*) > 1`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      if (duplicates.length === 0) {
        console.log('✅ No duplicate EventTypes found. Nothing to clean up.');
        return;
      }

      console.log(`🧹 Found ${duplicates.length} duplicate groups`);

      let totalReassigned = 0;
      let totalConfigsDeleted = 0;
      let totalSoftDeleted = 0;

      for (const group of duplicates) {
        const ids = group.ids;
        const canonicalId = ids[0]; // MIN id (array_agg ORDER BY id)
        const dupIds = ids.slice(1);

        console.log(
          `   🔧 (company ${group.companyId}, "${group.eventName}"): canonical=${canonicalId}, dups=${dupIds.join(',')}`
        );

        // 2) Reasignar Events de los duplicados al canónico
        const [, eventsMeta] = await queryInterface.sequelize.query(
          `UPDATE "Events"
              SET "eventTypeId" = :canonicalId
            WHERE "eventTypeId" IN (:dupIds)`,
          { replacements: { canonicalId, dupIds } }
        );
        const eventsAffected = eventsMeta?.rowCount ?? 0;
        if (eventsAffected > 0) {
          console.log(`      🔁 reassigned ${eventsAffected} Events`);
          totalReassigned += eventsAffected;
        }

        // 3) Borrar EventConfigurations apuntando a los duplicados
        const [, configsMeta] = await queryInterface.sequelize.query(
          `DELETE FROM "EventConfigurations"
            WHERE "eventTypeId" IN (:dupIds)`,
          { replacements: { dupIds } }
        );
        const configsAffected = configsMeta?.rowCount ?? 0;
        if (configsAffected > 0) {
          console.log(`      🗑️  deleted ${configsAffected} EventConfigurations`);
          totalConfigsDeleted += configsAffected;
        }

        // 4) Soft-delete los EventTypes duplicados (paranoid)
        await queryInterface.sequelize.query(
          `UPDATE "EventTypes"
              SET "deletedAt" = NOW(),
                  "isActive" = false
            WHERE id IN (:dupIds)`,
          { replacements: { dupIds } }
        );
        totalSoftDeleted += dupIds.length;
      }

      console.log(
        `✅ Cleanup complete: ${totalSoftDeleted} duplicates soft-deleted, ` +
          `${totalReassigned} Events reassigned, ${totalConfigsDeleted} EventConfigurations removed`
      );
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (/* queryInterface, Sequelize */) => {
    console.log(
      '⚠️  20260514_cleanup_duplicate_event_types: down is a no-op.'
    );
    console.log(
      '    Soft-deleted EventTypes can be restored manually if needed.'
    );
  },
};
