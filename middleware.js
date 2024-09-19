module.exports = (req, res, next) => {
  if (req.method === 'GET' && req.path === '/api/tables') {
    const db = req.app.db;
    res.json(Object.keys(db.getState()));
  } else {
    next();
  }
};
