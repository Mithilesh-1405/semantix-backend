const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require('morgan');
const logger = require('./utils/logger');
const routes = require('./routes/index.js');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const app = express();

const allowedOrigins = [
    'https://semantix-hub-kohl.vercel.app',
    'http://localhost:8080',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:9000',
    'http://localhost:3001'
];

if (process.env.CORS_ORIGIN) {
    const origins = process.env.CORS_ORIGIN
        .split(',')
        .map(o => o.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean);

    origins.forEach(o => {
        if (!allowedOrigins.includes(o)) {
            allowedOrigins.push(o);
        }
    });
}

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        // Check if origin is allowed or matches Vercel preview domains
        const isAllowed = allowedOrigins.includes(origin) || 
                          /^https:\/\/semantix-hub-kohl.*\.vercel\.app$/.test(origin);
                          
        if (isAllowed) {
            callback(null, true);
        } else {
            console.warn(`[CORS] Blocked request from origin: ${origin}`);
            callback(null, false);
        }
    },
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