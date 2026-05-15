import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { FaCashRegister, FaSignOutAlt, FaUser } from 'react-icons/fa';
import authService from '../services/authService';
import './CajaShell.css';

const CajaShell = () => {
  const { branchId } = useParams();
  const currentUser = authService.getCurrentUser();

  const handleLogout = () => {
    if (window.confirm('¿Está seguro que desea cerrar sesión?')) {
      authService.logout();
    }
  };

  return (
    <div className="caja-shell">
      <aside className="caja-shell__sidebar">
        <div className="caja-shell__brand">
          <span className="caja-shell__brand-name">HeyMozo</span>
          <span className="caja-shell__brand-role">Caja</span>
        </div>

        <nav className="caja-shell__nav">
          <NavLink
            to={`/caja/${branchId}`}
            end
            className={({ isActive }) =>
              `caja-shell__nav-item${isActive ? ' caja-shell__nav-item--active' : ''}`
            }
          >
            <FaCashRegister className="caja-shell__nav-icon" />
            <span>Panel de caja</span>
          </NavLink>
        </nav>

        <div className="caja-shell__footer">
          {currentUser && (
            <>
              <div className="caja-shell__user">
                <FaUser className="caja-shell__user-icon" />
                <span className="caja-shell__user-email">{currentUser.email}</span>
              </div>
              <button className="caja-shell__logout" onClick={handleLogout}>
                <FaSignOutAlt />
                Cerrar sesión
              </button>
            </>
          )}
        </div>
      </aside>

      <main className="caja-shell__main">
        <header className="caja-shell__topnav">
          <h1 className="caja-shell__topnav-title">Panel de Caja</h1>
        </header>
        <div className="caja-shell__content">
          <div className="caja-shell__placeholder">
            <p className="caja-shell__placeholder-title">Dashboard de caja</p>
            <p className="caja-shell__placeholder-desc">
              Esta pantalla mostrará el panel del cajero (sucursal {branchId}).
              Disponible en el próximo sprint.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CajaShell;
