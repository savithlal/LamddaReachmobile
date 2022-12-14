var express = require("express");
var router = express.Router();
var jwt = require("jsonwebtoken");
const config = require("../config.json");
var controller = require("../controllers/ContactController");

router.post("/login", (req, res, next) => {
  const params = req.body;
  const instance = req.instance;
  if (
    params.username === "developer@reach.com" &&
    params.password === "u0eIZu3cqXhM0B5N"
  ) {
    const token = jwt.sign(
      { user: params.username },
      config[instance].TOKEN_SECRET,
      {
        expiresIn: 60 * 60 * 9,
      }
    );
    res
      .header("Authorization", token)
      .status(200)
      .json({
        status: "SUCCESS",
        message: "TOKEN_GENERATED_SUCCESSFULLY",
        data: { token: token },
      });
  } else controller.__return(res, {}, "INVALID_CREDENTIALS", 401);
});

module.exports = router;
