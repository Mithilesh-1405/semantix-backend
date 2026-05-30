const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require('morgan');
const logger = require('./utils/logger').default;
const routes = require('./routes/index.js');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN || 'https://semantix-hub-kohl.vercel.app',
    credentials: true
}));

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));


if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

app.get("/", (req, res) => {
    res.json({ message: "Welcome to Semantix API. Please use /api/v1 to access the endpoints." });
});

app.use("/api/v1", routes);

module.exports = app;