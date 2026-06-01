// Migration Sprint 5.11: tabla ClubMemberDevices (link device ↔ member).
//
// Poblada cuando un device hace club-join (deja su teléfono). Habilita la
// detección "próxima visita": al escanear el QR conocemos el device (cookie
// hm_device) pero no el teléfono, así resolvemos el ClubMember y le mostramos
// su Voucher pendiente. Solo el device que tipeó el teléfono queda vinculado.
//
// El runner (src/database/migrate.js) corre sequelize.sync({ alter: true })
// ANTES de estos archivos, así que en dev la tabla ya la crea el sync desde el
// modelo. Esta migration es idempotente y sirve de red para prod (sin alter).

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: ClubMemberDevices (Sprint 5.11)');

    try {
      const tables = await queryInterface.showAllTables();
      const exists = tables
        .map((t) => (typeof t === 'string' ? t : t.tableName))
        .includes('ClubMemberDevices');

      if (!exists) {
        await queryInterface.createTable('ClubMemberDevices', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          clubMemberId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ClubMembers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          deviceId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Devices', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });
        await queryInterface.addIndex('ClubMemberDevices', ['clubMemberId', 'deviceId'], {
          unique: true,
          name: 'club_member_devices_member_device_unique',
        });
        await queryInterface.addIndex('ClubMemberDevices', ['deviceId'], {
          name: 'club_member_devices_device_idx',
        });
        console.log('   ✅ ClubMemberDevices table created');
      } else {
        console.log('   ⏭️  ClubMemberDevices already exists, skipping');
      }
      console.log('✅ ClubMemberDevices migration complete');
    } catch (error) {
      console.error('❌ ClubMemberDevices migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    console.log('🔄 Reverting ClubMemberDevices');
    await queryInterface.dropTable('ClubMemberDevices');
    console.log('   ✅ ClubMemberDevices removed');
  },
};
