const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const { VALIDATION_PATTERNS } = require('../constants');

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
  website: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value) {
        if (value && value.trim() !== '' && !VALIDATION_PATTERNS.URL.test(value)) {
          throw new Error('Website must be a valid HTTP or HTTPS URL');
        }
      }
    }
  },
  menu: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value) {
        if (value && value.trim() !== '' && !VALIDATION_PATTERNS.URL.test(value)) {
          throw new Error('Menu must be a valid HTTP or HTTPS URL');
        }
      }
    }
  },
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value) {
        if (value && value.trim() !== '' && !VALIDATION_PATTERNS.URL.test(value)) {
          throw new Error('Logo must be a valid HTTP or HTTPS URL');
        }
      }
    }
  },
  textColor: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isHexColorOrEmpty(value) {
        if (value && value.trim() !== '' && !VALIDATION_PATTERNS.HEX_COLOR.test(value)) {
          throw new Error('Text color must be a valid hex color (e.g., #ffffff or #fff)');
        }
      }
    }
  },
  fontFamily: DataTypes.STRING,
  qrBackgroundImage: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      isUrlOrEmpty(value) {
        if (value && value.trim() !== '' && !VALIDATION_PATTERNS.URL.test(value)) {
          throw new Error('QR background image must be a valid HTTP or HTTPS URL');
        }
      }
    }
  },
  tableIds: {
    type: DataTypes.JSON,
    defaultValue: []
  }
}, {
  paranoid: true,
  timestamps: true
});

module.exports = Branch; 