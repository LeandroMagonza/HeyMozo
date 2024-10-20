import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBranch, getTables } from '../services/api';
import './TableUrls.css';

const TableUrls = () => {
  const { companyId, branchId } = useParams();
  const [branch, setBranch] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [branchResponse, tablesResponse] = await Promise.all([
          getBranch(branchId),
          getTables(branchId)
        ]);
        setBranch(branchResponse.data);
        setTables(tablesResponse.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [branchId]);

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="table-urls">
      <h2>URLs de Mesas - {branch.name}</h2>
      <table>
        <thead>
          <tr>
            <th>Nombre de Mesa</th>
            <th>URL</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((table) => (
            <tr key={table.id}>
              <td>{table.tableName}</td>
              <td>
                <a href={`/user/${companyId}/${branchId}/${table.id}`} target="_blank" rel="noopener noreferrer">
                  {`${window.location.origin}/user/${companyId}/${branchId}/${table.id}`}
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TableUrls;
