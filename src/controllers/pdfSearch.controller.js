// Import services
const PdfService = require('../service/pdf.service.js');
const pdfService = new PdfService();
// Data Loggers
const logger = require('../utils/logger.js');
const AppError = require('../utils/appError.js');

exports.searchPDF = async (req, res, next) => {
    try {
        const pdfFile = req.file;
        const { search_query } = req.body;
        logger.info('Processing pdf search request:', {
            originalFilename: pdfFile.originalname,
            fileSize: pdfFile.size,
            searchQueryLength: search_query.length
        });
        const result = await pdfService.searchPDFRAG(pdfFile, search_query)
        if(!result){
            throw new AppError('Error searching PDF', 500);
        }
        return res.status(200).json({
            success: true,
            data: result,
            message: 'PDF searched successfully'
        });
    } catch (error) {
        if (error instanceof AppError) {
            logger.error('Error in searchPDF controller:', error);
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