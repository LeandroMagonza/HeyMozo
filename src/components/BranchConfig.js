import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getBranch, getTables, updateBranch, updateTable, createTable, deleteTable } from '../services/api';
import './BranchConfig.css';

const BranchConfig = () => {
  const { branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [branchResponse, tablesResponse] = await Promise.all([
        getBranch(branchId),
        getTables(branchId)
      ]);

      setBranch(branchResponse.data);
      
      const sortedTables = branchResponse.data.tableIds
        .map(id => tablesResponse.data.find(table => table.id === id))
        .filter(Boolean);

      setTables(sortedTables);
      setLoading(false);

      console.log('Branch data:', branchResponse.data);
      console.log('Tables data:', tablesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      events: []
    };

    try {
      const response = await createTable(newTable);
      const createdTable = response.data;
      setTables(prevTables => [...prevTables, createdTable]);
      
      const updatedBranch = { ...branch, tableIds: [...branch.tableIds, createdTable.id] };
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      
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
      
      console.log('Table deleted:', id);
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  if (loading) {
    return <div>Cargando...</div>;
  }

  return (
    <div className="branch-config">
      <div className="branch-header">
        <h2>{branch?.name || 'Cargando...'}</h2>
      </div>

      <div className="add-table-container">
        <button className="app-button add-table-btn" onClick={handleAddTable}>Agregar Mesa</button>
      </div>

      <ul className="tables-list">
        {tables.map((table, index) => (
          <li key={table.id} className="table-item">
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
            <button className="app-button delete-table-btn" onClick={() => handleDeleteTable(table.id)}>Eliminar</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BranchConfig;
