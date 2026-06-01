const app = require('./app');
const logger = require('./utils/logger');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3001;

let server;
if (!process.env.VERCEL) {
    server = app.listen(PORT, () => {
        logger.info(`Server running on port ${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received, shutting down gracefully');
        if (server) {
            server.close(() => {
                logger.info('Process terminated');
            });
        }
    });
}

module.exports = app;