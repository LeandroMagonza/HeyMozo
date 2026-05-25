const { ReviewTag } = require('../models');

// Seed de 8 ReviewTags negativos al crear una branch. Todos arrancan con
// category 'general' (MVP). Editables después desde el tab Reseñas (UI en
// Sprint 8). En Sprint 5 solo el seed.
const DEFAULT_NEGATIVE_TAGS = [
  { emoji: '🥶', name: 'Comida fría' },
  { emoji: '⏳', name: 'Demora en la atención' },
  { emoji: '🍳', name: 'Demora en la cocina' },
  { emoji: '😠', name: 'Mala atención del mozo' },
  { emoji: '❌', name: 'Pedido equivocado' },
  { emoji: '💰', name: 'Precios altos' },
  { emoji: '🧹', name: 'Lugar sucio' },
  { emoji: '🔊', name: 'Ambiente ruidoso' },
];

class ReviewConfigService {
  // Idempotente: si la branch ya tiene tags seedeados (por re-run del
  // wizard o re-creación accidental), no duplica.
  static async createDefaultReviewTags(branchId) {
    const existing = await ReviewTag.count({ where: { branchId } });
    if (existing > 0) {
      console.log(`⏭️  Branch ${branchId} ya tiene ${existing} ReviewTags, skipping seed`);
      return [];
    }

    const rows = DEFAULT_NEGATIVE_TAGS.map((tag) => ({
      branchId,
      name: tag.name,
      emoji: tag.emoji,
      sentiment: 'negative',
      category: 'general',
      isActive: true,
    }));

    const created = await ReviewTag.bulkCreate(rows);
    console.log(`✅ Seeded ${created.length} default ReviewTags para branch ${branchId}`);
    return created;
  }
}

module.exports = ReviewConfigService;
module.exports.DEFAULT_NEGATIVE_TAGS = DEFAULT_NEGATIVE_TAGS;
