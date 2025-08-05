import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, deleteCompany, createCompany } from '../services/api';
import './CompanyList.css';
import AdminHeader from './AdminHeader';
import { FaPlus, FaCog, FaTrash, FaBuilding } from 'react-icons/fa';

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const response = await getCompanies();
      setCompanies(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching companies:', error);
      setLoading(false);
    }
  };

  const handleDeleteCompany = async (id, companyName) => {
    const isConfirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la compañía "${companyName}"? Esta acción no se puede deshacer.`
    );
    if (!isConfirmed) return;

    try {
      await deleteCompany(id);
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
      alert('Error al eliminar la compañía. Por favor, intenta nuevamente.');
    }
  };

  const handleAddCompany = () => {
    const isConfirmed = window.confirm(
      "¿Estás seguro de que deseas crear una nueva compañía?"
    );
    if (!isConfirmed) return;
    
    navigate('/admin/company/create');
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="company-list">
      <AdminHeader 
        title="Compañías"
        showBackButton={false}
      />
      <button className="app-button success add-company-btn" onClick={handleAddCompany}>
        <FaPlus /> <FaBuilding /> Agregar Compañía
      </button>
      
      {companies.length === 0 ? (
        <div className="no-companies-message">
          <p>No tienes compañías asignadas actualmente.</p>
          <p>Puedes crear una nueva compañía haciendo clic en el botón "Agregar Compañía".</p>
        </div>
      ) : (
        <table className="companies-table">
          <tbody>
            {companies.map((company, index) => (
              <tr key={company.id} className="company-row">
                <td>
                  <FaBuilding style={{ marginRight: '8px', color: '#666' }} />
                  {index + 1}. {company.name}
                </td>
                <td className="company-actions">
                  <button 
                    className="app-button warning"
                    onClick={() => navigate(`/admin/${company.id}/config`)}
                  >
                    <FaCog /> Configurar
                  </button>
                  <button 
                    className="app-button danger"
                    onClick={() => handleDeleteCompany(company.id, company.name)}
                  >
                    <FaTrash /> Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CompanyList;
