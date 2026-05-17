const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Order = sequelize.define('Order', {
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
    // tableId/branchId denormalizados para queries directas del piso sin
    // joinear TableSession.
    tableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Tables', key: 'id' }
    },
    branchId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Branches', key: 'id' }
    },
    // pending   → confirmado por cliente, sin atender
    // ready     → mozo marcó "LISTO" (entregado / preparado)
    // cancelled → cancelado (no implementado en MVP)
    status: {
      type: DataTypes.ENUM('pending', 'ready', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    createdByDeviceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Devices', key: 'id' }
    },
    // FK al Event "Nuevo Pedido" que dispara la AlertCard purple. Si ese
    // Event sigue unseen (seenAt IS NULL), próximas confirmaciones de la
    // misma sesión mergean OrderItems acá en vez de crear Order nuevo.
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Events', key: 'id' }
    },
    totalCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'Orders',
    timestamps: true,
    indexes: [
      { fields: ['tableSessionId', 'status'] },
      { fields: ['branchId', 'status'] },
      { fields: ['tableId'] },
      { fields: ['eventId'] }
    ]
  });

  Order.associate = (models) => {
    Order.belongsTo(models.TableSession, {
      foreignKey: 'tableSessionId',
      as: 'session'
    });
    Order.belongsTo(models.Table, {
      foreignKey: 'tableId',
      as: 'table'
    });
    Order.belongsTo(models.Branch, {
      foreignKey: 'branchId',
      as: 'branch'
    });
    Order.belongsTo(models.Device, {
      foreignKey: 'createdByDeviceId',
      as: 'createdByDevice'
    });
    Order.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });
    Order.hasMany(models.OrderItem, {
      foreignKey: 'orderId',
      as: 'items'
    });
  };

  return Order;
};
