const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const EventConfiguration = sequelize.define('EventConfiguration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    resourceType: {
      type: DataTypes.ENUM('company', 'branch', 'location'),
      allowNull: false
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    eventTypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'EventTypes',
        key: 'id'
      }
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    // Override fields - null means inherit from parent/EventType
    eventName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    stateName: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 100]
      }
    },
    userColor: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    userFontColor: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    userIcon: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [2, 50]
      }
    },
    adminColor: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
      }
    },
    priority: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0,
        max: 100
      }
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
    tableName: 'EventConfigurations',
    indexes: [
      {
        unique: true,
        fields: ['resourceType', 'resourceId', 'eventTypeId']
      },
      {
        fields: ['resourceType', 'resourceId']
      }
    ],
    validate: {
      resourceIdPositive() {
        if (this.resourceId <= 0) {
          throw new Error('Resource ID must be positive');
        }
      }
    }
  });

  EventConfiguration.associate = (models) => {
    EventConfiguration.belongsTo(models.EventType, {
      foreignKey: 'eventTypeId',
      as: 'eventType'
    });
    
    EventConfiguration.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    
    EventConfiguration.belongsTo(models.User, {
      foreignKey: 'updatedBy',
      as: 'updater'
    });

    // Polymorphic associations based on resourceType
    EventConfiguration.belongsTo(models.Company, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'company',
      scope: {
        resourceType: 'company'
      }
    });

    EventConfiguration.belongsTo(models.Branch, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'branch',
      scope: {
        resourceType: 'branch'
      }
    });

    EventConfiguration.belongsTo(models.Table, {
      foreignKey: 'resourceId',
      constraints: false,
      as: 'location',
      scope: {
        resourceType: 'location'
      }
    });
  };

  return EventConfiguration;
};