// src/components/PagoConfirmadoPage.js
//
// PostPagoPage (Sprint 5.9) — pantalla post-pago del cliente.
//
// Estructura:
//   1. Confirmación del pago (icono + subtítulo por método + desglose).
//      Sprint 5.6 — MP nativo: al volver por back_url el Payment puede estar
//      todavía `pending` (webhook no llegó) → polling cada 2s con timeout 30s.
//   2. Una vez `paid`, se carga el contexto PostPago y se muestra:
//      - Valoración 1-5 estrellas (obligatoria). Si nota ≤ 3: grilla de tags
//        negativos + comentario. Si ≥ 4: solo el botón de enviar.
//      - Selector de mozo (si más de un staff tocó la mesa; auto-sugerido).
//      - Post-submit: link "Dejá tu reseña en Google Maps" SIEMPRE visible.
//      - Card Club VIP SIEMPRE visible (input WhatsApp + contador X de Y).

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaCheckCircle, FaExclamationCircle, FaSpinner,
  FaStar, FaRegStar, FaWhatsapp, FaGoogle, FaArrowLeft
} from 'react-icons/fa';
import {
  getPaymentStatus, getPostpagoContext, submitReview,
  markReviewGoogleClick, joinClub
} from '../services/api';
import Phone from './Phone';
import './PagoConfirmadoPage.css';

const formatPrice = (cents) =>
  ((cents || 0) / 100).toLocaleString('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  });

const POLL_MS = 2000;
const POLL_TIMEOUT_MS = 30000;
const LOW_RATING_THRESHOLD = 3;

const SUBTITLE_BY_METHOD = {
  cash: 'El mozo cobró tu cuenta.',
  card_terminal: 'El mozo cobró tu cuenta.',
  transfer: 'El cajero validó tu transferencia.',
  modo: 'El cajero validó tu pago.',
  mp_native: 'Mercado Pago confirmó tu pago.'
};

// Flag de "PostPago sin cerrar" por mesa+device. Mientras exista, UserScreen
// devuelve al cliente a esta pantalla al volver a la mesa (así puede dejar la
// reseña / sumarse al Club cuando quiera). Se borra con "Volver al inicio".
// El formato DEBE coincidir con el que lee UserScreen.
const stickyKeyFor = (companyId, branchId, tableId) =>
  `hm_postpago_${companyId}_${branchId}_${tableId}`;

// ─── Sub-componente: rating de estrellas ───────────────────────────────
const StarRating = ({ value, onChange }) => (
  <div className="pp-stars" role="radiogroup" aria-label="Calificación">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        type="button"
        className={`pp-star ${n <= value ? 'pp-star--on' : ''}`}
        onClick={() => onChange(n)}
        aria-label={`${n} estrella${n > 1 ? 's' : ''}`}
        aria-checked={n === value}
        role="radio"
      >
        {n <= value ? <FaStar /> : <FaRegStar />}
      </button>
    ))}
  </div>
);

