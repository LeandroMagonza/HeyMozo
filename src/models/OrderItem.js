const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define('OrderItem', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'Orders', key: 'id' }
    },
    // Nullable: si el admin borra el MenuItem (soft delete) los pedidos
    // pasados conservan el dato via snapshots.
    menuItemId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'MenuItems', key: 'id' }
    },
    // Snapshots — el pedido se congela al confirmar. Cambios futuros de
    // nombre/descripción/precio del MenuItem NO mutan pedidos pasados.
    nameSnapshot: {
      type: DataTypes.STRING,
      allowNull: false
    },
    descriptionSnapshot: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    unitPriceCents: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'OrderItems',
    timestamps: true,
    indexes: [
      { fields: ['orderId'] },
      { fields: ['menuItemId'] }
    ]
  });

  OrderItem.associate = (models) => {
    OrderItem.belongsTo(models.Order, {
      foreignKey: 'orderId',
      as: 'order'
    });
    OrderItem.belongsTo(models.MenuItem, {
      foreignKey: 'menuItemId',
      as: 'menuItem'
    });
  };

  return OrderItem;
};
