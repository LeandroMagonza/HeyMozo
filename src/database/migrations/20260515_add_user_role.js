// Migration: adds User.role ENUM column and backfills existing rows.
//
// Backfill logic (from PHASE2_PLAN.md Sprint 1.1):
//   isAdmin = true  → 'platformAdmin'  (superadmin, same access as before)
//   isAdmin = false → 'owner'          (safe default: existing users are restaurant owners)
//
// Idempotent: each step checks state before writing. Safe to run 2×.

module.exports = {
  up: async (queryInterface) => {
    console.log('🔄 Migration: add User.role ENUM');

    // Step 1: Create the ENUM type (skip if already exists)
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        CREATE TYPE "enum_Users_role" AS ENUM('waiter', 'cashier', 'owner', 'platformAdmin');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log('   ✅ ENUM type ready');

    // Step 2: Add column with default 'owner' (IF NOT EXISTS = idempotent)
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS role "enum_Users_role" DEFAULT 'owner';
    `);
    console.log('   ✅ role column ready');

    // Step 3: Backfill isAdmin=true → platformAdmin
    const [, adminMeta] = await queryInterface.sequelize.query(`
      UPDATE "Users"
         SET role = 'platformAdmin'
       WHERE "isAdmin" = true
         AND (role IS NULL OR role != 'platformAdmin')
    `);
    console.log(`   ✅ ${adminMeta?.rowCount ?? 0} admin users → platformAdmin`);

    // Step 4: Safety net — fill any remaining NULLs (rows added between steps 2 and 3)
    const [, nullMeta] = await queryInterface.sequelize.query(`
      UPDATE "Users"
         SET role = 'owner'
       WHERE role IS NULL
    `);
    console.log(`   ✅ ${nullMeta?.rowCount ?? 0} NULL roles → owner`);

    // Step 5: Enforce NOT NULL now that every row has a value
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" ALTER COLUMN role SET NOT NULL;
    `);
    console.log('   ✅ role column set NOT NULL');

    console.log('✅ Migration complete: User.role');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE "Users" DROP COLUMN IF EXISTS role;
    `);
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_Users_role";
    `);
    console.log('✅ Rolled back: User.role removed');
  },
};
