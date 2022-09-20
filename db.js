var mysql = require("mysql");
const config = require("./config.json");
var connection = mysql.createConnection({
  host: config.HOST,
  user: config.USER,
  password: config.PASSWORD,
  database: config.DB,
});
connection.connect(function (error) {
  if (!!error) console.log(error);
});
module.exports = connection;
