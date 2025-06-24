const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permission = sequelize.define('Permission', {
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
  resourceType: {
    type: DataTypes.ENUM('company', 'branch', 'table'),
    allowNull: false
  },
  resourceId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  permissionLevel: {
    type: DataTypes.ENUM('view', 'edit'),
    allowNull: false,
    defaultValue: 'view'
  }
}, {
  paranoid: true, // Enable soft deletes
  indexes: [
    // Create a unique index to prevent duplicate permissions
    {
      unique: true,
      fields: ['userId', 'resourceType', 'resourceId']
    }
  ]
});

module.exports = Permission; 