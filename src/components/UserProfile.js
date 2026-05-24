import React, { useState, useEffect } from 'react';
import { getMyProfile, updateMyProfile } from '../services/api';
import './UserProfile.css';
import { FaSave, FaUser } from 'react-icons/fa';
import AdminHeader from './AdminHeader';

const ROLE_LABELS = {
  waiter: 'Mozo',
  cashier: 'Cajero',
  owner: 'Dueño',
  platformAdmin: 'Admin de plataforma',
};

const UserProfile = () => {
  const [profile, setProfile] = useState(null);
  const [mpAlias, setMpAlias] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        setProfile(res.data);
        setMpAlias(res.data.mpAlias || '');
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error loading profile:', err);
        setLoading(false);
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateMyProfile({ mpAlias });
      setProfile((prev) => ({ ...prev, ...res.data }));
      alert('Perfil actualizado correctamente');
    } catch (err) {
      console.error('Error saving profile:', err);
      alert('Error al guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading">Cargando...</div>;

  return (
    <div className="admin-container">
      <AdminHeader
        title="Mi Perfil"
        showBackButton
        backUrl="/config"
      />
      <div className="admin-content">
        <div className="user-profile">
          <section className="up-section">
            <div className="up-avatar">
              <FaUser className="up-avatar__icon" />
            </div>

            <div className="up-info-row">
              <span className="up-label">Email</span>
              <span className="up-value">{profile?.email}</span>
            </div>
            <div className="up-info-row">
              <span className="up-label">Rol</span>
              <span className="up-value">
                {ROLE_LABELS[profile?.role] || profile?.role}
              </span>
            </div>
          </section>

          <section className="up-section">
            <h2 className="up-section__title">Mercado Pago</h2>
            <div className="up-field">
              <label htmlFor="mpAlias">Mi alias de Mercado Pago</label>
              <input
                id="mpAlias"
                type="text"
                value={mpAlias}
                onChange={(e) => setMpAlias(e.target.value)}
                placeholder="mi.alias"
              />
              <p className="up-hint">
                Se muestra al cliente como destino para propinas (mientras el Marketplace MP no esté activado en tu sucursal).
              </p>
            </div>

            <button
              className="app-button success up-save-btn"
              onClick={handleSave}
              disabled={saving}
            >
              <FaSave /> {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
