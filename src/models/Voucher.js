const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Voucher = sequelize.define('Voucher', {
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
    // Único globalmente. Se muestra al cliente para canjear (input/scanner
    // en OpShell del mozo).
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    // Snapshot del Branch.clubReward al momento de generar. Si el dueño
    // cambia el premio, los vouchers ya emitidos mantienen su texto.
    reward: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    redeemedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    redeemedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    }
  }, {
    tableName: 'Vouchers',
    timestamps: true,
    indexes: [
      { fields: ['clubMemberId'] },
      { fields: ['code'], unique: true },
      { fields: ['redeemedAt'] }
    ]
  });

  Voucher.associate = (models) => {
    Voucher.belongsTo(models.ClubMember, {
      foreignKey: 'clubMemberId',
      as: 'member'
    });
    Voucher.belongsTo(models.User, {
      foreignKey: 'redeemedByUserId',
      as: 'redeemedBy'
    });
  };

  return Voucher;
};
