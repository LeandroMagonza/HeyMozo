const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Table = sequelize.define('Table', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tableName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tableDescription: DataTypes.STRING
});

module.exports = Table; 