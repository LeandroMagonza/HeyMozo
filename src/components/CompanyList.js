import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getCompanies } from "../services/api";

const CompanyList = () => {
  const [companies, setCompanies] = useState([]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await getCompanies();
        setCompanies(response.data);
      } catch (error) {
        console.error("Error fetching companies:", error);
      }
    };

    fetchCompanies();
  }, []);

  return (
    <div className="company-list">
      <h1>Lista de Compañías</h1>
      <ul>
        {companies.map((company) => (
          <li key={company.id}>
            <Link to={`/admin/${company.id}`}>{company.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CompanyList;
