// Migration: ajusta los 4 quick action defaults + el main_action ("Llamar al
// Mozo") para que usen emojis Unicode en lugar de iconos FontAwesome, y
// acorta los labels ("Pedir Hielo" → "Hielo", etc.) para coincidir con el
// diseño del mockup.
//
// Idempotente y conservadora: solo cambia las filas que aún tienen los
// valores default originales de la migration 20260511 (FaSnowflake,
// FaPepperHot, FaScroll, FaBroom, FaUser).

module.exports = {
  up: async (queryInterface /*, Sequelize */) => {
    console.log('🔄 Starting migration: emoji + label polish for quick actions');

    // Pares [oldName, newName] para renombrar a la versión corta solo cuando
    // el nombre sigue siendo el default que creó 20260511.
    const RENAMES = [
      ['Pedir Hielo', 'Hielo'],
      ['Pedir Condimentos', 'Condimentos'],
      ['Pedir Servilletas', 'Servilletas'],
      ['Limpiar Mesa', 'Limpiar mesa'],
    ];

    // Pares [eventName, oldFaIcon, newEmoji] — solo cambia el icono cuando aún
    // es el FA original. Si el dueño ya editó el icono, lo respetamos.
    const ICON_UPDATES = [
      ['Hielo', 'FaSnowflake', '🧊'],
      ['Condimentos', 'FaPepperHot', '🧂'],
      ['Servilletas', 'FaScroll', '📄'],
      ['Limpiar mesa', 'FaBroom', '🧽'],
      ['Llamar al Mozo', 'FaUser', '🙋'],
    ];

    try {
      console.log('🌎 Step 1: renaming quick action defaults to short labels...');
      for (const [oldName, newName] of RENAMES) {
        await queryInterface.sequelize.query(
          'UPDATE "EventTypes" SET "eventName" = :newName WHERE "eventName" = :oldName',
          { replacements: { oldName, newName } }
        );
        console.log(`   ✏️  "${oldName}" → "${newName}"`);
      }

      console.log('🎨 Step 2: replacing FontAwesome icons with emojis on default rows...');
      for (const [eventName, oldIcon, newIcon] of ICON_UPDATES) {
        await queryInterface.sequelize.query(
          `UPDATE "EventTypes"
              SET "userIcon" = :newIcon
            WHERE "eventName" = :eventName
              AND "userIcon" = :oldIcon`,
          { replacements: { eventName, oldIcon, newIcon } }
        );
        console.log(`   🔁 ${eventName}: "${oldIcon}" → "${newIcon}"`);
      }

      console.log('✅ Migration completed: emoji + label polish');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (/* queryInterface, Sequelize */) => {
    console.log('⚠️  20260512_emoji_quick_action_polish: down is a no-op.');
  },
};
