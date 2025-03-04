## SpecStory

## @c:\Users\leand\AppData\Local\Temp\Ditto\DragFiles\text_3.txt (10/20/2024, 12:57:26 AM)

_**User**_

@c:\Users\leand\AppData\Local\Temp\Ditto\DragFiles\text_3.txt 

---

_**Assistant**_

Thank you for providing the summary of functionalities and modifications. Based on the description, I'll create the `BranchConfig.js` and `BranchConfig.css` files with the necessary code to implement the described features. Let's start with the JavaScript file:

```javascript:src/components/BranchConfig.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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

      const missingTables = branchResponse.data.tableIds.filter(
        id => !tablesResponse.data.some(table => table.id === id)
      );
      if (missingTables.length > 0) {
        console.warn('Missing tables:', missingTables);
      }
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
      console.log('Branch updated with new table order:', updatedBranch);
    } catch (error) {
      console.error('Error updating branch with new table order:', error);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="branch-config">
      <div className="branch-header">
        <h2>{branch?.name || 'Cargando...'}</h2>
      </div>

      <div className="add-table-container">
        <button className="app-button add-table-btn" onClick={handleAddTable}>Agregar Mesa</button>
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
```

Now, let's create the CSS file to style the BranchConfig component:

```css:src/components/BranchConfig.css
.branch-config {
  padding: 20px;
}

.branch-header {
  margin-bottom: 20px;
}

.branch-header h2 {
  font-size: 24px;
  color: #333;
}

.add-table-container {
  margin-bottom: 20px;
}

.add-table-btn {
  background-color: #4CAF50;
  color: white;
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-table-btn:hover {
  background-color: #45a049;
}

.tables-list {
  list-style-type: none;
  padding: 0;
}

.table-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 4px;
}

.table-number {
  font-weight: bold;
  margin-right: 10px;
  min-width: 30px;
}

.table-name-input,
.table-description-input {
  margin-right: 10px;
  padding: 5px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.table-name-input {
  width: 150px;
}

.table-description-input {
  flex-grow: 1;
}

.delete-table-btn {
  background-color: #f44336;
  color: white;
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.delete-table-btn:hover {
  background-color: #d32f2f;
}

.loading {
  font-size: 18px;
  color: #666;
  text-align: center;
  margin-top: 50px;
}

/* Styles for drag and drop */
.table-item {
  transition: background-color 0.2s ease;
}

.table-item:hover {
  background-color: #e9e9e9;
}

.table-item.dragging {
  background-color: #d4d4d4;
  box-shadow: 0 2px 5px rgba(0,0,0,0.2);
}
```

These files implement the BranchConfig component with all the described functionalities, including:

1. Displaying branch information
2. Listing tables with editable inputs
3. Adding new tables
4. Deleting tables
5. Drag-and-drop reordering using react-beautiful-dnd
6. Data fetching and initialization
7. Error handling and loading states

The CSS file provides styling for a clean and user-friendly interface, with hover effects and visual feedback for drag-and-drop operations.

---

_**User**_

when you finish the drag, you have to update the branch table list with the new order

---

_**Assistant**_

Certainly! I'll modify the `onDragEnd` function in the `BranchConfig.js` file to update the branch's table list with the new order after a drag operation is completed. Here's the updated code:

```javascript:src/components/BranchConfig.js
// ... (previous code remains unchanged)

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
    console.log('Branch updated with new table order:', updatedBranch);
  } catch (error) {
    console.error('Error updating branch with new table order:', error);
    // Revert the local state if the API call fails
    setTables(tables);
  }
};

// ... (rest of the code remains unchanged)
```

This modification does the following:

1. After reordering the tables locally, we create an `updatedTableIds` array with the new order of table IDs.
2. We create an `updatedBranch` object with the new `tableIds` order.
3. We attempt to update the branch on the server using the `updateBranch` API call.
4. If the update is successful, we update the local `branch` state with `setBranch(updatedBranch)`.
5. If there's an error during the API call, we log the error and revert the local `tables` state to its previous order.

This ensures that the branch's table list is updated on the server with the new order after each successful drag operation. If the server update fails, the local state reverts to maintain consistency with the server data.

---

_**User**_

in the admin screen we are also showing a number associated to the table, we have to make this number be the same as in the config, so the number should be the order of the id of the table, in the list of tables that the branch has +1

tableId = [17,25,7,14]

table 17 is number 1
table 25 is number 2
table 7 is number 3
table 14 is number 4

---

_**Assistant**_

I understand. We need to modify the `AdminScreen` component to ensure that the table numbers are consistent with the order of table IDs in the branch's `tableIds` array. Let's update the `AdminScreen.js` file to implement this change:

```javascript:src/components/AdminScreen.js
// ... (previous imports and code remain unchanged)

const AdminScreen = () => {
  // ... (previous state declarations remain unchanged)

  // Modify the processedTables function
  const processedTables = useMemo(() => {
    console.log('Procesando mesas:', tables);
    // Create a map of table id to its index in the branch.tableIds array
    const tableIdToIndex = branch?.tableIds.reduce((acc, id, index) => {
      acc[id] = index + 1; // Add 1 to make it 1-based instead of 0-based
      return acc;
    }, {}) || {};

    return tables.map((table) => {
      const { state, waitTime, firstAttentionTime, hasUnseenAttention } = getTableStateAndWaitTime(table.events, currentTime);
      console.log(`Mesa ${table.id} - Estado calculado:`, state);
      const unseenEvents = countUnseenEvents(table.events);
      const canMarkSeenFromOutside = unseenEvents.hasUnseenWithoutMessage && !unseenEvents.hasUnseenWithMessage && hasUnseenAttention;
      return { 
        ...table, 
        number: tableIdToIndex[table.id] || 0, // Use the index from the map, or 0 if not found
        state, 
        unseenCount: unseenEvents.countWithMessage,
        canMarkSeenFromOutside, 
        waitTime,
        firstAttentionTime,
        hasUnseenAttention
      };
    });
  }, [tables, currentTime, branch?.tableIds]);

  // ... (rest of the component code remains unchanged)
};

export default AdminScreen;
```

This modification does the following:

1. We create a `tableIdToIndex` map based on the `branch.tableIds` array. This map associates each table ID with its position in the array (plus one, to make it 1-based).

2. In the `processedTables` function, we use this map to assign the correct number to each table based on its ID's position in the `branch.tableIds` array.

3. If a table ID is not found in the map (which shouldn't happen under normal circumstances), we assign it a number of 0.

This change ensures that the table numbers in the AdminScreen will always match the order of table IDs in the branch configuration, regardless of the order in which the tables are fetched or stored in the `tables` state.

Make sure that the `branch` state is properly set with the correct `tableIds` array when fetching the branch data. If you're not already doing so, you might need to update the `fetchData` function to ensure it's setting the branch state correctly:

```javascript
const fetchData = useCallback(async () => {
  try {
    const companyResponse = await getCompany(companyId);
    setCompany(companyResponse.data);

    const branchResponse = await getBranch(branchId);
    setBranch(branchResponse.data); // Make sure this includes the tableIds array

    const tablesResponse = await getTables(branchId);
    setTables(tablesResponse.data);
    console.log('Tablas obtenidas:', tablesResponse.data);
  } catch (error) {
    console.error('Error fetching data:', error.response || error);
  }
}, [companyId, branchId]);
```

With these changes, the table numbers in the AdminScreen will correctly reflect the order of table IDs as configured in the BranchConfig component.

---



---

