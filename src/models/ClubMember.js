const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ClubMember = sequelize.define('ClubMember', {
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
    phone: {
      type: DataTypes.STRING,
      allowNull: false
    },
    // Visitas acumuladas en el ciclo actual. Al canjear voucher se resetea
    // a 0 (default). El multiplicador de aceleración se aplica también en
    // el nuevo ciclo (propiedad del programa, no del member).
    visits: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    lastVisitAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'ClubMembers',
    timestamps: true,
    indexes: [
      { fields: ['branchId', 'phone'], unique: true },
      { fields: ['branchId', 'lastVisitAt'] }
    ]
  });

  ClubMember.associate = (models) => {
    ClubMember.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch'
    });
    ClubMember.hasMany(models.ClubVisit, {
      foreignKey: 'clubMemberId',
      as: 'visitLog'
    });
    ClubMember.hasMany(models.Voucher, {
      foreignKey: 'clubMemberId',
      as: 'vouchers'
    });
  };

  return ClubMember;
};
