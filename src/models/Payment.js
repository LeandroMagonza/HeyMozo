const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
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
      allowNull: true,
      references: { model: 'Devices', key: 'id' }
    },
    // Consumo. El balance de la mesa se cierra cuando
    // sum(subtotalCents de Payments paid) >= sum(Orders.totalCents). La
    // propina NO entra en este cálculo.
    subtotalCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    // Propina. NUNCA pasa por la cuenta del dueño: cash/posnet → mozo cobra
    // off-system; MP pre-Marketplace → PostPagoPage muestra "Propina
    // pendiente"; MP post-Marketplace → split a la cuenta MP del mozo.
    tipCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    method: {
      type: DataTypes.ENUM('mp_native', 'transfer', 'modo', 'card_terminal', 'cash'),
      allowNull: false
    },
    // pending              → recién creado, esperando acción
    // awaiting_validation  → transfer cargada por cliente, esperando cajero
    // paid                 → confirmado (auto en MP, manual en transfer/cash/card)
    // failed               → rechazado / cancelado por cliente
    // refunded             → ENUM existe pero sin UI en MVP
    status: {
      type: DataTypes.ENUM('pending', 'awaiting_validation', 'paid', 'failed', 'refunded'),
      allowNull: false,
      defaultValue: 'pending'
    },
    mpPaymentId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    mpRawPayload: {
      type: DataTypes.JSONB,
      allowNull: true
    },
    proofUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    // Cajero (transfer) o mozo (cash/card) que cerró el cobro. Base para
    // ranking de propinas por mozo (UI en Sprint 8).
    collectedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Users', key: 'id' }
    },
    cashTenderedCents: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    // Alerta que dispara el cobro en OpShell (cash/card pending). Permite a
    // /branches/:id/active-alerts surface el Payment con el Event y al hacer
    // POST /payments/:id/collect marcar el Event seenAt en una transacción.
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'Events', key: 'id' }
    }
  }, {
    tableName: 'Payments',
    timestamps: true,
    indexes: [
      { fields: ['tableSessionId', 'status'] },
      { fields: ['status'] },
      { fields: ['mpPaymentId'] },
      { fields: ['eventId'] }
    ]
  });

  Payment.associate = (models) => {
    Payment.belongsTo(models.TableSession, {
      foreignKey: 'tableSessionId',
      as: 'session'
    });
    Payment.belongsTo(models.Device, {
      foreignKey: 'deviceId',
      as: 'device'
    });
    Payment.belongsTo(models.User, {
      foreignKey: 'collectedByUserId',
      as: 'collectedBy'
    });
    Payment.hasOne(models.Review, {
      foreignKey: 'paymentId',
      as: 'review'
    });
    Payment.belongsTo(models.Event, {
      foreignKey: 'eventId',
      as: 'event'
    });
  };

  return Payment;
};
