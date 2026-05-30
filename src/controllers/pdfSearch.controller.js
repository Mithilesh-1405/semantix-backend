// Import services
const PdfService = require('../service/pdf.service.js');
const SearchHistoryService = require('../service/searchHistory.service.js');

// service instances
const pdfService = new PdfService();
const searchHistoryService = new SearchHistoryService();

// Data Loggers
const logger = require('../utils/logger.js');
const AppError = require('../utils/appError.js');

exports.searchPDF = async (req, res, next) => {
    try {
        const pdfFile = req.file;
        const { search_query } = req.body;
        const userId = req.user.id;

        logger.info('Processing pdf search request:', {
            userId,
            originalFilename: pdfFile.originalname,
            fileSize: pdfFile.size,
            searchQueryLength: search_query.length
        });

        const result = await pdfService.searchPDFRAG(pdfFile, search_query, userId);
        if (!result) {
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

exports.getSearchHistory = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = null } = req.query;
        const userId = req.user.id;
        const historyData = await searchHistoryService.getHistory(page, limit, userId);
        if (historyData.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No search history found!"
            })
        }
        return res.status(200).json({
            success: true,
            data: historyData,
            message: 'Search history fetched successfully'
        });
    }
    catch (error) {
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