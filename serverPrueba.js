const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const app = express();

// Cargar los datos de db.json
const rawData = fs.readFileSync("db.json");
let db = JSON.parse(rawData);

app.use(bodyParser.json({ limit: "50mb" }));

// GET para obtener todas las mesas de una compañía
app.get("/companies/:companyId/tables", (req, res) => {
  console.log("Received GET request for tables");
  const { companyId } = req.params;
  const company = db.companies.find((c) => c.id === parseInt(companyId));
  if (company && company.tables) {
    res.json(company.tables);
  } else {
    res.status(404).json({ error: "Company or tables not found" });
  }
});

// PUT para actualizar una mesa
app.put("/companies/:companyId/tables/:tableId", (req, res) => {
  console.log("Received PUT request");
  console.log("Params:", req.params);
  console.log("Body:", req.body);

  const { companyId, tableId } = req.params;
  const { type, message } = req.body;

  const company = db.companies.find((c) => c.id === parseInt(companyId));
  if (company) {
    const tableIndex = company.tables.findIndex(
      (t) => t.id === parseInt(tableId)
    );
    if (tableIndex !== -1) {
      // Crear un nuevo evento
      const newEvent = {
        type,
        createdAt: new Date().toISOString(),
        message: message || null,
      };

      // Actualizar la mesa con el nuevo evento
      company.tables[tableIndex].events.push(newEvent);

      // Guardar los cambios en db.json
      fs.writeFileSync("db.json", JSON.stringify(db, null, 2));

      res.json({
        message: "Table updated successfully",
        updatedTable: company.tables[tableIndex],
      });
    } else {
      res.status(404).json({ error: "Table not found" });
    }
  } else {
    res.status(404).json({ error: "Company not found" });
  }
});

app.listen(3002, () => {
  console.log("Server running on port 3002");
});
