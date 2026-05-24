const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Review = sequelize.define('Review', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tableSessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'TableSessions', key: 'id' }
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Payments', key: 'id' }
    },
    stars: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: { min: 1, max: 5 }
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    // Híbrido D: auto-sugiere el mozo más activo de la sesión (el que
    // ingresó más Orders); el cliente puede cambiarlo a otro staff que
    // tocó la mesa.
    waiterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
    // True si el cliente clickeó el link "Dejá tu valoración en Google
    // Maps" post-submit. El link aparece SIEMPRE (no por umbral de stars).
    derivedToGoogle: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'Reviews',
    timestamps: true,
    indexes: [
      { fields: ['tableSessionId'] },
      { fields: ['waiterId'] }
    ]
  });

  Review.associate = (models) => {
    Review.belongsTo(models.TableSession, {
      foreignKey: 'tableSessionId',
      as: 'session'
    });
    Review.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment'
    });
    Review.belongsTo(models.User, {
      foreignKey: 'waiterId',
      as: 'waiter'
    });
    Review.belongsToMany(models.ReviewTag, {
      through: models.ReviewTagAssignment,
      foreignKey: 'reviewId',
      otherKey: 'reviewTagId',
      as: 'tags'
    });
  };

  return Review;
};
