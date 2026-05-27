// MP nativo — wrapper de la SDK oficial. Stateless: recibe el accessToken por
// argumento (el del branch, capturado por OAuth en Sprint 5.3), no toca la DB.
//
// Flow MP nativo en HeyMozo:
//   1. Cliente elige "Mercado Pago" en PaymentMethodSheet.
//   2. Backend crea Payment(pending, method='mp_native', tipCents=0) y luego
//      crea una `preference` MP con `createPreference`. El front recibe
//      `mpInitPoint` y redirige al hosted checkout de MP.
//   3. Cliente paga en MP → MP redirige por `back_urls` a /pago-confirmado/:id.
//   4. En paralelo (orden no garantizado) MP dispara webhook POST a
//      /api/payments/mp/webhook?payment_id=<nuestro_id>. El handler verifica
//      firma HMAC + hace fetch del MP payment + lo aplica vía
//      paymentService.applyMpPayment.
//
// Lookup branch-AT en webhook: en la `notification_url` codificamos el id
// interno del Payment como query (`?payment_id=...`). MP preserva la query
// al disparar el webhook. Así evitamos depender de `external_reference` para
// resolver el branch — el handler ya tiene el id local antes de hacer fetch.
//
// Mientras `Branch.mpMarketplaceEnabled=false` (default), el cobro va al MP
// del branch directo, sin split y sin propina (PHASE2_PLAN §Sprint 5). El
// split a la cuenta del mozo (Marketplace) llega en un sub-PR post-aprobación.

const {
  MercadoPagoConfig,
  Preference,
  Payment: MpPaymentClient,
  WebhookSignatureValidator,
  InvalidWebhookSignatureError
} = require('mercadopago');

// Fallback dev: si el branch no completó OAuth todavía, usamos el AT global
// (process.env.MP_ACCESS_TOKEN). En prod esto es un error duro.
function _resolveAccessToken(branch) {
  if (branch && branch.mpAccessToken) {
    return { accessToken: branch.mpAccessToken, source: 'branch' };
  }
  const envAt = process.env.MP_ACCESS_TOKEN;
  if (envAt && process.env.NODE_ENV !== 'production') {
    console.warn(
      `⚠️  MP: branch ${branch && branch.id} sin mpAccessToken — usando ` +
      'MP_ACCESS_TOKEN global (fallback DEV-only).'
    );
    return { accessToken: envAt, source: 'env' };
  }
  const err = new Error('Mercado Pago no está configurado en este local');
  err.statusCode = 400;
  throw err;
}

function _buildClient(accessToken) {
  return new MercadoPagoConfig({
    accessToken,
    options: { timeout: 10000 }
  });
}

