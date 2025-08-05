import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, deleteCompany, createCompany } from '../services/api';
import './CompanyList.css';
import AdminHeader from './AdminHeader';

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

  const handleDeleteCompany = async (id) => {
    const isConfirmed = window.confirm("¿Está seguro de que desea eliminar esta compañía?");
    if (!isConfirmed) return;

    try {
      await deleteCompany(id);
      fetchCompanies();
    } catch (error) {
      console.error('Error deleting company:', error);
    }
  };

  const handleAddCompany = () => {
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
      <button className="app-button add-company-btn" onClick={handleAddCompany}>Agregar Compañía</button>
      
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
                <td>{index + 1}. {company.name}</td>
                <td className="company-actions">
                  <button 
                    className="app-button"
                    onClick={() => navigate(`/admin/${company.id}/config`)}
                  >
                    Configurar Compañía
                  </button>
                  <button 
                    className="app-button"
                    onClick={() => handleDeleteCompany(company.id)}
                  >
                    Eliminar
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
