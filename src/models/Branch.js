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
  },
  modality: {
    type: DataTypes.ENUM('mozo', 'autoservicio'),
    allowNull: false,
    defaultValue: 'mozo'
  },
  // Sprint 5.2: pagos + reviews + Club VIP — config per-branch.
  // Link a la URL de reseña Google Maps. Aparece SIEMPRE post-submit
  // (Google no permite filtrar reviews por nota).
  googleMapsReviewUrl: DataTypes.STRING,
  // Cuando false (default), MP nativo cobra solo consumo; la propina se
  // maneja off-MP. Cuando aprobado el Marketplace MP, split automático
  // consumo→venue / propina→MP mozo.
  mpMarketplaceEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  mpAccessToken: DataTypes.STRING,
  mpRefreshToken: DataTypes.STRING,
  transferAlias: DataTypes.STRING,
  transferCbu: DataTypes.STRING,
  transferTitular: DataTypes.STRING,
  transferCuit: DataTypes.STRING,
  // Orden visual de los métodos de pago (primer item destacado, resto
  // secundarios). El dueño decide si empujar al cliente hacia MP (fee)
  // o transfer/cash (sin fee).
  paymentMethodPriority: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: ['mp', 'transfer', 'modo', 'card', 'cash']
  },
  paymentMethodsEnabled: {
    type: DataTypes.JSON,
    allowNull: false,
    defaultValue: { mp: true, transfer: true, modo: true, card: true, cash: true }
  },
  // Club VIP: text del premio + objetivo de visitas. Acceleration
  // permite endowed-progress: en la visita N == accelerationAtVisit se
  // suma multiplier en lugar de 1.
  clubReward: {
    type: DataTypes.TEXT,
    allowNull: false,
    defaultValue: 'Pinta Gratis'
  },
  clubGoal: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  clubAccelerationAtVisit: DataTypes.INTEGER,
  clubAccelerationMultiplier: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  }
}, {
  paranoid: true,
  timestamps: true
});

module.exports = Branch; 