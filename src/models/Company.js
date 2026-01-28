const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const { VALIDATION_PATTERNS } = require("../constants");

const Company = sequelize.define(
  "Company",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
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
    backgroundImage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL de la imagen de fondo personalizada para UserScreen",
      validate: {
        isUrlOrEmpty(value) {
          if (value && value.trim() !== '' && !VALIDATION_PATTERNS.URL.test(value)) {
            throw new Error('Background image must be a valid HTTP or HTTPS URL');
          }
        }
      }
    },
    fontColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "#ffffff",
      comment: "Color de fuente para los textos en UserScreen",
      validate: {
        isHexColorOrEmpty(value) {
          if (value && value.trim() !== '' && !VALIDATION_PATTERNS.HEX_COLOR.test(value)) {
            throw new Error('Font color must be a valid hex color (e.g., #ffffff or #fff)');
          }
        }
      }
    },
    branchIds: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
  },
  {
    paranoid: true,
    timestamps: true,
  }
);

module.exports = Company;
