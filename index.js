const express = require("express");
var contactRoutes = require("./routes/Contact");
const config = require("./config.json");
const app = express();

app.use(express.json());

app.use("/contact", contactRoutes);

app.listen(8080);

module.exports = app;
