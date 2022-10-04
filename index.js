const express = require("express");
var contactRoutes = require("./routes/Contact");
var authRoutes = require("./routes/Auth");
var instance = require("./routes/Instance");
const app = express();

app.use(express.json());

app.use("/:instance/auth", instance, authRoutes);
app.use("/:instance/contact", instance, contactRoutes);

app.listen(8080);

module.exports = app;
