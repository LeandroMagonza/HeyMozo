import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompany, updateCompany, createBranch, deleteBranch, getBranches } from '../services/api';
import './CompanyConfig.css';
import { FaEye, FaSave, FaStore, FaCog, FaTrash } from 'react-icons/fa';
import '../styles/common.css';
import AdminHeader from './AdminHeader';

const CompanyConfig = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedCompany, setEditedCompany] = useState({
    name: '',
    website: '',
    menu: '',
    branchIds: []
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companyResponse, branchesResponse] = await Promise.all([
          getCompany(companyId),
          getBranches(companyId)
        ]);

        setCompany(companyResponse.data);
        setEditedCompany(companyResponse.data);
        setBranches(branchesResponse.data || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCompany(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await updateCompany(companyId, editedCompany);
      setCompany(editedCompany);
      alert('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      alert('Failed to update company');
    }
  };

  const handleAddBranch = async () => {
    const newBranch = {
      name: `New Branch ${branches.length + 1}`,
      companyId: parseInt(companyId),
      website: '',
      menu: '',
      tableIds: []
    };

    try {
      const response = await createBranch(newBranch);
      const updatedCompany = {
        ...company,
        branchIds: [...company.branchIds, response.data.id]
      };
      setCompany(updatedCompany);
      setEditedCompany(updatedCompany);
      setBranches([...branches, response.data]);
      await updateCompany(companyId, updatedCompany);
    } catch (error) {
      console.error('Error adding new branch:', error);
    }
  };

  const handleDeleteBranch = async (branchId) => {
    const isConfirmed = window.confirm("Seguro que desea eliminar esta sucursal?");
    if (!isConfirmed) return;

    try {
      await deleteBranch(branchId);
      const updatedCompany = {
        ...company,
        branchIds: company.branchIds.filter(id => id !== branchId)
      };
      setCompany(updatedCompany);
      setEditedCompany(updatedCompany);
      setBranches(branches.filter(branch => branch.id !== branchId));
      await updateCompany(companyId, updatedCompany);
    } catch (error) {
      console.error('Error deleting branch:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="admin-container">
      <AdminHeader 
        title="Configuración de Compañía"
        showBackButton={true}
        backUrl="/admin/config"
      />
      <div className="admin-content">
        <div className="company-config">
          <div className="company-details">
            <div className="input-group">
              <label>Nombre de Compañía</label>
              <input
                type="text"
                name="name"
                value={editedCompany.name}
                onChange={handleInputChange}
                placeholder="Ingrese nombre de compañía"
              />
            </div>
            <div className="input-group">
              <label>Sitio Web</label>
              <input
                type="text"
                name="website"
                value={editedCompany.website}
                onChange={handleInputChange}
                placeholder="Ingrese URL del sitio web"
              />
            </div>
            <div className="input-group">
              <label>URL del Menú</label>
              <input
                type="text"
                name="menu"
                value={editedCompany.menu}
                onChange={handleInputChange}
                placeholder="Ingrese URL del menú"
              />
            </div>
            <button className="app-button" onClick={handleSave}>
              <FaSave /> Guardar Cambios
            </button>
          </div>

          <div className="branches-section">
            <div className="branches-header">
              <h3>Sucursales</h3>
              <button className="app-button" onClick={handleAddBranch}>
                <FaStore /> Agregar Nueva Sucursal
              </button>
            </div>
            <table className="branches-table">
              <tbody>
                {branches.map((branch, index) => (
                  <tr key={branch.id} className="branch-row">
                    <td>{index + 1}. {branch.name}</td>
                    <td className="branch-actions">
                      <button 
                        className="app-button small"
                        onClick={() => navigate(`/admin/${companyId}/${branch.id}`)}
                      >
                        <FaEye /> Ver
                      </button>
                      <button 
                        className="app-button small"
                        onClick={() => navigate(`/admin/${companyId}/${branch.id}/config`)}
                      >
                        <FaCog /> Configurar
                      </button>
                      <button 
                        className="app-button small delete-btn"
                        onClick={() => handleDeleteBranch(branch.id)}
                      >
                        <FaTrash /> Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompanyConfig;
