const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReviewTag = sequelize.define('ReviewTag', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Branches', key: 'id' }
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    emoji: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // MVP solo 'negative'. La columna está para abrir paso a tags
    // positivos/neutrales en v1.5+ sin migration.
    sentiment: {
      type: DataTypes.ENUM('positive', 'negative', 'neutral'),
      allowNull: false,
      defaultValue: 'negative'
    },
    // MVP solo 'general'. Permite separar por categoría (comida, bebida,
    // servicio, ambiente) en v1.5+ sin migration.
    category: {
      type: DataTypes.ENUM('general', 'food', 'drink', 'service', 'ambience'),
      allowNull: false,
      defaultValue: 'general'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'ReviewTags',
    timestamps: true,
    indexes: [
      { fields: ['branchId', 'isActive'] }
    ]
  });

  ReviewTag.associate = (models) => {
    ReviewTag.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch'
    });
    ReviewTag.belongsToMany(models.Review, {
      through: models.ReviewTagAssignment,
      foreignKey: 'reviewTagId',
      otherKey: 'reviewId',
      as: 'reviews'
    });
  };

  return ReviewTag;
};
