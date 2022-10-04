const config = require("../config.json");

module.exports = (req, res, next) => {
  const instance = config.instances[req.params.instance] ?? "";
  if (instance) {
    req.instance = instance;
    next();
  } else
    res.status(404).json({ status: "ERROR", message: "NOT_FOUND", data: {} });
};
