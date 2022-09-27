var mysql = require("mysql");
const config = require("./config.json");
var pool = mysql.createPool({
  connectionLimit: 10,
  host: config.HOST,
  user: config.USER,
  password: config.PASSWORD,
  database: config.DB,
  port: config.DB_PORT,
});
pool.getConnection(function (error, connection) {
  if (!!error) {
    console.log(error);
    return false;
  }
  connection.release();
});
module.exports = pool;
