// Identificación del device del cliente y adjunto a sesión de mesa.
//
// Flujo (Sprint 3.3):
//   1. ensureDevice() — pide fingerprint a ThumbmarkJS y llama
//      POST /api/devices/identify. El backend setea cookie HttpOnly
//      `hm_device`. Cachea el fingerprint en localStorage para no
//      recalcularlo en cada navegación (es caro).
//   2. ensureAttachedToTable(tableId) — POST /sessions/attach. Idempotente.
//
// El device id NO vive en el cliente: la fuente de verdad es la cookie
// HttpOnly. Acá solo necesitamos saber que ambos pasos corrieron.

import { getFingerprint } from '@thumbmarkjs/thumbmarkjs';
import { identifyDevice, attachSession } from './api';

const FP_KEY = 'hm_device_fingerprint';

async function getOrComputeFingerprint() {
  const cached = localStorage.getItem(FP_KEY);
  if (cached && cached.length >= 8) return cached;
  const fp = await getFingerprint();
  if (fp && typeof fp === 'string') {
    localStorage.setItem(FP_KEY, fp);
  }
  return fp;
}

// Identifica el device en el backend. Devuelve { id, emoji, name }.
// Idempotente: misma fingerprint → mismo device.
export async function ensureDevice() {
  const fingerprint = await getOrComputeFingerprint();
  const { data } = await identifyDevice(fingerprint);
  return data;
}

// Adjunta el device a la sesión activa de la mesa (o la crea si no hay).
// Devuelve el payload del backend (session + participant).
// Requiere ensureDevice() previo en la misma "sesión de navegación" para
// que la cookie esté seteada.
export async function ensureAttachedToTable(tableId) {
  const { data } = await attachSession(tableId);
  return data;
}

// Helper de bootstrap: corre ambos pasos en orden. Idempotente.
export async function bootstrapCustomerSession(tableId) {
  const device = await ensureDevice();
  const attach = await ensureAttachedToTable(tableId);
  return { device, attach };
}
