const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ReviewTagAssignment = sequelize.define('ReviewTagAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    reviewId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Reviews', key: 'id' }
    },
    reviewTagId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ReviewTags', key: 'id' }
    }
  }, {
    tableName: 'ReviewTagAssignments',
    timestamps: true,
    indexes: [
      { fields: ['reviewId', 'reviewTagId'], unique: true }
    ]
  });

  return ReviewTagAssignment;
};
