import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCompany, updateCompany, createBranch, deleteBranch, getBranches } from '../services/api';
import './CompanyConfig.css';
import { FaEye, FaSave, FaStore, FaCog, FaTrash, FaPlus, FaDownload, FaCalendarAlt } from 'react-icons/fa';
import '../styles/common.css';
import AdminHeader from './AdminHeader';
import EventConfigModal from './EventConfigModal';

const CompanyConfig = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEventConfigModal, setShowEventConfigModal] = useState(false);
  const [editedCompany, setEditedCompany] = useState({
    name: "",
    website: "",
    menu: "",
    branchIds: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companyResponse, branchesResponse] = await Promise.all([
          getCompany(companyId),
          getBranches(companyId),
        ]);

        setCompany(companyResponse.data);
        setEditedCompany(companyResponse.data);
        setBranches(branchesResponse.data || []);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, [companyId]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedCompany((prev) => ({ ...prev, [name]: value }));
  };


  const handleDeleteBranch = async (branchId) => {
    // Mejor UX para móvil con confirmación más clara
    const branchName =
      branches.find((b) => b.id === branchId)?.name || "esta sucursal";
    const isConfirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar "${branchName}"? Esta acción no se puede deshacer.`
    );
    if (!isConfirmed) return;

    try {
      await deleteBranch(branchId);
      const updatedCompany = {
        ...company,
        branchIds: company.branchIds.filter((id) => id !== branchId),
      };
      setCompany(updatedCompany);
      setEditedCompany(updatedCompany);
      setBranches(branches.filter((branch) => branch.id !== branchId));
      await updateCompany(companyId, updatedCompany);
    } catch (error) {
      console.error("Error deleting branch:", error);
      alert("Error al eliminar la sucursal. Por favor, intenta nuevamente.");
    }
  };

  const handleSave = async () => {
    const isConfirmed = window.confirm(
      "¿Estás seguro de que deseas guardar los cambios en esta compañía?"
    );
    if (!isConfirmed) return;

    try {
      await updateCompany(companyId, editedCompany);
      setCompany(editedCompany);
      alert("Compañía actualizada exitosamente");
    } catch (error) {
      console.error("Error updating company:", error);
      alert("Error al actualizar la compañía. Por favor, intenta nuevamente.");
    }
  };

  const handleAddBranch = async () => {
    const newBranch = {
      name: `New Branch ${branches.length + 1}`,
      companyId: parseInt(companyId),
      website: "",
      menu: "",
      tableIds: [],
    };

    try {
      const response = await createBranch(newBranch);
      const updatedCompany = {
        ...company,
        branchIds: [...company.branchIds, response.data.id],
      };
      setCompany(updatedCompany);
      setEditedCompany(updatedCompany);
      setBranches([...branches, response.data]);
      await updateCompany(companyId, updatedCompany);
    } catch (error) {
      console.error("Error adding new branch:", error);
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
            <div className="company-actions">
              <button className="app-button success" onClick={handleSave}>
                <FaSave /> Guardar Cambios
              </button>
              <button 
                className="app-button primary"
                onClick={() => setShowEventConfigModal(true)}
              >
                <FaCalendarAlt /> Configurar Eventos
              </button>
            </div>
          </div>

          <div className="branches-section">
            <div className="branches-header">
              <h3>Sucursales</h3>
              <div className="header-buttons">
                <button className="app-button success" onClick={handleAddBranch}>
                  <FaPlus /> <FaStore /> Agregar Sucursal
                </button>
              </div>
            </div>

            <div className="branches-grid">
              {branches.map((branch, index) => (
                <div key={branch.id} className="branch-card">
                  <div className="branch-card-header">
                    <span className="branch-number">{index + 1}</span>
                    <h4 className="branch-name">{branch.name}</h4>
                  </div>

                  <div className="branch-card-body">
                    <p className="branch-description">
                      {branch.description || "Sin descripción"}
                    </p>
                  </div>

                  <div className="branch-card-actions">
                    <button
                      className="app-button small"
                      onClick={() =>
                        navigate(`/admin/${companyId}/${branch.id}`)
                      }
                      title="Ver sucursal"
                    >
                      <FaEye /> Ver
                    </button>
                    <button
                      className="app-button small warning"
                      onClick={() =>
                        navigate(`/admin/${companyId}/${branch.id}/config`)
                      }
                      title="Configurar sucursal"
                    >
                      <FaCog /> Configurar
                    </button>
                    <button
                      className="app-button small danger"
                      onClick={() => handleDeleteBranch(branch.id)}
                      title="Eliminar sucursal"
                    >
                      <FaTrash /> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {branches.length === 0 && (
              <div
                style={{ textAlign: "center", padding: "2rem", color: "#666" }}
              >
                No hay sucursales creadas. ¡Agrega tu primera sucursal!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Event Configuration Modal */}
      <EventConfigModal
        isOpen={showEventConfigModal}
        onClose={() => setShowEventConfigModal(false)}
        resourceType="company"
        resourceId={companyId}
        companyId={companyId}
        resourceName={company?.name || 'Company'}
      />
    </div>
  );
};

export default CompanyConfig;
