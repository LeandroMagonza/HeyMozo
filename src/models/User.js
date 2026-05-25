const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  role: {
    type: DataTypes.ENUM('waiter', 'cashier', 'owner', 'platformAdmin'),
    allowNull: false,
    defaultValue: 'owner'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastLogout: {
    type: DataTypes.DATE,
    allowNull: true
  },
  // Sprint 5.2: alias MP para mostrar al cliente como destino de propina
  // (cash/transfer) cuando MP nativo aún no tiene Marketplace activado.
  mpAlias: DataTypes.STRING,
  // Para split post-Marketplace: cada mozo conecta su MP via OAuth desde
  // su auto-perfil (datos bancarios privados, no centralizado por dueño).
  mpAccessToken: DataTypes.STRING,
  mpRefreshToken: DataTypes.STRING
}, {
  paranoid: true // Enable soft deletes
});

module.exports = User; 