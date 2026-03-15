const app = require('./app');
const logger = require('./utils/logger');
const dotenv = require('dotenv');
dotenv.config();

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        logger.info('Process terminated');
    });
});