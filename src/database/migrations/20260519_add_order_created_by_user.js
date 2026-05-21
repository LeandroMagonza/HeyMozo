// Migration Sprint 4.1: agrega Order.createdByUserId.
//
// Cuando el mozo carga un pedido en persona (vs el cliente que confirma desde
// su device), `createdByDeviceId` queda en NULL y se registra el User que lo
// cargó en `createdByUserId`. Sirve para auditoría — ver qué mozo entró cada
// pedido. Nullable porque los pedidos del cliente no tienen User asociado.
//
// Idempotente: chequea existencia de la columna antes de agregar.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: add Order.createdByUserId');

    const tableDef = await queryInterface.describeTable('Orders');
    if (tableDef.createdByUserId) {
      console.log('   ⏭  Orders.createdByUserId already exists, skipping');
      return;
    }

    await queryInterface.addColumn('Orders', 'createdByUserId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    console.log('   ✅ Orders.createdByUserId column added');

    await queryInterface.addIndex('Orders', ['createdByUserId'], {
      name: 'orders_created_by_user_idx'
    });
    console.log('   ✅ orders_created_by_user_idx created');

    console.log('✅ Migration complete: Order.createdByUserId');
  },

  down: async (queryInterface) => {
    console.log('⚠️  20260519_add_order_created_by_user: rolling back');

    await queryInterface.removeIndex('Orders', 'orders_created_by_user_idx').catch(() => {});
    await queryInterface.removeColumn('Orders', 'createdByUserId').catch(() => {});

    console.log('✅ Rolled back: Order.createdByUserId removed');
  }
};
