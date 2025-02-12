const { faker } = require('@faker-js/faker');
const Company = require('../models/Company');
const Branch = require('../models/Branch');
const Table = require('../models/Table');
const Event = require('../models/Event');
const { EventTypes } = require('../constants');

async function seed() {
  try {
    // Crear compañías
    const companies = await Company.bulkCreate([
      {
        name: "Fast Food SRL",
        website: faker.internet.url(),
        menu: faker.internet.url()
      },
      {
        name: "Restaurantes Gourmet SA",
        website: faker.internet.url(),
        menu: faker.internet.url()
      }
    ]);

    // Crear sucursales para cada compañía
    for (const company of companies) {
      const branches = await Branch.bulkCreate([
        {
          name: `Sucursal Centro - ${company.name}`,
          companyId: company.id,
          website: faker.internet.url(),
          menu: faker.internet.url()
        },
        {
          name: `Sucursal Norte - ${company.name}`,
          companyId: company.id,
          website: faker.internet.url(),
          menu: faker.internet.url()
        }
      ]);

      // Crear mesas para cada sucursal
      for (const branch of branches) {
        for (let i = 1; i <= 5; i++) {
          const table = await Table.create({
            tableName: `Mesa ${i}`,
            branchId: branch.id,
            tableDescription: faker.lorem.sentence()
          });

          // Crear eventos para cada mesa
          const currentTime = new Date();
          const events = [];

          // Evento inicial MARK_AVAILABLE
          events.push({
            tableId: table.id,
            type: EventTypes.MARK_AVAILABLE,
            createdAt: new Date(currentTime - 30 * 60000), // 30 minutos atrás
            message: null
          });

          // Agregar eventos aleatorios según el número de mesa
          switch(i) {
            case 2:
              events.push({
                tableId: table.id,
                type: EventTypes.SCAN,
                createdAt: new Date(currentTime - 25 * 60000),
                message: null
              });
              break;
            case 3:
              events.push({
                tableId: table.id,
                type: EventTypes.SCAN,
                createdAt: new Date(currentTime - 20 * 60000),
                message: null
              });
              events.push({
                tableId: table.id,
                type: EventTypes.CALL_WAITER,
                createdAt: new Date(currentTime - 15 * 60000),
                message: null
              });
              break;
            case 4:
              events.push({
                tableId: table.id,
                type: EventTypes.SCAN,
                createdAt: new Date(currentTime - 20 * 60000),
                message: null
              });
              events.push({
                tableId: table.id,
                type: EventTypes.CALL_WAITER,
                createdAt: new Date(currentTime - 10 * 60000),
                message: faker.lorem.sentence()
              });
              break;
            case 5:
              events.push({
                tableId: table.id,
                type: EventTypes.SCAN,
                createdAt: new Date(currentTime - 20 * 60000),
                message: null
              });
              events.push({
                tableId: table.id,
                type: EventTypes.CALL_WAITER,
                createdAt: new Date(currentTime - 15 * 60000),
                message: null
              });
              events.push({
                tableId: table.id,
                type: EventTypes.REQUEST_CHECK,
                createdAt: new Date(currentTime - 5 * 60000),
                message: faker.lorem.sentence()
              });
              break;
          }

          await Event.bulkCreate(events);
        }
      }
    }

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed(); 