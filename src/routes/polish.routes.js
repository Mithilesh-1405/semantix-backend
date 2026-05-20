const express = require('express');
const router = express.Router();

// multer setup
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// controllers
const pdf_controller = require('../controllers/pdfPolish.controller');
const pdfSearch_controller = require('../controllers/pdfSearch.controller');

// middleware
const { authenticate } = require('../middleware/auth.middleware');

router.post('/polish-resume', authenticate, upload.single('pdf_file'), pdf_controller.polishResume);
router.post('/search-pdf', authenticate, upload.single('pdf_file'), pdfSearch_controller.searchPDF);
router.get('/pdf-polish-history', authenticate, pdf_controller.getPolishHistory)
router.get('/pdf-search-history', authenticate, pdfSearch_controller.getSearchHistory)

module.exports = router;