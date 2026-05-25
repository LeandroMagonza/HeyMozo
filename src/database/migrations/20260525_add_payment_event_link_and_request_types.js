// Migration Sprint 5.4: link Payment <-> Event + seed payment_request_cash /
// payment_request_card EventTypes por company.
//
// Cada Payment pending de cash/card genera una alerta en OpShell. La AlertCard
// la dispara un Event con eventType=payment_request_*. Para que el endpoint
// /branches/:id/active-alerts pueda devolver el monto y el paymentId al
// renderear la card, linkeamos Payment.eventId -> Event.id.
//
// Idempotente: chequea existencia antes de crear columna y seed.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: link Payment.eventId + seed payment_request EventTypes (Sprint 5.4)');

    try {
      // ─── Paso 1: Payment.eventId ────────────────────────────────────────
      const desc = await queryInterface.describeTable('Payments');
      if (!desc.eventId) {
        await queryInterface.addColumn('Payments', 'eventId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Events', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        console.log('   ✅ Payments.eventId added');

        await queryInterface.addIndex('Payments', ['eventId'], {
          name: 'payments_event_id_idx',
        });
        console.log('   ✅ index payments_event_id_idx created');
      } else {
        console.log('   ⏭️  Payments.eventId already exists, skipping');
      }

      // ─── Paso 2: seed EventTypes payment_request_cash / _card ──────────
      // Por cada Company existente, crear (si no existen) los 2 EventTypes
      // que dispara el flow de cobro cash/tarjeta. Idempotente: matchea por
      // (companyId, eventName).
      console.log('🏗️  Step 2: seeding payment_request EventTypes per Company...');

      const [companies] = await queryInterface.sequelize.query(
        'SELECT id FROM "Companies" WHERE "deletedAt" IS NULL'
      );

      let created = 0;
      let skipped = 0;
      const seeds = [
        {
          eventName: 'Cobrar efectivo',
          stateName: 'Pago en efectivo pendiente',
          userColor: '#16a34a',
          userFontColor: '#ffffff',
          userIcon: 'FaMoneyBillWave',
          adminColor: '#dc2626',
          cardVariant: 'red',
          customerDisplay: 'hidden',
          priority: 95,
        },
        {
          eventName: 'Cobrar tarjeta',
          stateName: 'Pago con tarjeta pendiente',
          userColor: '#2563eb',
          userFontColor: '#ffffff',
          userIcon: 'FaCreditCard',
          adminColor: '#dc2626',
          cardVariant: 'red',
          customerDisplay: 'hidden',
          priority: 95,
        },
      ];

      for (const company of companies) {
        for (const seed of seeds) {
          const [existing] = await queryInterface.sequelize.query(
            'SELECT id FROM "EventTypes" WHERE "companyId" = :cid AND "eventName" = :name AND "deletedAt" IS NULL LIMIT 1',
            { replacements: { cid: company.id, name: seed.eventName } }
          );

          if (existing.length === 0) {
            await queryInterface.sequelize.query(
              `INSERT INTO "EventTypes"
                ("companyId", "eventName", "stateName", "userColor", "userFontColor", "userIcon",
                 "adminColor", "priority", "isDefault", "systemEventType", "customerDisplay",
                 "cardVariant", "isActive", "createdAt", "updatedAt")
               VALUES
                (:cid, :eventName, :stateName, :userColor, :userFontColor, :userIcon,
                 :adminColor, :priority, false, NULL, :customerDisplay,
                 :cardVariant, true, NOW(), NOW())`,
              { replacements: { cid: company.id, ...seed } }
            );
            created += 1;
          } else {
            skipped += 1;
          }
        }
      }

      console.log(`   ✅ payment_request seed: ${created} created, ${skipped} skipped (already existed)`);
      console.log('✅ Sprint 5.4 migration complete');
    } catch (error) {
      console.error('❌ Migration 5.4 failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Reverting Sprint 5.4 migration');

    await queryInterface.sequelize.query(
      `DELETE FROM "EventTypes" WHERE "eventName" IN ('Cobrar efectivo', 'Cobrar tarjeta')`
    );
    console.log('   ✅ payment_request EventTypes deleted');

    const desc = await queryInterface.describeTable('Payments');
    if (desc.eventId) {
      try {
        await queryInterface.removeIndex('Payments', 'payments_event_id_idx');
      } catch (_) {}
      await queryInterface.removeColumn('Payments', 'eventId');
      console.log('   ✅ Payments.eventId removed');
    }
  },
};
