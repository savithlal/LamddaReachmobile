var mysql = require("mysql");
const config = require("../config.json");
const instance = "prod";
var pool = mysql.createPool({
  connectionLimit: 1000,
  host: config[instance].HOST,
  user: config[instance].USER,
  password: config[instance].PASSWORD,
  database: config[instance].DB,
});
pool.getConnection(function (error, connection) {
  if (!!error) {
    console.log(error);
    return false;
  }
  connection.release();
});
module.exports = pool;
