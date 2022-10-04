const jwt = require("jsonwebtoken");
const controller = require("../controllers/ContactController");
const config = require("../config.json");

const auth = (req, res, next) => {
  const token = req.header("Authorization");
  const instance = req.instance;
  if (!token) {
    controller.__return(res, {}, "FORBIDDEN", 401);
    return false;
  }
  try {
    jwt.verify(token, config[instance].TOKEN_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError")
          return controller.__return(res, {}, "TOKEN_EXPIRED", 401);
        return controller.__return(res, {}, "INVALID_TOKEN", 401);
      } else next();
    });
  } catch (error) {
    controller.__return(res, {}, "TOKEN_EXPIRED", 401);
  }
};

module.exports = auth;