const PagoConfirmadoPage = () => {
  const { companyId, branchId, tableId, paymentId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [timedOut, setTimedOut] = useState(false);
  const startedAtRef = useRef(Date.now());

  // Contexto PostPago (se carga una vez que el pago está `paid`).
  const [context, setContext] = useState(null);

  // Estado del flujo de review.
  const [stars, setStars] = useState(0);
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [waiterId, setWaiterId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReview, setSubmittedReview] = useState(null);
  const [reviewError, setReviewError] = useState(null);
  const [googleClicked, setGoogleClicked] = useState(false);

  // Estado del flujo Club.
  const [phone, setPhone] = useState('');
  const [joining, setJoining] = useState(false);
  const [clubResult, setClubResult] = useState(null);
  const [clubError, setClubError] = useState(null);

  // ── Polling del estado del pago ──
  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const { data } = await getPaymentStatus(paymentId);
        if (cancelled) return null;
        setPayment(data);
        return data;
      } catch (err) {
        console.warn('No se pudo cargar el pago confirmado:', err && err.message);
        return null;
      }
    };

    const tick = async () => {
      const data = await fetchOnce();
      if (cancelled) return;
      if (data && (data.status === 'paid' || data.status === 'failed')) {
        return;
      }
      if (Date.now() - startedAtRef.current > POLL_TIMEOUT_MS) {
        setTimedOut(true);
        return;
      }
      setTimeout(tick, POLL_MS);
    };

    tick();
    return () => { cancelled = true; };
  }, [paymentId]);

  const status = payment?.status;
  const isPending = !payment || status === 'pending' || status === 'awaiting_validation';
  const isFailed = status === 'failed';
  const isPaid = status === 'paid';

  // ── Carga del contexto PostPago una vez `paid` ──
  useEffect(() => {
    if (!isPaid || context) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await getPostpagoContext(paymentId);
        if (cancelled) return;
        setContext(data);
        setWaiterId(data.suggestedWaiterId || null);
        if (data.existingReview) {
          setSubmittedReview(data.existingReview);
          setGoogleClicked(!!data.existingReview.derivedToGoogle);
        }
        if (data.clubStatus && data.clubStatus.joined) {
          setClubResult({
            visits: data.clubStatus.visits,
            goal: data.clubStatus.goal,
            reward: data.clubStatus.reward,
            alreadyJoined: true
          });
        }
      } catch (err) {
        console.warn('No se pudo cargar el contexto PostPago:', err && err.message);
      }
    })();
    return () => { cancelled = true; };
  }, [isPaid, context, paymentId]);

  // Mientras el pago esté confirmado, marcamos esta pantalla como "sin cerrar"
  // para que UserScreen devuelva acá al cliente hasta que apriete "Volver al
  // inicio". No la seteamos en failed (no queremos atraparlo en un pago fallido).
  useEffect(() => {
    if (isPaid && companyId && branchId && tableId) {
      try {
        localStorage.setItem(stickyKeyFor(companyId, branchId, tableId), String(paymentId));
      } catch (_) { /* localStorage no disponible — degradamos sin romper */ }
    }
  }, [isPaid, companyId, branchId, tableId, paymentId]);

  const handleGoHome = () => {
    try {
      localStorage.removeItem(stickyKeyFor(companyId, branchId, tableId));
    } catch (_) { /* noop */ }
    navigate(`/m/${companyId}/${branchId}/${tableId}`);
  };

  const isLowRating = stars > 0 && stars <= LOW_RATING_THRESHOLD;

  const toggleTag = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    );
  };

  const handleSubmitReview = async () => {
    if (stars < 1 || submitting) return;
    setSubmitting(true);
    setReviewError(null);
    try {
      const payload = {
        stars,
        waiterId: waiterId || null,
        tagIds: isLowRating ? selectedTags : [],
        comment: isLowRating ? comment : ''
      };
      const { data } = await submitReview(paymentId, payload);
      setSubmittedReview(data);
    } catch (err) {
      setReviewError(
        (err.response && err.response.data && err.response.data.error)
        || 'No pudimos guardar tu valoración. Probá de nuevo.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!submittedReview) return;
    setGoogleClicked(true);
    try {
      await markReviewGoogleClick(submittedReview.id);
    } catch (err) {
      // Tracking best-effort — no bloqueamos la navegación a Google.
      console.warn('No se pudo registrar el click de Google:', err && err.message);
    }
    if (context && context.branch && context.branch.googleMapsReviewUrl) {
      window.open(context.branch.googleMapsReviewUrl, '_blank', 'noopener');
    }
  };

  const handleJoinClub = async () => {
    if (!phone.trim() || joining) return;
    setJoining(true);
    setClubError(null);
    try {
      const { data } = await joinClub(paymentId, { phone: phone.trim() });
      setClubResult(data);
    } catch (err) {
      setClubError(
        (err.response && err.response.data && err.response.data.error)
        || 'No pudimos registrar tu número. Revisalo e intentá de nuevo.'
      );
    } finally {
      setJoining(false);
    }
  };

  // ── Cabecera de confirmación ──
  let icon;
  let title;
  let subtitle;
  if (isFailed) {
    icon = <FaExclamationCircle />;
    title = 'No pudimos confirmar el pago';
    subtitle = 'Mercado Pago rechazó el cobro o lo cancelaste. Volvé al menú y elegí otro método.';
  } else if (isPending && !timedOut) {
    icon = <FaSpinner className="pc-card__spin" />;
    title = 'Procesando pago…';
    subtitle = 'Esperando confirmación de Mercado Pago. No cierres esta ventana.';
  } else if (isPending && timedOut) {
    icon = <FaExclamationCircle />;
    title = 'Confirmación demorada';
    subtitle = 'El pago todavía no se confirmó. Revisá tu app de Mercado Pago o avisale al mozo.';
  } else {
    icon = <FaCheckCircle />;
    title = '¡Listo!';
    subtitle = (payment && SUBTITLE_BY_METHOD[payment.method]) || 'Tu pago fue confirmado.';
  }

  const club = context && context.club;
  const clubReached = clubResult && clubResult.goal && clubResult.visits >= clubResult.goal;

  return (
    <Phone>
      <div className="pc-page">
        <div className={`pc-card ${isFailed ? 'pc-card--error' : ''} ${isPending && !timedOut ? 'pc-card--pending' : ''}`}>
          <div className="pc-card__icon">{icon}</div>
          <h1 className="pc-card__title">{title}</h1>
          <p className="pc-card__subtitle">{subtitle}</p>

          {payment && isPaid && (
            <div className="pc-card__breakdown">
              <div className="pc-card__row">
                <span>Pedido</span>
                <span>{formatPrice(payment.subtotalCents)}</span>
              </div>
              {payment.tipCents > 0 && (
                <div className="pc-card__row pc-card__row--muted">
                  <span>Propina</span>
                  <span>{formatPrice(payment.tipCents)}</span>
                </div>
              )}
              <div className="pc-card__row pc-card__row--total">
                <span>Total cobrado</span>
                <span>{formatPrice(payment.totalCents)}</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Sección PostPago: review ── */}
        {isPaid && context && (
          <div className="pc-card pp-section">
            {!submittedReview ? (
              <>
                <h2 className="pp-section__title">¿Cómo estuvo todo?</h2>
                <StarRating value={stars} onChange={setStars} />

                {isLowRating && context.tags.length > 0 && (
                  <div className="pp-tags">
                    {context.tags.map((tag) => (
                      <button
                        key={tag.id}
                        type="button"
                        className={`pp-tag ${selectedTags.includes(tag.id) ? 'pp-tag--on' : ''}`}
                        onClick={() => toggleTag(tag.id)}
                      >
                        {tag.emoji ? `${tag.emoji} ` : ''}{tag.name}
                      </button>
                    ))}
                  </div>
                )}

                {isLowRating && (
                  <textarea
                    className="pp-comment"
                    placeholder="¿Querés contarnos algo más? (opcional)"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    maxLength={1000}
                    rows={3}
                  />
                )}

                {stars > 0 && context.staff.length > 1 && (
                  <label className="pp-field">
                    <span className="pp-field__label">¿Quién te atendió?</span>
                    <select
                      className="pp-select"
                      value={waiterId || ''}
                      onChange={(e) => setWaiterId(e.target.value ? parseInt(e.target.value, 10) : null)}
                    >
                      <option value="">Prefiero no decir</option>
                      {context.staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </label>
                )}

                {reviewError && <p className="pp-error">{reviewError}</p>}

                <button
                  type="button"
                  className={`pp-btn ${isLowRating ? 'pp-btn--danger' : 'pp-btn--star'}`}
                  onClick={handleSubmitReview}
                  disabled={stars < 1 || submitting}
                >
                  {submitting ? 'Enviando…' : 'Enviar valoración'}
                </button>
              </>
            ) : (
              <>
                <div className="pp-thanks__icon"><FaCheckCircle /></div>
                <h2 className="pp-section__title">¡Gracias por tu valoración!</h2>
                {context.branch.googleMapsReviewUrl && (
                  <>
                    <p className="pp-thanks__copy">
                      Si te gustó, ayudanos contándolo en Google. Suma muchísimo.
                    </p>
                    <button
                      type="button"
                      className={`pp-btn pp-btn--google ${googleClicked ? 'pp-btn--done' : ''}`}
                      onClick={handleGoogleClick}
                    >
                      <FaGoogle /> Dejá tu reseña en Google Maps
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Sección PostPago: Club VIP (siempre) ── */}
        {isPaid && context && (
          <div className="pc-card pp-section pp-club">
            {!clubResult ? (
              <>
                <h2 className="pp-section__title">
                  Sumate al Club{club && club.reward ? ` · ${club.reward}` : ''}
                </h2>
                <p className="pp-club__copy">
                  Dejá tu WhatsApp y juntá visitas para tu premio.
                </p>
                <div className="pp-club__form">
                  <input
                    className="pp-input"
                    type="tel"
                    inputMode="tel"
                    placeholder="Tu WhatsApp (ej: 11 2345 6789)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <button
                    type="button"
                    className="pp-btn pp-btn--club"
                    onClick={handleJoinClub}
                    disabled={!phone.trim() || joining}
                  >
                    <FaWhatsapp /> {joining ? 'Sumando…' : 'Sumarme'}
                  </button>
                </div>
                {clubError && <p className="pp-error">{clubError}</p>}
              </>
            ) : (
              <>
                <h2 className="pp-section__title">
                  {clubReached ? '¡Alcanzaste el premio! 🎉' : '¡Ya sos parte! 🎉'}
                </h2>
                <div className="pp-club__progress">
                  <span className="pp-club__count">{clubResult.visits}</span>
                  <span className="pp-club__of"> de {clubResult.goal} visitas</span>
                </div>
                <p className="pp-club__copy">
                  {clubReached
                    ? `Pedíle tu ${clubResult.reward} al mozo en tu próxima visita.`
                    : `Seguí sumando para tu ${clubResult.reward}.`}
                </p>
              </>
            )}
          </div>
        )}

        {/* Volver al inicio — única salida de esta pantalla. Mientras no se
            apriete, UserScreen devuelve acá (ver flag sticky arriba). */}
        {(isPaid || isFailed || (isPending && timedOut)) && (
          <button type="button" className="pp-back" onClick={handleGoHome}>
            <FaArrowLeft /> Volver al inicio
          </button>
        )}
      </div>
    </Phone>
  );
};

export default PagoConfirmadoPage;
