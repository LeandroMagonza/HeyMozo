const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

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
    website: DataTypes.STRING,
    menu: DataTypes.STRING,
    backgroundImage: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL de la imagen de fondo personalizada para UserScreen",
    },
    fontColor: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "#ffffff",
      comment: "Color de fuente para los textos en UserScreen",
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
