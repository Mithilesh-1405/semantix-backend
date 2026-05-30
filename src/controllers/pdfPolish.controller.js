
// Import services
const PdfService = require('../service/pdf.service.js');
const PolishHistoryService = require('../service/polishHistory.service.js')


// create instances of services
const pdfService = new PdfService();
const polishHistoryService = new PolishHistoryService();


// Data Loggers
const logger = require('../utils/logger.js');
const AppError = require('../utils/appError.js');

exports.polishResume = async (req, res) => {
    try {
        const { job_description } = req.body;
        const pdfFile = req.file;
        const userId = req.user.id;

        if (!pdfFile) {
            return res.status(400).json({ success: false, message: 'PDF file is required' });
        }

        if (!job_description || !job_description.trim()) {
            return res.status(400).json({ success: false, message: 'Job description is required' });
        }

        logger.info('Processing resume polish request:', {
            userId,
            originalFilename: pdfFile.originalname,
            fileSize: pdfFile.size,
            jobDescriptionLength: job_description.length
        });

        const result = await pdfService.polishResume(pdfFile, job_description, "resume", userId);

        return res.status(200).json({
            success: true,
            data: result,
            message: 'Resume polished successfully'
        });
    } catch (error) {

        if (error instanceof AppError) {
            logger.error('Error in polishResume controller:', error);
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
};

exports.getPolishHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = null } = req.query;
        const userId = req.user.id;
        const historyData = await polishHistoryService.getHistory(page, limit, userId);
        if (historyData.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No polish history found!"
            })
        }
        return res.status(200).json({
            success: true,
            data: historyData,
            message: 'Resume polish history fetched successfully'
        });
    }
    catch (error) {
        if (error instanceof AppError) {
            logger.error('Error in polishResume controller:', error);
            return res.status(error.statusCode).json({
                success: false,
                message: error.message
            });
        }

        return res.status(500).json({
            success: false,
            message: error.message || 'Internal Server Error'
        });
    }
}
