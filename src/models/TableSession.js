const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TableSession = sequelize.define('TableSession', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Tables', key: 'id' }
    },
    // active  → session in use
    // zombie  → >30min without heartbeat, not yet closed
    // closed  → completed session (paid, vacated, or admin-closed)
    status: {
      type: DataTypes.ENUM('active', 'zombie', 'closed'),
      allowNull: false,
      defaultValue: 'active'
    },
    openedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Sprint 5.8 — liberación manual individual. Cuando un cajero/owner (o un
    // mozo desde el Piso) libera una mesa con balance > 0 (walkout, cobro
    // off-system, comp del dueño), guardamos el motivo opcional y quién la
    // cerró. Null cuando la sesión se cerró por auto-liberación (balance=0).
    releaseReason: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    closedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
    // The device that created (and leads) this session.
    // Null briefly between session creation and first device attachment.
    leaderDeviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Devices', key: 'id' }
    }
  }, {
    tableName: 'TableSessions',
    timestamps: true,
    indexes: [
      { fields: ['tableId', 'status'] }
    ]
  });

  TableSession.associate = (models) => {
    TableSession.belongsTo(models.Table, {
      foreignKey: 'tableId',
      as: 'table'
    });
    TableSession.belongsTo(models.Device, {
      foreignKey: 'leaderDeviceId',
      as: 'leader'
    });
    TableSession.belongsTo(models.User, {
      foreignKey: 'closedByUserId',
      as: 'closedBy'
    });
    TableSession.hasMany(models.TableSessionDevice, {
      foreignKey: 'tableSessionId',
      as: 'participants'
    });
  };

  return TableSession;
};
