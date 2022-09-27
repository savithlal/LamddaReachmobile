const express = require("express");
var contactRoutes = require("./routes/Contact");
var authRoutes = require("./routes/Auth");
const app = express();

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/contact", contactRoutes);

app.listen(8080);

module.exports = app;
