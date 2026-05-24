const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClubVisit = sequelize.define('ClubVisit', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    clubMemberId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'ClubMembers', key: 'id' }
    },
    tableSessionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'TableSessions', key: 'id' }
    },
    // > 1 cuando aplica loyalty acceleration. Permite reconstruir el
    // conteo histórico aunque cambien los params del programa.
    visitsAdded: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    }
  }, {
    tableName: 'ClubVisits',
    timestamps: true,
    indexes: [
      { fields: ['clubMemberId'] }
    ]
  });

  ClubVisit.associate = (models) => {
    ClubVisit.belongsTo(models.ClubMember, {
      foreignKey: 'clubMemberId',
      as: 'member'
    });
    ClubVisit.belongsTo(models.TableSession, {
      foreignKey: 'tableSessionId',
      as: 'session'
    });
  };

  return ClubVisit;
};
