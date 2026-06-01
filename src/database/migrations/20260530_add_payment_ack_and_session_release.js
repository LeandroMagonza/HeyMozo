// Migration Sprint 5.8: acuse de pagos (CajaShell tab "Acciones") +
// liberación manual de mesa con motivo.
//
// 1) Payments.acknowledgedAt — los pagos que se cierran SIN acción del cajero
//    (MP confirmado por webhook, cash/tarjeta cobrados por el mozo) aparecen
//    como "acuse informativo" en el feed de Acciones. El botón "Entendido"
//    escribe acknowledgedAt para que el acuse no reaparezca en cada poll. Las
//    transferencias (awaiting_validation) NO usan esta columna: desaparecen
//    solas al pasar a paid/failed.
//
// 2) TableSessions.releaseReason + closedByUserId — liberación manual individual
//    (casos edge: walkout, cobro off-system, comp del dueño) donde el balance
//    sigue > 0. Guardamos el motivo opcional y quién la liberó para auditoría.
//
// El runner (src/database/migrate.js) corre sequelize.sync({ alter: true })
// ANTES de estos archivos, así que en la práctica las columnas ya las agrega
// el sync desde los modelos. Esta migration es idempotente y sirve de red para
// entornos donde se corra sin alter (prod). Chequea existencia antes de crear.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: Payments.acknowledgedAt + TableSessions.releaseReason/closedByUserId (Sprint 5.8)');

    try {
      // ─── Payments.acknowledgedAt ───────────────────────────────────────
      const payDesc = await queryInterface.describeTable('Payments');
      if (!payDesc.acknowledgedAt) {
        await queryInterface.addColumn('Payments', 'acknowledgedAt', {
          type: Sequelize.DATE,
          allowNull: true,
        });
        console.log('   ✅ Payments.acknowledgedAt added');
      } else {
        console.log('   ⏭️  Payments.acknowledgedAt already exists, skipping');
      }

      // ─── TableSessions.releaseReason ───────────────────────────────────
      const sessDesc = await queryInterface.describeTable('TableSessions');
      if (!sessDesc.releaseReason) {
        await queryInterface.addColumn('TableSessions', 'releaseReason', {
          type: Sequelize.TEXT,
          allowNull: true,
        });
        console.log('   ✅ TableSessions.releaseReason added');
      } else {
        console.log('   ⏭️  TableSessions.releaseReason already exists, skipping');
      }

      // ─── TableSessions.closedByUserId ──────────────────────────────────
      if (!sessDesc.closedByUserId) {
        await queryInterface.addColumn('TableSessions', 'closedByUserId', {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        });
        console.log('   ✅ TableSessions.closedByUserId added');
      } else {
        console.log('   ⏭️  TableSessions.closedByUserId already exists, skipping');
      }

      console.log('✅ Sprint 5.8 migration complete');
    } catch (error) {
      console.error('❌ Migration 5.8 failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    console.log('🔄 Reverting Sprint 5.8 migration');

    const sessDesc = await queryInterface.describeTable('TableSessions');
    if (sessDesc.closedByUserId) {
      await queryInterface.removeColumn('TableSessions', 'closedByUserId');
      console.log('   ✅ TableSessions.closedByUserId removed');
    }
    if (sessDesc.releaseReason) {
      await queryInterface.removeColumn('TableSessions', 'releaseReason');
      console.log('   ✅ TableSessions.releaseReason removed');
    }

    const payDesc = await queryInterface.describeTable('Payments');
    if (payDesc.acknowledgedAt) {
      await queryInterface.removeColumn('Payments', 'acknowledgedAt');
      console.log('   ✅ Payments.acknowledgedAt removed');
    }
  },
};
