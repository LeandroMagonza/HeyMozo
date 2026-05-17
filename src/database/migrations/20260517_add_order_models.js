// Migration Sprint 3.1: introduce los modelos Order + OrderItem.
//
// Order vive a nivel TableSession (una sesión puede tener varios pedidos a lo
// largo de su vida útil). `tableId` + `branchId` se denormalizan para queries
// directas del piso. `eventId` apunta al Event "Nuevo Pedido" que dispara la
// AlertCard purple del mozo — esa es la pieza que permite mergear pedidos
// cuando la alerta todavía no fue vista.
//
// OrderItem captura snapshots (`nameSnapshot`, `descriptionSnapshot`,
// `unitPriceCents`) al momento de confirmar. Crítico: si el admin cambia el
// precio de un MenuItem, los pedidos pasados NO mutan. `menuItemId` queda
// nullable para soportar borrado (paranoid) del ítem fuente sin perder
// historial de pedidos.
//
// Idempotente: chequea existencia antes de crear tablas y tipos ENUM.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: Order + OrderItem models');

    try {
      const existingTables = await queryInterface.showAllTables();
      const tablesLower = existingTables.map((t) => String(t).toLowerCase());

      // Paso 1: ENUM para Order.status
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Orders_status" AS ENUM('pending', 'ready', 'cancelled');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      console.log('   ✅ enum_Orders_status ready');

      // Paso 2: Orders
      if (!tablesLower.includes('orders')) {
        console.log('🏗️  Step 2: creating Orders table...');
        await queryInterface.createTable('Orders', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          tableSessionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'TableSessions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          // Denormalizados para queries directas del piso sin joinear TableSession.
          tableId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Tables', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          branchId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Branches', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          status: {
            type: Sequelize.ENUM('pending', 'ready', 'cancelled'),
            allowNull: false,
            defaultValue: 'pending',
          },
          // Device que confirmó el pedido (cliente que tocó "Confirmar").
          createdByDeviceId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Devices', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          // Event "Nuevo Pedido" que dispara la AlertCard purple del mozo.
          // Si el Event sigue unseen, próximas confirmaciones de esta sesión
          // mergean OrderItems en este Order en vez de crear uno nuevo.
          eventId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Events', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          totalCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('Orders', ['tableSessionId', 'status'], {
          name: 'orders_session_status_idx',
        });
        await queryInterface.addIndex('Orders', ['branchId', 'status'], {
          name: 'orders_branch_status_idx',
        });
        await queryInterface.addIndex('Orders', ['tableId'], {
          name: 'orders_table_idx',
        });
        await queryInterface.addIndex('Orders', ['eventId'], {
          name: 'orders_event_idx',
        });
        console.log('   ✅ Orders table created');
      } else {
        console.log('⏭️  Step 2: Orders already exists, skipping');
      }

      // Paso 3: OrderItems
      if (!tablesLower.includes('orderitems')) {
        console.log('🏗️  Step 3: creating OrderItems table...');
        await queryInterface.createTable('OrderItems', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          orderId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Orders', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          // Nullable: el MenuItem puede borrarse (soft delete) sin perder
          // historial del pedido. Los snapshots cubren el caso.
          menuItemId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'MenuItems', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          // Snapshots del MenuItem en el momento de confirmar.
          nameSnapshot: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          descriptionSnapshot: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          unitPriceCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          qty: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          notes: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('OrderItems', ['orderId'], {
          name: 'orderitems_order_idx',
        });
        await queryInterface.addIndex('OrderItems', ['menuItemId'], {
          name: 'orderitems_menuitem_idx',
        });
        console.log('   ✅ OrderItems table created');
      } else {
        console.log('⏭️  Step 3: OrderItems already exists, skipping');
      }

      console.log('✅ Migration completed: Order + OrderItem models');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    console.log('⚠️  20260517_add_order_models: rolling back');

    await queryInterface.dropTable('OrderItems').catch(() => {});
    await queryInterface.dropTable('Orders').catch(() => {});
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_Orders_status";`
    );
    console.log('✅ Rolled back: Orders + OrderItems removed');
  },
};
