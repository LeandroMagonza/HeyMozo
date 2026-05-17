const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Device = sequelize.define('Device', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    // ThumbmarkJS hash that identifies this browser/device
    fingerprint: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    // Auto-assigned on first visit, no user input required
    emoji: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    // 100% optional — set only if the device owner explicitly enters a name
    name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    firstSeenAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    // Updated by the invisible heartbeat every 30–60s while the tab is open
    lastHeartbeatAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'Devices',
    timestamps: true
  });

  Device.associate = (models) => {
    Device.hasMany(models.TableSession, {
      foreignKey: 'leaderDeviceId',
      as: 'ledSessions'
    });
    Device.hasMany(models.TableSessionDevice, {
      foreignKey: 'deviceId',
      as: 'sessionParticipations'
    });
    Device.hasMany(models.TableSessionDevice, {
      foreignKey: 'approvedById',
      as: 'grantedApprovals'
    });
  };

  return Device;
};
