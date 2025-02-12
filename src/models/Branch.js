const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Branch = sequelize.define('Branch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  companyId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  website: DataTypes.STRING,
  menu: DataTypes.STRING
});

module.exports = Branch; 