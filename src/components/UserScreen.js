// src/components/UserScreen.js
//
// Cliente: pantalla de aterrizaje post-QR.
// Layout del redesign: header con logo+nombre, saludo gigante,
// 3 botones grandes (Ver Menu, Llamar al Mozo, Pagar), footer.
// El bottom sheet de mozo expone los availableEventTypes resueltos
// por el backend (getCustomerEventsForTable).

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import Phone from './Phone';
import DecorativeGlow from './DecorativeGlow';
import CallWaiterSheet from './CallWaiterSheet';
import HistoryModal from './HistoryModal';
import { getCompany, getBranch, getTable, sendEvent } from '../services/api';
import './UserScreen.css';

const EMPTY_GROUPS = { quickActions: [], mainActions: [], all: [] };

const UserScreen = () => {
  const { companyId, branchId, tableId } = useParams();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [table, setTable] = useState(null);
  const [availableEventTypes, setAvailableEventTypes] = useState(EMPTY_GROUPS);
  const [menuLink, setMenuLink] = useState('');
  const [userEvents, setUserEvents] = useState([]); // session-only history
  const [sheetOpen, setSheetOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toast, setToast] = useState(null); // { label, color }
  const scanSentRef = useRef(false);

  const addToLocalHistory = (eventType, message = null) => {
    setUserEvents((prev) => [
      {
        id: Date.now() + Math.random(),
        timestamp: new Date().toISOString(),
        eventName: eventType?.eventName || 'Evento',
        eventColor: eventType?.userColor || '#9333ea',
        fontColor: eventType?.userFontColor || '#ffffff',
        message,
        type: 'user_generated',
      },
      ...prev,
    ]);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const [companyData, branchData, tableData] = await Promise.all([
          getCompany(companyId),
          getBranch(branchId),
          getTable(tableId),
        ]);

        setCompany(companyData.data);
        setBranch(branchData.data);
        setTable(tableData.data);

        // Back devuelve { quickActions, mainActions, all }. Toleramos también
        // el formato array por compat con respuestas viejas.
        const raw = tableData.data.availableEventTypes;
        const groups = Array.isArray(raw)
          ? { quickActions: raw, mainActions: [], all: raw }
          : raw || EMPTY_GROUPS;
        setAvailableEventTypes(groups);

        const scanEventConfig = tableData.data.scanEvent;
        if (scanEventConfig) {
          addToLocalHistory(scanEventConfig);
        }

        const branchMenu = branchData.data.menu;
        const companyMenu = companyData.data.menu;
        setMenuLink(branchMenu || companyMenu || '');

        if (!scanSentRef.current) {
          scanSentRef.current = true;
          try {
            await sendEvent(tableId, { systemEventType: 'SCAN', message: null });
          } catch (err) {
            console.error('Error sending scan event:', err);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
      }
    };

    loadData();
  }, [companyId, branchId, tableId]);

  const showToast = (label, color) => {
    setToast({ label, color });
    setTimeout(() => setToast(null), 1800);
  };

  const handleEventTypeSelected = async (eventType) => {
    try {
      await sendEvent(tableId, { eventTypeId: eventType.id, message: null });
      addToLocalHistory(eventType);
      showToast(`✓ ${eventType.eventName} enviado`, eventType.userColor || '#9333ea');
    } catch (err) {
      console.error('Error sending event:', err);
      showToast('Hubo un error, intentá de nuevo', '#ef4444');
    } finally {
      setSheetOpen(false);
    }
  };

  const handleOpenMenu = () => {
    if (menuLink) window.open(menuLink, '_blank');
  };

  const restaurantName = company?.name || 'Cargando...';
  const tableName = table?.tableName ? `la ${table.tableName}` : '';
  const hasMenu = Boolean(menuLink);

  return (
    <Phone className="user-screen">
      <DecorativeGlow />

      <header className="user-screen__header">
        <div className="user-screen__brand">
          <div className="user-screen__brand-icon">
            <span className="material-symbols-outlined">restaurant</span>
          </div>
          <span className="user-screen__brand-name">{restaurantName}</span>
        </div>
      </header>

      <main className="user-screen__main">
        <div className="user-screen__greeting">
          <h1 className="user-screen__hello">¡Hola!</h1>
          {tableName && (
            <p className="user-screen__location">
              Estás en <span className="user-screen__table">{tableName}</span>
            </p>
          )}
          {branch?.name && (
            <p className="user-screen__branch">{branch.name}</p>
          )}
        </div>

        <div className="user-screen__actions">
          <button
            type="button"
            className="user-screen__cta user-screen__cta--menu rd-tap-scale"
            onClick={handleOpenMenu}
            disabled={!hasMenu}
            aria-disabled={!hasMenu}
          >
            <span className="material-symbols-outlined user-screen__cta-icon">restaurant_menu</span>
            <span className="user-screen__cta-label">
              {hasMenu ? 'Ver Menú' : 'Menú no disponible'}
            </span>
          </button>

          <button
            type="button"
            className="user-screen__cta user-screen__cta--waiter rd-tap-scale"
            onClick={() => setSheetOpen(true)}
            disabled={
              availableEventTypes.quickActions.length === 0 &&
              availableEventTypes.mainActions.length === 0
            }
          >
            <span className="material-symbols-outlined user-screen__cta-icon">notifications_active</span>
            <span className="user-screen__cta-label">Llamar al Mozo</span>
          </button>

          <button
            type="button"
            className="user-screen__cta user-screen__cta--pay user-screen__cta--coming-soon"
            disabled
            aria-disabled="true"
            title="Próximamente"
          >
            <span className="material-symbols-outlined user-screen__cta-icon">credit_card</span>
            <span className="user-screen__cta-label">
              Pagar / Dejar Propina
              <span className="user-screen__cta-pill">Próximamente</span>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="user-screen__history-link"
          onClick={() => setHistoryOpen(true)}
          disabled={userEvents.length === 0}
        >
          Ver mis avisos
        </button>
      </main>

      <footer className="user-screen__footer">
        <img src="/images/heymozo-logo.png" alt="HeyMozo" />
        <span>Tecnología HeyMozo</span>
      </footer>

      {toast && (
        <div className="user-screen__toast" style={{ background: toast.color }}>
          {toast.label}
        </div>
      )}

      <CallWaiterSheet
        open={sheetOpen}
        quickActions={availableEventTypes.quickActions}
        mainActions={availableEventTypes.mainActions}
        onSelect={handleEventTypeSelected}
        onClose={() => setSheetOpen(false)}
      />

      <HistoryModal
        show={historyOpen}
        onClose={() => setHistoryOpen(false)}
        events={userEvents}
        eventTypes={availableEventTypes.all}
      />
    </Phone>
  );
};

export default UserScreen;
