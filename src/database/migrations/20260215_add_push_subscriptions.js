const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PushSubscriptions', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      branchId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
          model: 'Branches',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      endpoint: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      p256dh: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      auth: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      userAgent: {
        type: DataTypes.STRING,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // Add unique index on endpoint
    await queryInterface.addIndex('PushSubscriptions', ['endpoint'], {
      unique: true,
      name: 'push_subscriptions_endpoint_unique'
    });

    // Add index on userId
    await queryInterface.addIndex('PushSubscriptions', ['userId'], {
      name: 'push_subscriptions_user_id'
    });

    // Add index on branchId
    await queryInterface.addIndex('PushSubscriptions', ['branchId'], {
      name: 'push_subscriptions_branch_id'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PushSubscriptions');
  }
};
