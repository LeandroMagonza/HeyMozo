// Migration: agrega la columna `cardVariant` a EventTypes y setea defaults
// razonables para los EventTypes que ya existen.
//
// `cardVariant` controla el color de la <AlertCard> que ve el mozo en
// AdminScreen cuando una mesa dispara este EventType. Las 6 variants
// disponibles vienen del mockup HeyMozo:
//   red / orange / yellow / paid / purple / blue
//
// Reglas que aplica esta migration sobre los rows existentes:
//   - System events (SCAN / MARK_SEEN / OCCUPY)  → NULL (no se renderean)
//   - VACATE                                     → 'paid'  (mesa liberada = verde)
//   - eventos con customerDisplay='quick_action' → 'orange'
//   - eventos con customerDisplay='main_action'  → 'yellow'
//   - 'Pedir Cuenta' / nombres que matchean pago → 'red'
//   - 'Llamar al Encargado'                      → 'red'
//   - resto                                      → 'orange'  (fallback)
//
// Idempotente: si la columna ya existe, no la vuelve a crear. Solo actualiza
// rows que aún tienen cardVariant=NULL para no pisar configuraciones manuales
// futuras.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: add cardVariant to EventTypes');

    try {
      // Paso 1: agregar columna cardVariant si no existe.
      const table = await queryInterface.describeTable('EventTypes');
      if (!table.cardVariant) {
        console.log('🏗️  Step 1: adding cardVariant ENUM column...');
        await queryInterface.addColumn('EventTypes', 'cardVariant', {
          type: Sequelize.ENUM('red', 'orange', 'yellow', 'paid', 'purple', 'blue'),
          allowNull: true,
          defaultValue: null,
        });
        console.log('   ✅ cardVariant column created');
      } else {
        console.log('⏭️  Step 1: cardVariant column already exists, skipping addColumn');
      }

      // Paso 2: setear 'paid' para system VACATE rows que aún no tienen variant.
      console.log('🎨 Step 2: seeding cardVariant=paid for VACATE rows...');
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "cardVariant" = 'paid'
          WHERE "systemEventType" = 'VACATE'
            AND "cardVariant" IS NULL`
      );

      // Paso 3: 'red' para Pedir Cuenta y Llamar al Encargado (urgentes/pago).
      console.log('🎨 Step 3: seeding cardVariant=red for payment / manager events...');
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "cardVariant" = 'red'
          WHERE "eventName" IN ('Pedir Cuenta', 'Llamar al Encargado', 'Cuenta', 'Pago')
            AND "systemEventType" IS NULL
            AND "cardVariant" IS NULL`
      );

      // Paso 4: 'yellow' para main_action (típicamente 'Llamar al Mozo').
      console.log('🎨 Step 4: seeding cardVariant=yellow for main_action events...');
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "cardVariant" = 'yellow'
          WHERE "customerDisplay" = 'main_action'
            AND "systemEventType" IS NULL
            AND "cardVariant" IS NULL`
      );

      // Paso 5: 'orange' para quick_action y para cualquier otro custom event
      // sin variant todavía (fallback razonable).
      console.log('🎨 Step 5: seeding cardVariant=orange for quick_action / rest...');
      await queryInterface.sequelize.query(
        `UPDATE "EventTypes"
            SET "cardVariant" = 'orange'
          WHERE "systemEventType" IS NULL
            AND "cardVariant" IS NULL`
      );

      console.log('✅ Migration completed: cardVariant column + defaults');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface /*, Sequelize */) => {
    console.log('⚠️  20260513_add_card_variant: down removes the column');
    await queryInterface.removeColumn('EventTypes', 'cardVariant');
    // Postgres deja el tipo ENUM colgado; lo dropeamos también.
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_EventTypes_cardVariant"'
    );
  },
};
