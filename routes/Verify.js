const jwt = require("jsonwebtoken");
const controller = require("../controllers/ContactController");
const config = require("../config.json");

const auth = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) {
    controller.__return(res, {}, "FORBIDDEN", 401);
    return false;
  }
  try {
    jwt.verify(token, config.TOKEN_SECRET, (err, decoded) => {
      if (err) {
        if (err.name === "TokenExpiredError")
          controller.__return(res, {}, "TOKEN_EXPIRED", 401);
        return false;
      } else next();
    });
  } catch (error) {
    controller.__return(res, {}, "TOKEN_EXPIRED", 401);
  }
};

module.exports = auth;
