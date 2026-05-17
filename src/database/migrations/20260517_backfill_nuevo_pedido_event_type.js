// Migration Sprint 3.1: siembra el EventType "Nuevo Pedido" para todas las
// companies existentes. Companies nuevas lo reciben automáticamente vía
// `EventConfigService.createDefaultEventTypes`.
//
// Por qué es un EventType custom y no `systemEventType: 'NEW_ORDER'`:
//   - El ENUM systemEventType actual es SCAN | MARK_SEEN | OCCUPY | VACATE.
//     Agregar un valor requiere ALTER TYPE + tocar partial-unique index +
//     hooks beforeUpdate/beforeDestroy. Costo alto.
//   - Custom permite override por sucursal/mesa de color/ícono/prioridad,
//     que es exactamente lo que vamos a querer.
//
// Defaults:
//   - cardVariant 'purple' (la AlertCard del mockup para nuevos pedidos).
//   - customerDisplay 'hidden' — el Event se dispara desde el backend al
//     confirmar pedido, no es un botón que toca el cliente.
//   - priority 55 — entre "Llamar al Mozo" (50) y "Llamar al Encargado" (60).
//
// Idempotente: chequea por (companyId, eventName='Nuevo Pedido') antes de
// insertar.

const NUEVO_PEDIDO_DEFAULTS = {
  eventName: 'Nuevo Pedido',
  stateName: 'Pedido pendiente',
  userColor: '#a855f7',
  userFontColor: '#ffffff',
  userIcon: null,
  adminColor: '#ede9fe',
  priority: 55,
  systemEventType: null,
  customerDisplay: 'hidden',
  cardVariant: 'purple',
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: backfill EventType "Nuevo Pedido"');

    try {
      const companies = await queryInterface.sequelize.query(
        `SELECT id FROM "Companies" WHERE "deletedAt" IS NULL`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`   📊 Found ${companies.length} active companies`);

      let created = 0;
      let skipped = 0;

      for (const company of companies) {
        const companyId = company.id;

        const existing = await queryInterface.sequelize.query(
          `SELECT id FROM "EventTypes"
            WHERE "companyId" = :companyId
              AND "eventName" = :eventName
              AND "deletedAt" IS NULL
            LIMIT 1`,
          {
            replacements: { companyId, eventName: NUEVO_PEDIDO_DEFAULTS.eventName },
            type: Sequelize.QueryTypes.SELECT,
          }
        );

        if (existing.length > 0) {
          console.log(`   ↩️  company ${companyId}: "Nuevo Pedido" already exists (id=${existing[0].id}), skipping`);
          skipped++;
          continue;
        }

        const now = new Date();
        await queryInterface.bulkInsert('EventTypes', [
          {
            companyId,
            eventName: NUEVO_PEDIDO_DEFAULTS.eventName,
            stateName: NUEVO_PEDIDO_DEFAULTS.stateName,
            userColor: NUEVO_PEDIDO_DEFAULTS.userColor,
            userFontColor: NUEVO_PEDIDO_DEFAULTS.userFontColor,
            userIcon: NUEVO_PEDIDO_DEFAULTS.userIcon,
            adminColor: NUEVO_PEDIDO_DEFAULTS.adminColor,
            priority: NUEVO_PEDIDO_DEFAULTS.priority,
            isDefault: true,
            systemEventType: NUEVO_PEDIDO_DEFAULTS.systemEventType,
            customerDisplay: NUEVO_PEDIDO_DEFAULTS.customerDisplay,
            cardVariant: NUEVO_PEDIDO_DEFAULTS.cardVariant,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          },
        ]);

        const inserted = await queryInterface.sequelize.query(
          `SELECT id FROM "EventTypes"
            WHERE "companyId" = :companyId
              AND "eventName" = :eventName
            ORDER BY id DESC
            LIMIT 1`,
          {
            replacements: { companyId, eventName: NUEVO_PEDIDO_DEFAULTS.eventName },
            type: Sequelize.QueryTypes.SELECT,
          }
        );

        if (inserted.length === 0) {
          throw new Error(`Failed to fetch inserted EventType "Nuevo Pedido" for company ${companyId}`);
        }

        const newId = inserted[0].id;

        await queryInterface.bulkInsert('EventConfigurations', [
          {
            resourceType: 'company',
            resourceId: companyId,
            eventTypeId: newId,
            enabled: true,
            createdAt: now,
            updatedAt: now,
          },
        ]);

        console.log(`   ➕ company ${companyId}: created "Nuevo Pedido" (id=${newId})`);
        created++;
      }

      console.log(`✅ Backfill complete: ${created} created, ${skipped} skipped`);
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (/* queryInterface, Sequelize */) => {
    console.log('⚠️  20260517_backfill_nuevo_pedido_event_type: down is a no-op.');
    console.log('    "Nuevo Pedido" EventTypes pueden borrarse desde el admin si hace falta.');
  },
};
