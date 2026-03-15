const express = require('express');
const welcomeRoutes = require('./welcome.routes.js');
const polishRoutes = require("./polish.routes.js");

const router = express.Router();

router.use('/', welcomeRoutes);
router.use('/pdf', polishRoutes);

module.exports = router;