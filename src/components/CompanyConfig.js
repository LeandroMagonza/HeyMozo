import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompany, updateCompany, createBranch, deleteBranch, getBranches } from '../services/api';
import './CompanyConfig.css';

const CompanyConfig = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editedCompany, setEditedCompany] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companyResponse, branchesResponse] = await Promise.all([
          getCompany(companyId),
          getBranches(companyId)
        ]);
        setCompany(companyResponse.data);
        setEditedCompany(companyResponse.data);
        setBranches(branchesResponse.data);
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
    <div className="company-config">
      <h2>Configuración de Compañía</h2>
      <div className="company-details">
        <input
          type="text"
          name="name"
          value={editedCompany.name}
          onChange={handleInputChange}
          placeholder="Company Name"
        />
        <input
          type="text"
          name="website"
          value={editedCompany.website}
          onChange={handleInputChange}
          placeholder="Website"
        />
        <input
          type="text"
          name="menu"
          value={editedCompany.menu}
          onChange={handleInputChange}
          placeholder="Menu URL"
        />
        <button className="app-button" onClick={handleSave}>Guardar Cambios</button>
      </div>

      <h3>Sucursales</h3>
      <button className="app-button" onClick={handleAddBranch}>Agregar Nueva Sucursal</button>
      <table className="branches-table">
        <tbody>
          {branches.map((branch, index) => (
            <tr key={branch.id} className="branch-row">
              <td>{index + 1}. {branch.name}</td>
              <td>
                <button className="app-button" onClick={() => navigate(`/admin/${companyId}/${branch.id}`)}>
                  Ver Sucursal
                </button>
              </td>
              <td>
                <button className="app-button" onClick={() => navigate(`/admin/${companyId}/${branch.id}/config`)}>
                  Configurar Sucursal
                </button>
              </td>
              <td>
                <button className="app-button" onClick={() => handleDeleteBranch(branch.id)}>Eliminar Sucursal</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default CompanyConfig;
