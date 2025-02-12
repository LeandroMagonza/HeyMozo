import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { getBranch, getTables, updateBranch, updateTable, createTable, deleteTable, getCompany } from '../services/api';
import './BranchConfig.css';
import { FaEye, FaQrcode, FaChair, FaSave, FaTrash } from 'react-icons/fa';
import '../styles/common.css';

const BranchConfig = () => {
  const { companyId, branchId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [branch, setBranch] = useState(null);
  const [editedBranch, setEditedBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [companyResponse, branchResponse, tablesResponse] = await Promise.all([
        getCompany(companyId),
        getBranch(branchId),
        getTables(branchId)
      ]);

      setCompany(companyResponse.data);
      setBranch(branchResponse.data);
      setEditedBranch(branchResponse.data);
      
      const sortedTables = branchResponse.data.tableIds
        .map(id => tablesResponse.data.find(table => table.id === id))
        .filter(Boolean);

      setTables(sortedTables);
      setLoading(false);

    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, [companyId, branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBranchInputChange = (e) => {
    const { name, value } = e.target;
    setEditedBranch(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBranch = async () => {
    try {
      await updateBranch(branchId, editedBranch);
      setBranch(editedBranch);
      alert('Sucursal actualizada correctamente');
    } catch (error) {
      console.error('Error actualizando sucursal:', error);
      alert('Error al actualizar sucursal');
    }
  };

  const handleTableChange = (id, field, value) => {
    setTables(prevTables => 
      prevTables.map(table =>
        table.id === id ? { ...table, [field]: value } : table
      )
    );
  };

  const handleTableBlur = async (id) => {
    const tableToUpdate = tables.find(table => table.id === id);
    if (!tableToUpdate) return;

    try {
      await updateTable(id, tableToUpdate);
      console.log('Table updated:', tableToUpdate);
    } catch (error) {
      console.error('Error updating table:', error);
    }
  };
  const handleAddTable = async () => {
    const newTableNumber = tables.length + 1;
    const newTable = {
      tableName: `Mesa ${newTableNumber}`,
      tableDescription: "Descripción por defecto",
      branchId: parseInt(branchId),
      events: [{
        "type": "MARK_AVAILABLE",
        "createdAt": new Date().toISOString(),
        "message": null
      }]
    };

    try {
      const response = await createTable(newTable);
      const createdTable = response.data;
      setTables(prevTables => [...prevTables, createdTable]);
      
      const updatedBranch = { ...branch, tableIds: [...branch.tableIds, createdTable.id] };
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      setEditedBranch(updatedBranch);
      
      console.log('New table added:', createdTable);
      console.log('Branch updated with new table:', updatedBranch);
    } catch (error) {
      console.error('Error adding new table:', error);
    }
  };

  const handleDeleteTable = async (id) => {
    try {
      await deleteTable(id);
      setTables(prevTables => prevTables.filter(table => table.id !== id));
      
      const updatedBranch = { ...branch, tableIds: branch.tableIds.filter(tableId => tableId !== id) };
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      setEditedBranch(updatedBranch);
      
      console.log('Table deleted:', id);
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(tables);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTables(items);

    const updatedTableIds = items.map(table => table.id);
    const updatedBranch = { ...branch, tableIds: updatedTableIds };

    try {
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      setEditedBranch(updatedBranch);
      console.log('Branch updated with new table order:', updatedBranch);
    } catch (error) {
      console.error('Error updating branch with new table order:', error);
      // Revert the local state if the API call fails
      setTables(tables);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="admin-container">
      <div className="admin-content">
        <div className="branch-config">
          <div className="header-row">
            <h2>Configuración de Sucursal - {company?.name || 'Cargando...'}</h2>
            <button 
              className="app-button"
              onClick={() => navigate(`/admin/${companyId}/${branchId}`)}
            >
              <FaEye /> Ver Sucursal
            </button>
          </div>

          <div className="branch-details">
            <div className="input-group">
              <label>Nombre de Sucursal</label>
              <input
                type="text"
                name="name"
                value={editedBranch.name}
                onChange={handleBranchInputChange}
                placeholder="Ingrese nombre de sucursal"
              />
            </div>
            <div className="input-group">
              <label>Sitio Web</label>
              <input
                type="text"
                name="website"
                value={editedBranch.website}
                onChange={handleBranchInputChange}
                placeholder="Ingrese URL del sitio web"
              />
            </div>
            <div className="input-group">
              <label>URL del Menú</label>
              <input
                type="text"
                name="menu"
                value={editedBranch.menu}
                onChange={handleBranchInputChange}
                placeholder="Ingrese URL del menú"
              />
            </div>
            <div className="input-group">
              <label>URL del Logo</label>
              <input
                type="text"
                name="logo"
                value={editedBranch.logo}
                onChange={handleBranchInputChange}
                placeholder="Ingrese URL del logo"
              />
            </div>
          </div>

          <div className="branch-actions-row">
            <button className="app-button" onClick={handleSaveBranch}>
              <FaSave /> Guardar Cambios
            </button>
          </div>

          <hr className="section-divider" />

          <div className="tables-section">
            <div className="section-header">
              <h3>Mesas</h3>
              <div className="section-actions">
                <button className="app-button add-table-btn" onClick={handleAddTable}>
                  <FaChair /> Agregar Mesa
                </button>
                <button className="app-button" onClick={() => navigate(`/admin/${companyId}/${branchId}/urls`)}>
                  <FaQrcode /> Descargar URLs
                </button>
              </div>
            </div>

            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="tables">
                {(provided) => (
                  <ul {...provided.droppableProps} ref={provided.innerRef} className="tables-list">
                    {tables.map((table, index) => (
                      <Draggable key={table.id} draggableId={table.id.toString()} index={index}>
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="table-item"
                          >
                            <div className="table-info">
                              <span className="table-number">{index + 1}</span>
                              <input
                                type="text"
                                value={table.tableName}
                                onChange={(e) => handleTableChange(table.id, 'tableName', e.target.value)}
                                onBlur={() => handleTableBlur(table.id)}
                                className="table-name-input"
                              />
                              <input
                                type="text"
                                value={table.tableDescription}
                                onChange={(e) => handleTableChange(table.id, 'tableDescription', e.target.value)}
                                onBlur={() => handleTableBlur(table.id)}
                                className="table-description-input"
                              />
                            </div>
                            <div className="table-actions">
                              <button 
                                className="app-button small"
                                onClick={() => navigate(`/user/${companyId}/${branchId}/${table.id}`)}
                              >
                                <FaEye /> Ver
                              </button>
                              <button 
                                className="app-button small delete-btn" 
                                onClick={() => handleDeleteTable(table.id)}
                              >
                                <FaTrash /> Eliminar
                              </button>
                            </div>
                          </li>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </ul>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BranchConfig;
