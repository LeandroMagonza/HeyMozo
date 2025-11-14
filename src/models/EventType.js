const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventType = sequelize.define('EventType', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    companyId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Companies',
        key: 'id'
      }
    },
    eventName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    userColor: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      },
      defaultValue: '#007bff'
    },
    userFontColor: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      },
      defaultValue: '#ffffff'
    },
    userIcon: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 50]
      },
      defaultValue: null
    },
    stateName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    adminColor: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      },
      defaultValue: '#ffc107'
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: 0,
        max: 100
      }
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    systemEventType: {
      type: DataTypes.ENUM('SCAN', 'MARK_SEEN', 'OCCUPY', 'VACATE'),
      allowNull: true
      // Unique constraint is defined in indexes below for proper composite uniqueness
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    }
  }, {
    tableName: 'EventTypes',
    paranoid: true,
    deletedAt: 'deletedAt',
    indexes: [
      {
        fields: ['companyId', 'isActive']
      },
      {
        fields: ['companyId', 'priority', 'isActive']
      },
      {
        unique: true,
        fields: ['companyId', 'systemEventType'],
        where: {
          systemEventType: {
            [sequelize.Sequelize.Op.ne]: null
          }
        }
      }
    ],
    hooks: {
      beforeDestroy: (eventType) => {
        if (eventType.systemEventType) {
          throw new Error('System events cannot be deleted');
        }
      },
      beforeUpdate: (eventType, options) => {
        if (eventType.changed('systemEventType') && eventType._previousDataValues.systemEventType) {
          throw new Error('System event type cannot be changed');
        }
      }
    }
  });

  EventType.associate = (models) => {
    EventType.belongsTo(models.Company, {
      foreignKey: 'companyId',
      as: 'company'
    });
    
    EventType.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    EventType.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    EventType.hasMany(models.EventConfiguration, {
      foreignKey: 'eventTypeId',
      as: 'configurations'
    });

    EventType.hasMany(models.Event, {
      foreignKey: 'eventTypeId',
      as: 'events'
    });
  };

  return EventType;
};