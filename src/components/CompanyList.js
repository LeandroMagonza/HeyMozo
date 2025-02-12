import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCompanies, deleteCompany, createCompany } from '../services/api';
import './CompanyList.css';

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

  const handleAddCompany = async () => {
    const newCompany = {
      name: `Nueva Compañía ${companies.length + 1}`,
      website: '',
      menu: '',
      branchIds: []
    };

    try {
      const response = await createCompany(newCompany);
      if (response.data) {
        await fetchCompanies();
      }
    } catch (error) {
      console.error('Error adding new company:', error);
      alert('Error al crear la compañía');
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="company-list">
      <h2>Compañías</h2>
      <button className="app-button add-company-btn" onClick={handleAddCompany}>Agregar Compañía</button>
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
    </div>
  );
};

export default CompanyList;
