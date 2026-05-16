// Migration Sprint 2.1: introduce el menú interno (Categories + MenuItems) y
// agrega la columna `modality` a Branches.
//
// - Categories: agrupa los ítems del menú dentro de una sucursal.
// - MenuItems:  productos pertenecientes a una Category.
// - Branches.modality: ENUM('mozo', 'autoservicio') para distinguir flujo de
//   atención (Modalidad B = 'mozo' por defecto; 'autoservicio' = Modalidad A,
//   bloqueada en UI hasta post-MVP).
//
// Ambas tablas son paranoid (soft delete via deletedAt).
//
// Notas de diseño (ver memoria project-phase2-sprint2-design):
//   - El menú vive a nivel sucursal (no Company, sin overrides).
//   - `name` (no `title`) por consistencia con resto del schema.
//   - `priceCents` en centavos (INTEGER), nunca decimal.
//   - `stock` y `metaProductId` se crean ya en DB pero permanecen ocultos en
//     la UI MVP. Se incluyen anticipadamente para evitar migrations futuras
//     sobre tablas con datos reales (mismo patrón que otras columnas
//     "futuro-proof" del schema).
//
// Idempotente: chequea existencia antes de crear tablas o columnas.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: menu models + Branches.modality');

    try {
      const existingTables = await queryInterface.showAllTables();
      const tablesLower = existingTables.map((t) => String(t).toLowerCase());

      // Paso 1: Categories
      if (!tablesLower.includes('categories')) {
        console.log('🏗️  Step 1: creating Categories table...');
        await queryInterface.createTable('Categories', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          branchId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Branches', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          displayOrder: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
          deletedAt: { type: Sequelize.DATE, allowNull: true },
        });
        await queryInterface.addIndex('Categories', ['branchId'], {
          name: 'categories_branch_id_idx',
        });
        console.log('   ✅ Categories table created');
      } else {
        console.log('⏭️  Step 1: Categories already exists, skipping');
      }

      // Paso 2: MenuItems
      if (!tablesLower.includes('menuitems')) {
        console.log('🏗️  Step 2: creating MenuItems table...');
        await queryInterface.createTable('MenuItems', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
          },
          categoryId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Categories', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          name: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          description: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          priceCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          imageUrl: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          isAvailable: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          displayOrder: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          // Futuro Fase 3 delivery — ocultos en UI MVP.
          metaProductId: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          stock: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
          deletedAt: { type: Sequelize.DATE, allowNull: true },
        });
        await queryInterface.addIndex('MenuItems', ['categoryId'], {
          name: 'menuitems_category_id_idx',
        });
        console.log('   ✅ MenuItems table created');
      } else {
        console.log('⏭️  Step 2: MenuItems already exists, skipping');
      }

      // Paso 3: Branches.modality
      const branchesCols = await queryInterface.describeTable('Branches');
      if (!branchesCols.modality) {
        console.log('🏗️  Step 3: adding Branches.modality ENUM column...');
        await queryInterface.addColumn('Branches', 'modality', {
          type: Sequelize.ENUM('mozo', 'autoservicio'),
          allowNull: false,
          defaultValue: 'mozo',
        });
        console.log('   ✅ Branches.modality column created');
      } else {
        console.log('⏭️  Step 3: Branches.modality already exists, skipping');
      }

      console.log('✅ Migration completed: menu models + Branches.modality');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface /*, Sequelize */) => {
    console.log('⚠️  20260516_add_menu_models_and_branch_modality: rolling back');

    await queryInterface.removeColumn('Branches', 'modality');
    // Postgres deja el tipo ENUM colgado; lo dropeamos también.
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_Branches_modality"'
    );

    await queryInterface.dropTable('MenuItems');
    await queryInterface.dropTable('Categories');
  },
};
