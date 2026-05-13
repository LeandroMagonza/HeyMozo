// Migration: agrega customerDisplay a EventTypes, traduce los defaults a
// español y siembra los 4 quick actions configurables (Hielo, Condimentos,
// Servilletas, Limpiar Mesa) para todas las companies existentes.
//
// Idempotente: cada paso valida estado antes de escribir.

const { DataTypes } = require('sequelize');

const SPANISH_EVENT_NAMES = {
  'Location Scanned': 'Página Escaneada',
  'Acknowledged': 'Visto',
  'Occupy Location': 'Ocupar Mesa',
  'Vacate Location': 'Mesa Disponible',
  'Call Waiter': 'Llamar al Mozo',
  'Request Check': 'Pedir Cuenta',
  'Call Manager': 'Llamar al Encargado',
};

const SPANISH_STATE_NAMES = {
  'Scanned': 'Escaneado',
  'Seen': 'Visto',
  'Occupied': 'Ocupada',
  'Available': 'Disponible',
  'Waiter Called': 'Mozo llamado',
  'Check Requested': 'Cuenta pedida',
  'Manager Called': 'Encargado llamado',
};

// Cada quick action lista TODOS los nombres bajo los que pudo haber sido
// creado a lo largo de las migrations: el original ("Pedir Hielo") y el
// renombrado por 20260512 ("Hielo"). El check de existencia mira por
// CUALQUIERA — sin esto, runs subsiguientes de `npm run migrate` crearían
// duplicados.
const QUICK_ACTION_DEFAULTS = [
  {
    aliases: ['Pedir Hielo', 'Hielo'],
    eventName: 'Pedir Hielo',
    stateName: 'Solicitado',
    userColor: '#06b6d4',
    userFontColor: '#ffffff',
    userIcon: 'FaSnowflake',
    adminColor: '#fef3c7',
    priority: 35,
  },
  {
    aliases: ['Pedir Condimentos', 'Condimentos'],
    eventName: 'Pedir Condimentos',
    stateName: 'Solicitado',
    userColor: '#f59e0b',
    userFontColor: '#ffffff',
    userIcon: 'FaPepperHot',
    adminColor: '#fef3c7',
    priority: 32,
  },
  {
    aliases: ['Pedir Servilletas', 'Servilletas'],
    eventName: 'Pedir Servilletas',
    stateName: 'Solicitado',
    userColor: '#94a3b8',
    userFontColor: '#ffffff',
    userIcon: 'FaScroll',
    adminColor: '#fef3c7',
    priority: 30,
  },
  {
    aliases: ['Limpiar Mesa', 'Limpiar mesa'],
    eventName: 'Limpiar Mesa',
    stateName: 'Solicitado',
    userColor: '#10b981',
    userFontColor: '#ffffff',
    userIcon: 'FaBroom',
    adminColor: '#fef3c7',
    priority: 28,
  },
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: customerDisplay + español + quick actions');

    try {
      // ── 1) Add customerDisplay column to EventTypes ──────────────────────
      console.log('📋 Step 1: adding customerDisplay column to EventTypes...');
      try {
        await queryInterface.addColumn('EventTypes', 'customerDisplay', {
          type: DataTypes.ENUM('quick_action', 'main_action', 'hidden'),
          allowNull: true,
          defaultValue: null,
        });
        console.log('   ✅ Column customerDisplay added');
      } catch (error) {
        const msg = (error.message || '').toLowerCase();
        if (
          msg.includes('already exists') ||
          msg.includes('ya existe') ||
          msg.includes('duplicate column') ||
          msg.includes('duplicate_column')
        ) {
          console.log('   ℹ️  Column customerDisplay already exists, skipping');
        } else {
          throw error;
        }
      }

      // ── 2) Rename English defaults to Spanish ────────────────────────────
      console.log('🌎 Step 2: renaming default English eventNames to Spanish...');
      for (const [en, es] of Object.entries(SPANISH_EVENT_NAMES)) {
        await queryInterface.sequelize.query(
          'UPDATE "EventTypes" SET "eventName" = :es WHERE "eventName" = :en',
          { replacements: { es, en } }
        );
        console.log(`   ✏️  eventName "${en}" → "${es}"`);
      }

      console.log('🌎 Step 2b: renaming default English stateNames to Spanish...');
      for (const [en, es] of Object.entries(SPANISH_STATE_NAMES)) {
        await queryInterface.sequelize.query(
          'UPDATE "EventTypes" SET "stateName" = :es WHERE "stateName" = :en',
          { replacements: { es, en } }
        );
        console.log(`   ✏️  stateName "${en}" → "${es}"`);
      }

      // ── 3) Populate customerDisplay for existing rows ────────────────────
      console.log('🎯 Step 3: populating customerDisplay for existing rows...');

      // 3a) System events → hidden
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "customerDisplay" = 'hidden'
          WHERE "systemEventType" IS NOT NULL
            AND "customerDisplay" IS NULL`
      );
      console.log('   ✅ system events → hidden');

      // 3b) Llamar al Mozo → main_action
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "customerDisplay" = 'main_action'
          WHERE "eventName" = 'Llamar al Mozo'
            AND "systemEventType" IS NULL
            AND "customerDisplay" IS NULL`
      );
      console.log('   ✅ Llamar al Mozo → main_action');

      // 3c) Pedir Cuenta → hidden (será el botón Pagar en F2)
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "customerDisplay" = 'hidden'
          WHERE "eventName" = 'Pedir Cuenta'
            AND "systemEventType" IS NULL
            AND "customerDisplay" IS NULL`
      );
      console.log('   ✅ Pedir Cuenta → hidden');

      // 3d) Llamar al Encargado → hidden (oculto en F1)
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "customerDisplay" = 'hidden'
          WHERE "eventName" = 'Llamar al Encargado'
            AND "systemEventType" IS NULL
            AND "customerDisplay" IS NULL`
      );
      console.log('   ✅ Llamar al Encargado → hidden');

      // ── 4) Create 4 quick action EventTypes per existing company ─────────
      console.log('🏢 Step 4: creating quick action EventTypes for existing companies...');
      const companies = await queryInterface.sequelize.query(
        `SELECT id FROM "Companies" WHERE "deletedAt" IS NULL`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      console.log(`   📊 Found ${companies.length} active companies`);

      for (const company of companies) {
        const companyId = company.id;

        for (const qa of QUICK_ACTION_DEFAULTS) {
          // Chequea por TODOS los nombres conocidos (originales y renombrados
          // por migrations posteriores). Sin esto cada `npm run migrate`
          // crearía un duplicado más, porque 20260512 renombra "Pedir X" → "X".
          const existing = await queryInterface.sequelize.query(
            `SELECT id, "eventName" FROM "EventTypes"
              WHERE "companyId" = :companyId
                AND "eventName" IN (:aliases)
                AND "deletedAt" IS NULL
              LIMIT 1`,
            {
              replacements: { companyId, aliases: qa.aliases },
              type: Sequelize.QueryTypes.SELECT,
            }
          );
          if (existing.length > 0) {
            console.log(
              `   ↩️  company ${companyId}: "${existing[0].eventName}" already exists (id=${existing[0].id}), skipping`
            );
            continue;
          }

          const now = new Date();
          await queryInterface.bulkInsert('EventTypes', [
            {
              companyId,
              eventName: qa.eventName,
              stateName: qa.stateName,
              userColor: qa.userColor,
              userFontColor: qa.userFontColor,
              userIcon: qa.userIcon,
              adminColor: qa.adminColor,
              priority: qa.priority,
              isDefault: true,
              systemEventType: null,
              customerDisplay: 'quick_action',
              isActive: true,
              createdAt: now,
              updatedAt: now,
            },
          ]);

          // Fetch the id we just inserted
          const inserted = await queryInterface.sequelize.query(
            `SELECT id FROM "EventTypes"
              WHERE "companyId" = :companyId
                AND "eventName" = :name
              ORDER BY id DESC
              LIMIT 1`,
            {
              replacements: { companyId, name: qa.eventName },
              type: Sequelize.QueryTypes.SELECT,
            }
          );

          if (inserted.length === 0) {
            throw new Error(`Failed to fetch inserted EventType "${qa.eventName}" for company ${companyId}`);
          }

          const newId = inserted[0].id;

          await queryInterface.bulkInsert('EventConfigurations', [
            {
              resourceType: 'company',
              resourceId: companyId,
              eventTypeId: newId,
              enabled: true,
              createdAt: now,
              updatedAt: now,
            },
          ]);

          console.log(`   ➕ company ${companyId}: created "${qa.eventName}" (id=${newId})`);
        }
      }

      console.log('✅ Migration completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface /*, Sequelize */) => {
    console.log('⚠️  20260511_quick_actions_and_spanish: down is a no-op.');
    console.log('    Quick action EventTypes can be deleted from the admin UI if needed.');
    console.log('    Renames are not reversed.');
  },
};
