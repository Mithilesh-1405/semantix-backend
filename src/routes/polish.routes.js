const express = require('express');
const router = express.Router();

// multer setup
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// controllers
const pdf_controller = require('../controllers/pdf.controller');

// middleware
const { authenticate } = require('../middleware/auth.middleware');

router.post('/polish-resume', authenticate, upload.single('pdf_file'), pdf_controller.polishResume);
router.get('/pdf-polish-history', authenticate, pdf_controller.getPolishHistory)

module.exports = router;