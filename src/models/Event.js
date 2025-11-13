const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    tableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Tables',
        key: 'id'
      }
    },
    eventTypeId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Allow NULL for backward compatibility and migration support
      references: {
        model: 'EventTypes',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true
    },
    message: {
      type: DataTypes.STRING,
      allowNull: true
    },
    seenAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'Events',
    indexes: [
      {
        fields: ['tableId', 'eventTypeId']
      },
      {
        fields: ['eventTypeId']
      },
      {
        fields: ['tableId', 'seenAt']
      }
    ]
  });

  Event.associate = (models) => {
    Event.belongsTo(models.Table, {
      foreignKey: 'tableId',
      as: 'table'
    });
    
    Event.belongsTo(models.EventType, {
      foreignKey: 'eventTypeId',
      as: 'eventType'
    });
  };

  return Event;
}; 