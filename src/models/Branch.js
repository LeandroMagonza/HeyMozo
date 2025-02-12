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
  menu: DataTypes.STRING,
  logo: DataTypes.STRING,
  textColor: DataTypes.STRING,
  fontFamily: DataTypes.STRING,
  qrBackgroundImage: DataTypes.STRING,
  tableIds: {
    type: DataTypes.JSON,
    defaultValue: []
  }
});

module.exports = Branch; 