const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Company = sequelize.define('Company', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  website: DataTypes.STRING,
  menu: DataTypes.STRING,
  branchIds: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  paranoid: true,
  timestamps: true
});

module.exports = Company; 