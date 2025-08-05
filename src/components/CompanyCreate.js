import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompany, updateCompany, createCompany } from '../services/api';
import './CompanyConfig.css';
import { FaSave, FaArrowLeft } from 'react-icons/fa';
import '../styles/common.css';
import AdminHeader from './AdminHeader';

const CompanyCreate = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editedCompany, setEditedCompany] = useState({
    name: '',
    website: '',
    menu: ''
  });

  const isEditMode = Boolean(companyId);

  useEffect(() => {
    if (isEditMode) {
      fetchCompanyData();
    }
  }, [companyId, isEditMode]);

  const fetchCompanyData = async () => {
    setLoading(true);
    try {
      const companyResponse = await getCompany(companyId);
      setCompany(companyResponse.data);
      setEditedCompany(companyResponse.data);
    } catch (error) {
      console.error('Error fetching company data:', error);
      // If company doesn't exist or user doesn't have permission, redirect to config
      navigate('/admin/config');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCompany(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // Basic validation
    if (!editedCompany.name.trim()) {
      alert('El nombre de la compañía es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (isEditMode) {
        // Update existing company
        await updateCompany(companyId, editedCompany);
        setCompany(editedCompany);
        alert('Compañía actualizada exitosamente');
      } else {
        // Create new company
        const response = await createCompany({
          ...editedCompany,
          branchIds: []
        });
        
        if (response.data) {
          alert('Compañía creada exitosamente');
          // Redirect to the new company's config page
          navigate(`/admin/${response.data.id}/config`);
        }
      }
    } catch (error) {
      console.error('Error saving company:', error);
      alert('Error al guardar la compañía');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (isEditMode) {
      navigate(`/admin/${companyId}/config`);
    } else {
      navigate('/admin/config');
    }
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <AdminHeader 
        title={isEditMode ? 'Editar Compañía' : 'Crear Nueva Compañía'}
        showBackButton={true}
        backUrl={isEditMode ? `/admin/${companyId}/config` : '/admin/config'}
      />
      
      <div className="admin-content">
        <div className="company-config">
          <div className="company-details">
            <div className="input-group">
              <label>Nombre de Compañía *</label>
              <input
                type="text"
                name="name"
                value={editedCompany.name}
                onChange={handleInputChange}
                placeholder="Ingrese nombre de compañía"
                disabled={saving}
              />
            </div>
            
            <div className="input-group">
              <label>Sitio Web</label>
              <input
                type="url"
                name="website"
                value={editedCompany.website}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com"
                disabled={saving}
              />
            </div>
            
            <div className="input-group">
              <label>URL del Menú</label>
              <input
                type="url"
                name="menu"
                value={editedCompany.menu}
                onChange={handleInputChange}
                placeholder="https://ejemplo.com/menu"
                disabled={saving}
              />
            </div>
            
            <div className="actions-group">
              <button 
                className="app-button primary" 
                onClick={handleSave}
                disabled={saving}
              >
                <FaSave /> {saving ? 'Guardando...' : (isEditMode ? 'Guardar Cambios' : 'Crear Compañía')}
              </button>
              
              <button 
                className="app-button secondary" 
                onClick={handleCancel}
                disabled={saving}
              >
                <FaArrowLeft /> Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyCreate; 