// Crea una preference de Checkout Pro y devuelve { preferenceId, initPoint,
// sandboxInitPoint }. El front usa initPoint (MP detecta TEST vs PROD por el
// AT, no por la URL).
//
// Args:
//   payment        — Payment row (id, totalCents)
//   branch         — Branch row (id, name, mpAccessToken, companyId)
//   table          — Table row (id, tableName)
//   companyId      — para armar la back_url al frontend
//   baseUrl        — APP_BASE_URL (ngrok en dev, dominio prod en prod)
async function createPreference({ payment, branch, table, companyId, baseUrl }) {
  if (!baseUrl) {
    const err = new Error('APP_BASE_URL no está configurado — MP requiere URL pública para back_urls/webhook');
    err.statusCode = 500;
    throw err;
  }
  const { accessToken } = _resolveAccessToken(branch);
  const client = _buildClient(accessToken);
  const preference = new Preference(client);

  const tableLabel = table.tableName ? `Mesa ${table.tableName}` : `Mesa ${table.id}`;
  const venueLabel = branch.name || `Sucursal ${branch.id}`;
  const backBase = `${baseUrl}/m/${companyId}/${branch.id}/${table.id}/pago-confirmado/${payment.id}`;
  const notificationUrl = `${baseUrl}/api/payments/mp/webhook?payment_id=${payment.id}`;

  const body = {
    items: [
      {
        id: `payment-${payment.id}`,
        title: `HeyMozo · ${venueLabel} · ${tableLabel}`,
        quantity: 1,
        unit_price: Math.round(payment.totalCents) / 100,
        currency_id: 'ARS'
      }
    ],
    external_reference: String(payment.id),
    notification_url: notificationUrl,
    back_urls: {
      success: backBase,
      failure: backBase,
      pending: backBase
    },
    statement_descriptor: 'HEYMOZO',
    binary_mode: true
  };

  // MP solo acepta `auto_return: 'approved'` cuando los back_urls son HTTPS.
  // En dev local con APP_BASE_URL=http://localhost lo omitimos (el cliente
  // ve la pantalla "tu pago fue aprobado, volvé al sitio" en MP y vuelve
  // manualmente con el botón). En prod siempre HTTPS → auto_return activo.
  if (baseUrl.startsWith('https://')) {
    body.auto_return = 'approved';
  }

  try {
    const res = await preference.create({ body });
    return {
      preferenceId: res.id,
      initPoint: res.init_point,
      sandboxInitPoint: res.sandbox_init_point
    };
  } catch (err) {
    console.error('❌ MP preference create:', err.message, err.cause || '');
    const wrapped = new Error('No se pudo iniciar el cobro con Mercado Pago');
    wrapped.statusCode = 502;
    throw wrapped;
  }
}

// Hace GET /v1/payments/:id con el AT del branch. Devuelve el payload crudo.
async function fetchMpPayment({ branch, mpPaymentId }) {
  const { accessToken } = _resolveAccessToken(branch);
  const client = _buildClient(accessToken);
  const mpPayment = new MpPaymentClient(client);
  try {
    return await mpPayment.get({ id: mpPaymentId });
  } catch (err) {
    console.error(`❌ MP payment.get(${mpPaymentId}):`, err.message);
    const wrapped = new Error('No se pudo obtener el pago de Mercado Pago');
    wrapped.statusCode = 502;
    throw wrapped;
  }
}

// Verifica firma HMAC del webhook. Tira si no matchea — el caller debe
// responder 401 sin tocar la DB.
//
// MP envía: header `x-signature: ts=...,v1=hex`, header `x-request-id: uuid`,
// query `data.id=<mp_payment_id>`. El manifest se arma así:
//   id:<dataId.toLowerCase()>;request-id:<requestId>;ts:<ts>;
function verifyWebhookSignature({ xSignature, xRequestId, dataId, secret }) {
  if (!secret) {
    const err = new Error('MP_WEBHOOK_SECRET no está configurado');
    err.statusCode = 500;
    throw err;
  }
  try {
    WebhookSignatureValidator.validate({
      xSignature,
      xRequestId,
      dataId,
      secret,
      toleranceSeconds: 600 // 10 min — tolerancia para clock drift
    });
  } catch (err) {
    if (err instanceof InvalidWebhookSignatureError) {
      const wrapped = new Error(`MP webhook signature inválida: ${err.reason}`);
      wrapped.statusCode = 401;
      throw wrapped;
    }
    throw err;
  }
}

// Map MP payment.status → nuestro Payment.status interno.
// "approved" es el único que cierra la sesión; cualquier rejected/cancelled
// va a failed; pending/in_process se quedan así (cliente sigue viendo el
// banner y MP eventualmente reenvía webhook con el estado final).
function mapMpStatus(mpStatus) {
  switch (mpStatus) {
    case 'approved': return 'paid';
    case 'rejected':
    case 'cancelled':
    case 'refunded':
    case 'charged_back':
      return 'failed';
    case 'pending':
    case 'in_process':
    case 'authorized':
    default:
      return null; // mantener estado actual
  }
}

module.exports = {
  createPreference,
  fetchMpPayment,
  verifyWebhookSignature,
  mapMpStatus
};
