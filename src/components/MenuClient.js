// src/components/MenuClient.js
// Route: /m/:companyId/:branchId/:tableId/menu
// Browse-only menu for customers. Cart/ordering comes in Sprint 3.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Phone from './Phone';
import { getBranch, getCompany, getPublicMenu } from '../services/api';
import './MenuClient.css';

const formatPrice = (cents) => {
  const pesos = cents / 100;
  return pesos.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
};

const MenuClient = () => {
  const { companyId, branchId, tableId } = useParams();
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [externalMenu, setExternalMenu] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [loading, setLoading] = useState(true);

  const sectionRefs = useRef({});
  const pillsRef = useRef(null);
  const scrollingFromPill = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [menuRes, branchRes, companyRes] = await Promise.all([
          getPublicMenu(branchId),
          getBranch(branchId),
          getCompany(companyId),
        ]);

        const cats = menuRes.data.categories || [];
        setCategories(cats);
        if (cats.length > 0) setActiveCategoryId(cats[0].id);

        setExternalMenu(branchRes.data.menu || '');
        setRestaurantName(companyRes.data.name || '');
      } catch (err) {
        console.error('Error cargando menú:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [branchId, companyId]);

  // Scroll to category section when pill is clicked
  const handlePillClick = (catId) => {
    setActiveCategoryId(catId);
    scrollingFromPill.current = true;
    const el = sectionRefs.current[catId];
    if (el) {
      // Header (49px) + pills (44px) + gap (8px) = 101px offset
      const offset = 101;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    setTimeout(() => { scrollingFromPill.current = false; }, 700);
  };

  // Track active category while scrolling
  useEffect(() => {
    const handleScroll = () => {
      if (scrollingFromPill.current) return;
      const offset = 110;
      let current = null;
      for (const cat of categories) {
        const el = sectionRefs.current[cat.id];
        if (el && el.getBoundingClientRect().top <= offset) {
          current = cat.id;
        }
      }
      if (current && current !== activeCategoryId) {
        setActiveCategoryId(current);
        // Scroll the active pill into view
        const pill = pillsRef.current?.querySelector(`[data-cat="${current}"]`);
        if (pill) pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, activeCategoryId]);

  const handleBack = () => {
    navigate(-1);
  };

  if (loading) {
    return (
      <Phone className="menu-client">
        <div className="menu-client__loading">
          <span className="material-symbols-outlined menu-client__loading-icon">restaurant_menu</span>
          <p>Cargando menú...</p>
        </div>
      </Phone>
    );
  }

  if (categories.length === 0) {
    return (
      <Phone className="menu-client">
        <header className="menu-client__header">
          <button className="menu-client__back" onClick={handleBack} type="button">
            <span className="material-symbols-outlined">arrow_back_ios</span>
          </button>
          <span className="menu-client__header-title">Menú</span>
        </header>
        <div className="menu-client__empty">
          <span className="material-symbols-outlined menu-client__empty-icon">restaurant_menu</span>
          <p className="menu-client__empty-text">El menú no está disponible por el momento.</p>
          {externalMenu && (
            <a
              className="menu-client__external-link"
              href={externalMenu}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver menú externo
            </a>
          )}
        </div>
      </Phone>
    );
  }

  return (
    <Phone className="menu-client">
      {/* Sticky header */}
      <header className="menu-client__header">
        <button className="menu-client__back" onClick={handleBack} type="button">
          <span className="material-symbols-outlined">arrow_back_ios</span>
        </button>
        <span className="menu-client__header-title">
          {restaurantName ? `${restaurantName}` : 'Menú'}
        </span>
      </header>

      {/* Sticky category pills */}
      <div className="menu-client__pills-wrap" ref={pillsRef}>
        <div className="menu-client__pills">
          {categories.map((cat) => (
            <button
              key={cat.id}
              data-cat={cat.id}
              type="button"
              className={`menu-client__pill${activeCategoryId === cat.id ? ' menu-client__pill--active' : ''}`}
              onClick={() => handlePillClick(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Category sections */}
      <main className="menu-client__main">
        {categories.map((cat) => (
          <section
            key={cat.id}
            className="menu-client__section"
            ref={(el) => { sectionRefs.current[cat.id] = el; }}
          >
            <h2 className="menu-client__section-title">{cat.name}</h2>
            {(!cat.items || cat.items.length === 0) ? (
              <p className="menu-client__section-empty">Sin ítems disponibles en este momento.</p>
            ) : (
              <div className="menu-client__items">
                {cat.items.map((item) => (
                  <div key={item.id} className="menu-client__item">
                    <div className="menu-client__item-info">
                      <h3 className="menu-client__item-name">{item.name}</h3>
                      {item.description && (
                        <p className="menu-client__item-desc">{item.description}</p>
                      )}
                      <span className="menu-client__item-price">{formatPrice(item.priceCents)}</span>
                    </div>
                    <div className="menu-client__item-image-wrap">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="menu-client__item-image"
                          loading="lazy"
                        />
                      ) : (
                        <div className="menu-client__item-image-placeholder">
                          <span className="material-symbols-outlined">lunch_dining</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
        <div className="menu-client__bottom-spacer" />
      </main>
    </Phone>
  );
};

export default MenuClient;
