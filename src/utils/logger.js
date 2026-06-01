const winston = require('winston');
const path = require('path');

const transports = [];

// File transports only work on writable filesystems (not Vercel serverless)
if (!process.env.VERCEL) {
    transports.push(
        new winston.transports.File({ filename: path.join(__dirname, '../logs/error.log'), level: 'error' }),
        new winston.transports.File({ filename: path.join(__dirname, '../logs/combined.log') })
    );
}

// Add Console transport in development and serverless environments so we can see the logs
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
    transports.push(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => new Date().toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                hour12: false
            })
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports
});

module.exports = logger;