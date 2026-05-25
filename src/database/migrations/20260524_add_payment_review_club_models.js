// Migration Sprint 5.2: Payment / Review / ReviewTag / Club models.
//
// Cubre los 5 canales de pago (mp_native, transfer, modo, card_terminal, cash),
// el sistema de reviews (stars + tags negativos + Google Maps derivation) y el
// programa Club VIP (member + visits + voucher). Todo el scope del Sprint 5
// arranca acá; el resto de sub-PRs (5.3 a 5.11) consume estos modelos.
//
// Idempotente: chequea existencia de tablas y columnas antes de crear, y los
// ENUMs se crean con DO $$ BEGIN ... EXCEPTION WHEN duplicate_object para
// poder re-correr sin romper el estado.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Starting migration: Payment + Review + Club models (Sprint 5.2)');

    try {
      const existingTables = await queryInterface.showAllTables();
      const tablesLower = existingTables.map((t) => String(t).toLowerCase());

      const addColumnIfMissing = async (tableName, columnName, spec) => {
        const desc = await queryInterface.describeTable(tableName);
        if (!desc[columnName]) {
          await queryInterface.addColumn(tableName, columnName, spec);
          console.log(`   ✅ ${tableName}.${columnName} added`);
        } else {
          console.log(`   ⏭️  ${tableName}.${columnName} already exists, skipping`);
        }
      };

      // ─── Paso 1: ENUMs ──────────────────────────────────────────────────
      console.log('🏗️  Step 1: creating ENUMs...');
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Payments_method" AS ENUM('mp_native', 'transfer', 'modo', 'card_terminal', 'cash');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_Payments_status" AS ENUM('pending', 'awaiting_validation', 'paid', 'failed', 'refunded');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_ReviewTags_sentiment" AS ENUM('positive', 'negative', 'neutral');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_ReviewTags_category" AS ENUM('general', 'food', 'drink', 'service', 'ambience');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      console.log('   ✅ ENUMs ready');

      // ─── Paso 2: columnas nuevas en Branches ────────────────────────────
      console.log('🏗️  Step 2: adding columns to Branches...');
      await addColumnIfMissing('Branches', 'googleMapsReviewUrl', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'mpMarketplaceEnabled', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
      await addColumnIfMissing('Branches', 'mpAccessToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'mpRefreshToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'transferAlias', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'transferCbu', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'transferTitular', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'transferCuit', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'paymentMethodPriority', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: ['mp', 'transfer', 'modo', 'card', 'cash'],
      });
      await addColumnIfMissing('Branches', 'paymentMethodsEnabled', {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: { mp: true, transfer: true, modo: true, card: true, cash: true },
      });
      await addColumnIfMissing('Branches', 'clubReward', {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: 'Pinta Gratis',
      });
      await addColumnIfMissing('Branches', 'clubGoal', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5,
      });
      await addColumnIfMissing('Branches', 'clubAccelerationAtVisit', {
        type: Sequelize.INTEGER,
        allowNull: true,
      });
      await addColumnIfMissing('Branches', 'clubAccelerationMultiplier', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 2,
      });

      // ─── Paso 3: columnas nuevas en Users ───────────────────────────────
      console.log('🏗️  Step 3: adding columns to Users...');
      await addColumnIfMissing('Users', 'mpAlias', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Users', 'mpAccessToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });
      await addColumnIfMissing('Users', 'mpRefreshToken', {
        type: Sequelize.STRING,
        allowNull: true,
      });

      // ─── Paso 4: Payments ────────────────────────────────────────────────
      if (!tablesLower.includes('payments')) {
        console.log('🏗️  Step 4: creating Payments table...');
        await queryInterface.createTable('Payments', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          tableSessionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'TableSessions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          deviceId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Devices', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          // Consumo (sin propina). El balance de la mesa se cierra cuando
          // sum(subtotalCents de Payments paid) >= sum(Orders.totalCents).
          subtotalCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          // Propina. NUNCA cuenta para balance. Excluida en transfer/modo
          // (decisión fiscal) y excluida en MP hasta Marketplace aprobado.
          tipCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          totalCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          method: {
            type: Sequelize.ENUM('mp_native', 'transfer', 'modo', 'card_terminal', 'cash'),
            allowNull: false,
          },
          status: {
            type: Sequelize.ENUM('pending', 'awaiting_validation', 'paid', 'failed', 'refunded'),
            allowNull: false,
            defaultValue: 'pending',
          },
          // Solo mp_native.
          mpPaymentId: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          mpRawPayload: {
            type: Sequelize.JSONB,
            allowNull: true,
          },
          // Solo transfer (opcional).
          proofUrl: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          // Quien validó (cajero en transfer, mozo en cash/card).
          collectedByUserId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          // Solo cash, opcional (para calcular vuelto).
          cashTenderedCents: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          paidAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('Payments', ['tableSessionId', 'status'], {
          name: 'payments_session_status_idx',
        });
        await queryInterface.addIndex('Payments', ['status'], {
          name: 'payments_status_idx',
        });
        await queryInterface.addIndex('Payments', ['mpPaymentId'], {
          name: 'payments_mp_payment_id_idx',
        });
        console.log('   ✅ Payments table created');
      } else {
        console.log('⏭️  Step 4: Payments already exists, skipping');
      }

      // ─── Paso 5: Reviews ─────────────────────────────────────────────────
      if (!tablesLower.includes('reviews')) {
        console.log('🏗️  Step 5: creating Reviews table...');
        await queryInterface.createTable('Reviews', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          tableSessionId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'TableSessions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'RESTRICT',
          },
          paymentId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Payments', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          stars: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          // Híbrido D: auto-sugerido el mozo más activo de la sesión, el
          // cliente puede cambiar a otro staff que tocó la mesa.
          waiterId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          // Tracking del clic al link de Google Maps post-submit. El link
          // aparece SIEMPRE (no por umbral de stars).
          derivedToGoogle: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: false,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('Reviews', ['tableSessionId'], {
          name: 'reviews_session_idx',
        });
        await queryInterface.addIndex('Reviews', ['waiterId'], {
          name: 'reviews_waiter_idx',
        });
        console.log('   ✅ Reviews table created');
      } else {
        console.log('⏭️  Step 5: Reviews already exists, skipping');
      }

      // ─── Paso 6: ReviewTags ──────────────────────────────────────────────
      if (!tablesLower.includes('reviewtags')) {
        console.log('🏗️  Step 6: creating ReviewTags table...');
        await queryInterface.createTable('ReviewTags', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
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
          emoji: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          // MVP solo negative. Puerta abierta a positive/neutral en v1.5+.
          sentiment: {
            type: Sequelize.ENUM('positive', 'negative', 'neutral'),
            allowNull: false,
            defaultValue: 'negative',
          },
          // MVP solo general. Permite separar por categoría en v1.5 sin
          // migration.
          category: {
            type: Sequelize.ENUM('general', 'food', 'drink', 'service', 'ambience'),
            allowNull: false,
            defaultValue: 'general',
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('ReviewTags', ['branchId', 'isActive'], {
          name: 'reviewtags_branch_active_idx',
        });
        console.log('   ✅ ReviewTags table created');
      } else {
        console.log('⏭️  Step 6: ReviewTags already exists, skipping');
      }

      // ─── Paso 7: ReviewTagAssignments (m2m) ─────────────────────────────
      if (!tablesLower.includes('reviewtagassignments')) {
        console.log('🏗️  Step 7: creating ReviewTagAssignments table...');
        await queryInterface.createTable('ReviewTagAssignments', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          reviewId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Reviews', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          reviewTagId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ReviewTags', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex(
          'ReviewTagAssignments',
          ['reviewId', 'reviewTagId'],
          { unique: true, name: 'reviewtagassignments_review_tag_unique' }
        );
        console.log('   ✅ ReviewTagAssignments table created');
      } else {
        console.log('⏭️  Step 7: ReviewTagAssignments already exists, skipping');
      }

      // ─── Paso 8: ClubMembers ────────────────────────────────────────────
      if (!tablesLower.includes('clubmembers')) {
        console.log('🏗️  Step 8: creating ClubMembers table...');
        await queryInterface.createTable('ClubMembers', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          branchId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'Branches', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          phone: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          visits: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
          },
          lastVisitAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('ClubMembers', ['branchId', 'phone'], {
          unique: true,
          name: 'clubmembers_branch_phone_unique',
        });
        await queryInterface.addIndex('ClubMembers', ['branchId', 'lastVisitAt'], {
          name: 'clubmembers_branch_lastvisit_idx',
        });
        console.log('   ✅ ClubMembers table created');
      } else {
        console.log('⏭️  Step 8: ClubMembers already exists, skipping');
      }

      // ─── Paso 9: ClubVisits ─────────────────────────────────────────────
      if (!tablesLower.includes('clubvisits')) {
        console.log('🏗️  Step 9: creating ClubVisits table...');
        await queryInterface.createTable('ClubVisits', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          clubMemberId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ClubMembers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          tableSessionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'TableSessions', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          // visitsAdded > 1 cuando aplica loyalty acceleration. Permite
          // reconstruir el conteo histórico aunque cambien los params del
          // programa.
          visitsAdded: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('ClubVisits', ['clubMemberId'], {
          name: 'clubvisits_member_idx',
        });
        console.log('   ✅ ClubVisits table created');
      } else {
        console.log('⏭️  Step 9: ClubVisits already exists, skipping');
      }

      // ─── Paso 10: Vouchers ──────────────────────────────────────────────
      if (!tablesLower.includes('vouchers')) {
        console.log('🏗️  Step 10: creating Vouchers table...');
        await queryInterface.createTable('Vouchers', {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
          },
          clubMemberId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'ClubMembers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          code: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          // Snapshot del clubReward al momento de generar. Si el dueño
          // cambia el premio después, los vouchers ya emitidos mantienen
          // su texto original.
          reward: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          generatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          redeemedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          redeemedByUserId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'Users', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
          },
          createdAt: { type: Sequelize.DATE, allowNull: false },
          updatedAt: { type: Sequelize.DATE, allowNull: false },
        });

        await queryInterface.addIndex('Vouchers', ['clubMemberId'], {
          name: 'vouchers_member_idx',
        });
        await queryInterface.addIndex('Vouchers', ['code'], {
          unique: true,
          name: 'vouchers_code_unique',
        });
        await queryInterface.addIndex('Vouchers', ['redeemedAt'], {
          name: 'vouchers_redeemed_idx',
        });
        console.log('   ✅ Vouchers table created');
      } else {
        console.log('⏭️  Step 10: Vouchers already exists, skipping');
      }

      console.log('✅ Migration completed: Payment + Review + Club models (Sprint 5.2)');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface) => {
    console.log('⚠️  20260524_add_payment_review_club_models: rolling back');

    await queryInterface.dropTable('Vouchers').catch(() => {});
    await queryInterface.dropTable('ClubVisits').catch(() => {});
    await queryInterface.dropTable('ClubMembers').catch(() => {});
    await queryInterface.dropTable('ReviewTagAssignments').catch(() => {});
    await queryInterface.dropTable('ReviewTags').catch(() => {});
    await queryInterface.dropTable('Reviews').catch(() => {});
    await queryInterface.dropTable('Payments').catch(() => {});

    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Payments_method";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_Payments_status";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_ReviewTags_sentiment";`);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_ReviewTags_category";`);

    const branchCols = [
      'googleMapsReviewUrl', 'mpMarketplaceEnabled', 'mpAccessToken', 'mpRefreshToken',
      'transferAlias', 'transferCbu', 'transferTitular', 'transferCuit',
      'paymentMethodPriority', 'paymentMethodsEnabled',
      'clubReward', 'clubGoal', 'clubAccelerationAtVisit', 'clubAccelerationMultiplier',
    ];
    for (const col of branchCols) {
      await queryInterface.removeColumn('Branches', col).catch(() => {});
    }

    const userCols = ['mpAlias', 'mpAccessToken', 'mpRefreshToken'];
    for (const col of userCols) {
      await queryInterface.removeColumn('Users', col).catch(() => {});
    }

    console.log('✅ Rolled back: Payment + Review + Club models');
  },
};
