const { Device } = require('../models');

// Pool de emojis para identificación visual del device en la mesa.
// Auto-asignado: sin friction al primer scan. El usuario puede cambiarlo
// post-MVP. Mantener distinguibles entre sí en pantalla pequeña.
const DEVICE_EMOJIS = [
  '🦊', '🐼', '🦁', '🐯', '🐨', '🐸', '🐵', '🦉',
  '🐙', '🦄', '🐳', '🐶', '🐱', '🐹', '🐰', '🐻',
  '🐲', '🦋', '🐝', '🐞', '🦖', '🦩', '🦜', '🦔'
];

function pickEmoji() {
  return DEVICE_EMOJIS[Math.floor(Math.random() * DEVICE_EMOJIS.length)];
}

// Identifica o crea un Device por fingerprint (ThumbmarkJS hash desde el cliente).
// Idempotente: el mismo fingerprint devuelve siempre el mismo Device.
// Update opcional de `name` si el cliente lo proveyó.
async function identifyDevice({ fingerprint, name } = {}) {
  if (!fingerprint || typeof fingerprint !== 'string' || fingerprint.length < 8) {
    const err = new Error('fingerprint requerido (string de al menos 8 chars)');
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  let device = await Device.findOne({ where: { fingerprint } });

  if (!device) {
    device = await Device.create({
      fingerprint,
      emoji: pickEmoji(),
      name: name || null,
      firstSeenAt: now,
      lastHeartbeatAt: now
    });
  } else {
    const updates = { lastHeartbeatAt: now };
    if (name && !device.name) {
      updates.name = name;
    }
    await device.update(updates);
  }

  return device;
}

module.exports = {
  identifyDevice,
  DEVICE_EMOJIS
};
