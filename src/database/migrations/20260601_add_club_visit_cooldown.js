// Migration Sprint 5.10-hardening: Branch.clubVisitCooldownHours.
//
// Ventana (en horas) durante la cual NO se vuelve a contar una visita del Club
// para el mismo member. Default 12h: evita que la misma persona sume >1 visita
// el mismo día (raro volver a comer el mismo día). El venue lo baja a 4-6h para
// contar almuerzo+cena por separado, o lo sube a 24h para "1 por día" estricto.
//
// El runner (src/database/migrate.js) corre sequelize.sync({ alter: true })
// ANTES de estos archivos, así que en dev la columna ya la agrega el sync desde
// el modelo. Esta migration es idempotente y sirve de red para prod (sin alter).

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: Branch.clubVisitCooldownHours (Sprint 5.10-hardening)');

    try {
      const desc = await queryInterface.describeTable('Branches');
      if (!desc.clubVisitCooldownHours) {
        await queryInterface.addColumn('Branches', 'clubVisitCooldownHours', {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 12,
        });
        console.log('   ✅ Branches.clubVisitCooldownHours added (default 12)');
      } else {
        console.log('   ⏭️  Branches.clubVisitCooldownHours already exists, skipping');
      }
      console.log('✅ Club visit cooldown migration complete');
    } catch (error) {
      console.error('❌ Club visit cooldown migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    console.log('🔄 Reverting Branch.clubVisitCooldownHours');
    const desc = await queryInterface.describeTable('Branches');
    if (desc.clubVisitCooldownHours) {
      await queryInterface.removeColumn('Branches', 'clubVisitCooldownHours');
      console.log('   ✅ Branches.clubVisitCooldownHours removed');
    }
  },
};
