const path = require("path");
const express = require("express");
const proxy = require('express-http-proxy');
const cors = require("cors");
const { LCD_ENDPOINT, PORT } = require("../config.js");

const app = express();
app.use(cors());
app.use("/api", proxy(LCD_ENDPOINT));
app.use(express.static(path.join(__dirname, "..", "dist")));

app.listen(PORT);