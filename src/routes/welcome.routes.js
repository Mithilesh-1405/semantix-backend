const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

router.get('/', (req, res) => {
    logger.info(`Welcome to the API!`);
    res.send('Welcome to the API!');
});

module.exports = router;