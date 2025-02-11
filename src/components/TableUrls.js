import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getBranch, getTables } from '../services/api';
import QRCodeDocument from './QRCodeDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';
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
      
      <div className="actions">
        <PDFDownloadLink
          document={
            <QRCodeDocument 
              tables={tables} 
              companyId={companyId} 
              branchId={branchId}
              branchName={branch.name}
              restaurantLogo={branch.logo}
              textColor={branch.textColor || "#000000"}
              fontFamily={branch.fontFamily || "Helvetica"}
              qrBackgroundImage={branch.qrBackgroundImage}
              website={branch.website}
            />
          }
          fileName={`qr-codes-${branch.name}.pdf`}
        >
          {({ loading }) => (loading ? 'Generando PDF...' : 'Descargar PDF con códigos QR')}
        </PDFDownloadLink>
      </div>

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
