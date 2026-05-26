// src/hooks/usePendingPayment.js
//
// Polling del Payment activo (pending o awaiting_validation) de la sesión
// del cliente. Devuelve el payment vigente (o null), la función para
// cancelarlo y un refresh manual.
//
// Cuando el payment transita de pending/awaiting_validation → paid (porque
// el mozo cobró cash/card, o el cajero validó la transfer/MODO), redirige
// automáticamente al `/pago-confirmado/:id` sin importar en qué pantalla
// esté el cliente. Si transita a failed (cajero rechazó la transfer), el
// banner desaparece y el cliente puede elegir otro método.
//
// Mantiene en un ref el último id observado para distinguir "todavía no
// había payment" de "estaba activo y ahora desapareció" (paid o failed).

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getPendingPayment,
  getPaymentStatus,
  cancelPayment as apiCancelPayment,
} from '../services/api';

const POLL_MS = 4000;

export default function usePendingPayment() {
  const { companyId, branchId, tableId } = useParams();
  const navigate = useNavigate();
  const [payment, setPayment] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const lastPaymentRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!tableId) return;
    try {
      const { data } = await getPendingPayment(tableId);
      const next = data.payment || null;

      if (next) {
        setPayment(next);
        lastPaymentRef.current = next;
        return;
      }

      // Acabamos de transitar de pending → algo. Lo más probable es paid (el
      // mozo apretó "Cobré"); también puede ser failed si el cliente lo
      // canceló localmente. Para paid → redirect a /pago-confirmado.
      if (lastPaymentRef.current) {
        const lastId = lastPaymentRef.current.id;
        try {
          const { data: s } = await getPaymentStatus(lastId);
          if (s && s.status === 'paid' && companyId && branchId && tableId) {
            navigate(
              `/m/${companyId}/${branchId}/${tableId}/pago-confirmado/${lastId}`,
              { replace: true }
            );
          }
        } catch (_) {
          // No autorizado o 404 — limpiamos el estado igual.
        }
        lastPaymentRef.current = null;
      }
      setPayment(null);
    } catch (err) {
      // No queremos meter ruido al cliente — silenciamos.
      console.warn('usePendingPayment poll error:', err.message);
    }
  }, [tableId, companyId, branchId, navigate]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, POLL_MS);
    return () => clearInterval(i);
  }, [refresh]);

  const cancel = useCallback(async () => {
    if (!payment || cancelling) return false;
    setCancelling(true);
    try {
      await apiCancelPayment(payment.id);
      lastPaymentRef.current = null;
      setPayment(null);
      return true;
    } catch (err) {
      console.error('Error cancelando pago:', err);
      alert(
        (err && err.response && err.response.data && err.response.data.error)
          || 'No se pudo cancelar el pago.'
      );
      return false;
    } finally {
      setCancelling(false);
    }
  }, [payment, cancelling]);

  return { payment, cancel, cancelling, refresh };
}
