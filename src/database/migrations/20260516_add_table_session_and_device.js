// Migration: creates Devices, TableSessions, and TableSessionDevices tables.
//
// Devices     → browser/device identified by ThumbmarkJS fingerprint
// TableSessions → one active session per table at a time
// TableSessionDevices → participation of a device in a session (with heartbeat + approval chain)
//
// Idempotent: each step checks state before writing. Safe to run 2×.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Migration: add Device + TableSession + TableSessionDevice');

    // Step 1: Devices
    const tables = await queryInterface.showAllTables();

    if (!tables.includes('Devices')) {
      await queryInterface.createTable('Devices', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        fingerprint: {
          type: Sequelize.STRING(64),
          allowNull: false,
          unique: true
        },
        emoji: {
          type: Sequelize.STRING(10),
          allowNull: false
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        firstSeenAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        lastHeartbeatAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      console.log('   ✅ Devices table created');
    } else {
      console.log('   ⏭  Devices already exists, skipping');
    }

    // Step 2: ENUM for TableSession.status
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_TableSessions_status" AS ENUM('active', 'zombie', 'closed');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('   ✅ enum_TableSessions_status ready');

    // Step 3: TableSessions
    if (!tables.includes('TableSessions')) {
      await queryInterface.createTable('TableSessions', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        tableId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Tables', key: 'id' },
          onDelete: 'RESTRICT'
        },
        status: {
          type: Sequelize.ENUM('active', 'zombie', 'closed'),
          allowNull: false,
          defaultValue: 'active'
        },
        openedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        closedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        // Set after the first device attaches; briefly null on creation
        leaderDeviceId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Devices', key: 'id' },
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      console.log('   ✅ TableSessions table created');

      await queryInterface.addIndex('TableSessions', ['tableId', 'status'], {
        name: 'table_sessions_table_status_idx'
      });
      console.log('   ✅ TableSessions index added');
    } else {
      console.log('   ⏭  TableSessions already exists, skipping');
    }

    // Step 4: TableSessionDevices (junction)
    if (!tables.includes('TableSessionDevices')) {
      await queryInterface.createTable('TableSessionDevices', {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true,
          allowNull: false
        },
        tableSessionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'TableSessions', key: 'id' },
          onDelete: 'CASCADE'
        },
        deviceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'Devices', key: 'id' },
          onDelete: 'RESTRICT'
        },
        isLeader: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        joinedAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        lastHeartbeatAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        // Which device approved this one; null = first device (self-approved leader)
        approvedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'Devices', key: 'id' },
          onDelete: 'SET NULL'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false
        }
      });
      console.log('   ✅ TableSessionDevices table created');

      await queryInterface.addIndex('TableSessionDevices', ['tableSessionId', 'deviceId'], {
        unique: true,
        name: 'table_session_devices_unique_idx'
      });
      await queryInterface.addIndex('TableSessionDevices', ['deviceId'], {
        name: 'table_session_devices_device_idx'
      });
      console.log('   ✅ TableSessionDevices indexes added');
    } else {
      console.log('   ⏭  TableSessionDevices already exists, skipping');
    }

    console.log('✅ Migration complete: Device + TableSession + TableSessionDevice');
  },

  down: async (queryInterface) => {
    // Drop in reverse dependency order
    await queryInterface.dropTable('TableSessionDevices').catch(() => {});
    await queryInterface.dropTable('TableSessions').catch(() => {});
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_TableSessions_status";`
    );
    await queryInterface.dropTable('Devices').catch(() => {});
    console.log('✅ Rolled back: Devices + TableSessions + TableSessionDevices removed');
  }
};
