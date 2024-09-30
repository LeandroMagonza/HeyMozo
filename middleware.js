module.exports = (req, res, next) => {
  console.log(`Received request: ${req.method} ${req.path}`);
  if (req.method === "GET" && req.path.match(/^\/companies\/\d+$/)) {
    const db = req.app.db;
    const companyId = parseInt(req.path.split("/")[2]);
    const company = db.get("companies").find({ id: companyId }).value();
    if (company) {
      console.info("Company found");
      res.json(company);
    } else {
      res.status(404).json({ error: "Company not found" });
    }
  } else if (
    req.method === "GET" &&
    req.path.match(/^\/companies\/\d+\/tables$/)
  ) {
    const db = req.app.db;
    const companyId = parseInt(req.path.split("/")[2]);
    const company = db.get("companies").find({ id: companyId }).value();
    if (company && company.tables) {
      res.json(company.tables);
    } else {
      res.status(404).json({ error: "Company or tables not found" });
    }
  } else if (
    req.method === "GET" &&
    req.path.match(/^\/companies\/\d+\/tables\/\d+$/)
  ) {
    const db = req.app.db;
    const companyId = parseInt(req.path.split("/")[2]);
    const tableId = parseInt(req.path.split("/")[4]);
    const company = db.get("companies").find({ id: companyId }).value();

    if (company && company.tables) {
      const table = company.tables.find((t) => t.id === tableId);
      if (table) {
        res.json(table);
      } else {
        res.status(404).json({ error: "Table not found" });
      }
    } else {
      res.status(404).json({ error: "Company or tables not found" });
    }
  } else if (
    req.method === "PUT" &&
    req.path.match(/^\/companies\/\d+\/tables\/\d+$/)
  ) {
    const db = req.app.db;
    const companyId = parseInt(req.path.split("/")[2]);
    const tableId = parseInt(req.path.split("/")[4]);
    const company = db.get("companies").find({ id: companyId }).value();

    if (company && company.tables) {
      const tableIndex = company.tables.findIndex(
        (table) => table.id === tableId
      );
      if (tableIndex !== -1) {
        // Obtener la mesa actual
        const currentTable = company.tables[tableIndex];

        // Crear un nuevo evento basado en el cuerpo de la solicitud
        const newEvent = {
          type: req.body.type,
          createdAt: new Date().toISOString(),
          message: req.body.message || null,
        };

        // Actualizar la mesa con el nuevo evento
        const updatedTable = {
          ...currentTable,
          events: [...currentTable.events, newEvent],
        };

        // Actualizar la mesa en el array de la compañía
        company.tables[tableIndex] = updatedTable;

        // Actualizar la compañía en la base de datos
        db.get("companies")
          .find({ id: companyId })
          .assign({ tables: company.tables })
          .write();

        console.log("Table updated successfully");
        res.json(updatedTable);
      } else {
        console.log("Table not found");
        res.status(404).json({ error: "Table not found" });
      }
    } else {
      console.log("Company or tables not found");
      res.status(404).json({ error: "Company or tables not found" });
    }
  } else {
    next();
  }
};
