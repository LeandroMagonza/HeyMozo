const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TableSessionDevice = sequelize.define('TableSessionDevice', {
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
    deviceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Devices', key: 'id' }
    },
    isLeader: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Per-device heartbeat within this session (distinct from Device.lastHeartbeatAt)
    lastHeartbeatAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Which device approved this one into the session (null = first device / leader)
    approvedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Devices', key: 'id' }
    }
  }, {
    tableName: 'TableSessionDevices',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['tableSessionId', 'deviceId']
      },
      { fields: ['deviceId'] }
    ]
  });

  TableSessionDevice.associate = (models) => {
    TableSessionDevice.belongsTo(models.TableSession, {
      foreignKey: 'tableSessionId',
      as: 'session'
    });
    TableSessionDevice.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      as: 'device'
    });
    TableSessionDevice.belongsTo(models.Device, {
      foreignKey: 'approvedById',
      as: 'approvedBy'
    });
  };

  return TableSessionDevice;
};
