import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import {
  getBranch,
  getTables,
  updateBranch,
  updateTable,
  createTable,
  deleteTable,
} from "../services/api";
import "./BranchConfig.css";

const BranchConfig = () => {
  const { companyId, branchId } = useParams();
  const navigate = useNavigate();
  const [branch, setBranch] = useState(null);
  const [editedBranch, setEditedBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [branchResponse, tablesResponse] = await Promise.all([
        getBranch(branchId),
        getTables(branchId),
      ]);

      setBranch(branchResponse.data);
      setEditedBranch(branchResponse.data);

      const sortedTables = branchResponse.data.tableIds
        .map((id) => tablesResponse.data.find((table) => table.id === id))
        .filter(Boolean);

      setTables(sortedTables);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  }, [branchId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBranchInputChange = (e) => {
    const { name, value } = e.target;
    setEditedBranch((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveBranch = async () => {
    try {
      await updateBranch(branchId, editedBranch);
      setBranch(editedBranch);
      alert("Sucursal actualizada correctamente");
    } catch (error) {
      console.error("Error actualizando sucursal:", error);
      alert("Error al actualizar sucursal");
    }
  };

  const handleTableChange = (id, field, value) => {
    setTables((prevTables) =>
      prevTables.map((table) =>
        table.id === id ? { ...table, [field]: value } : table
      )
    );
  };

  const handleTableBlur = async (id) => {
    const tableToUpdate = tables.find((table) => table.id === id);
    if (!tableToUpdate) return;

    try {
      await updateTable(id, tableToUpdate);
      console.log("Table updated:", tableToUpdate);
    } catch (error) {
      console.error("Error updating table:", error);
    }
  };
  const handleAddTable = async () => {
    const newTableNumber = tables.length + 1;
    const newTable = {
      tableName: `Mesa ${newTableNumber}`,
      tableDescription: "Descripción por defecto",
      branchId: parseInt(branchId),
      events: [
        {
          type: "MARK_AVAILABLE",
          createdAt: new Date().toISOString(),
          message: null,
        },
      ],
    };

    try {
      const response = await createTable(newTable);
      const createdTable = response.data;
      setTables((prevTables) => [...prevTables, createdTable]);

      const updatedBranch = {
        ...branch,
        tableIds: [...branch.tableIds, createdTable.id],
      };
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      setEditedBranch(updatedBranch);

      console.log("New table added:", createdTable);
      console.log("Branch updated with new table:", updatedBranch);
    } catch (error) {
      console.error("Error adding new table:", error);
    }
  };

  const handleDeleteTable = async (id) => {
    try {
      await deleteTable(id);
      setTables((prevTables) => prevTables.filter((table) => table.id !== id));

      const updatedBranch = {
        ...branch,
        tableIds: branch.tableIds.filter((tableId) => tableId !== id),
      };
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      setEditedBranch(updatedBranch);

      console.log("Table deleted:", id);
    } catch (error) {
      console.error("Error deleting table:", error);
    }
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(tables);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTables(items);

    const updatedTableIds = items.map((table) => table.id);
    const updatedBranch = { ...branch, tableIds: updatedTableIds };

    try {
      await updateBranch(branchId, updatedBranch);
      setBranch(updatedBranch);
      setEditedBranch(updatedBranch);
      console.log("Branch updated with new table order:", updatedBranch);
    } catch (error) {
      console.error("Error updating branch with new table order:", error);
      // Revert the local state if the API call fails
      setTables(tables);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="branch-config">
      <h2>Configuración de Sucursal</h2>
      <div className="branch-details">
        <input
          type="text"
          name="name"
          value={editedBranch.name}
          onChange={handleBranchInputChange}
          placeholder="Nombre de Sucursal"
        />
        <input
          type="text"
          name="website"
          value={editedBranch.website}
          onChange={handleBranchInputChange}
          placeholder="Website"
        />
        <input
          type="text"
          name="menu"
          value={editedBranch.menu}
          onChange={handleBranchInputChange}
          placeholder="Menu URL"
        />
        <button
          className="app-button app-button-cambios"
          onClick={handleSaveBranch}
        >
          Guardar Cambios de Sucursal
        </button>
      </div>

      <div className="button-row">
        <button className="app-button add-table-btn" onClick={handleAddTable}>
          Agregar Mesa
        </button>
        <button
          className="app-button"
          onClick={() => navigate(`/admin/${companyId}/${branchId}/urls`)}
        >
          Descargar URLs
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="tables">
          {(provided) => (
            <ul
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="tables-list"
            >
              {tables.map((table, index) => (
                <Draggable
                  key={table.id}
                  draggableId={table.id.toString()}
                  index={index}
                >
                  {(provided) => (
                    <li
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="table-item"
                    >
                      <span className="table-number">{index + 1}</span>
                      <input
                        type="text"
                        value={table.tableName}
                        onChange={(e) =>
                          handleTableChange(
                            table.id,
                            "tableName",
                            e.target.value
                          )
                        }
                        onBlur={() => handleTableBlur(table.id)}
                        className="table-name-input"
                      />
                      <input
                        type="text"
                        value={table.tableDescription}
                        onChange={(e) =>
                          handleTableChange(
                            table.id,
                            "tableDescription",
                            e.target.value
                          )
                        }
                        onBlur={() => handleTableBlur(table.id)}
                        className="table-description-input"
                      />
                      <img
                        src="/view.png"
                        alt="Ver Mesa"
                        className="view-icon"
                        title="Ver Mesa"
                        onClick={() =>
                          navigate(`/user/${companyId}/${branchId}/${table.id}`)
                        }
                      />
                      <img
                        src="/delete.png"
                        alt="Eliminar"
                        className="delete-icon"
                        title="Eliminar Mesa"
                        onClick={() => handleDeleteTable(table.id)}
                      />
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
  );
};

export default BranchConfig;
