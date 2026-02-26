const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PushSubscription = sequelize.define('PushSubscription', {
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
    }
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Branches',
      key: 'id'
    },
    comment: 'Branch to receive notifications for (null = all branches user has access to)'
  },
  endpoint: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  p256dh: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Public key for push encryption'
  },
  auth: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Auth secret for push encryption'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  paranoid: true,
  indexes: [
    {
      unique: true,
      fields: ['endpoint'],
      name: 'push_subscriptions_endpoint_unique'
    },
    {
      fields: ['userId'],
      name: 'push_subscriptions_user_id'
    },
    {
      fields: ['branchId'],
      name: 'push_subscriptions_branch_id'
    }
  ]
});

PushSubscription.associate = function(models) {
  PushSubscription.belongsTo(models.User, { foreignKey: 'userId' });
  PushSubscription.belongsTo(models.Branch, { foreignKey: 'branchId' });
};

module.exports = PushSubscription;
