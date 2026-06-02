const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  // Vínculo device → member, poblado cuando un device hace club-join (deja su
  // teléfono). Sirve para la detección "próxima visita" (Sprint 5.11): al
  // escanear el QR sabemos el device (cookie hm_device) pero no el teléfono,
  // así que resolvemos el ClubMember por este link y le mostramos su Voucher
  // pendiente. Solo el device que efectivamente tipeó el teléfono queda
  // vinculado — un comensal de la misma mesa NO ve el premio ajeno.
  const ClubMemberDevice = sequelize.define('ClubMemberDevice', {
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
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Devices', key: 'id' }
    }
  }, {
    tableName: 'ClubMemberDevices',
    timestamps: true,
    indexes: [
      { fields: ['clubMemberId', 'deviceId'], unique: true },
      { fields: ['deviceId'] }
    ]
  });

  ClubMemberDevice.associate = (models) => {
    ClubMemberDevice.belongsTo(models.ClubMember, {
      foreignKey: 'clubMemberId',
      as: 'member'
    });
    ClubMemberDevice.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      as: 'device'
    });
  };

  return ClubMemberDevice;
};
