// ===========================SERVICES=================================
const PDFDetailsService = require('./pdfDetails.service')
const PolishHistoryService = require('./polishHistory.service');
const SearchHistoryService = require('./searchHistory.service');
const RAGService = require('./RAGPipeline.service')
const AppError = require('../utils/appError');

// ==============================Service Instances=====================
const pdfDetailsService = new PDFDetailsService();
const polishHistoryService = new PolishHistoryService();
const searchHistoryService = new SearchHistoryService();
const ragService = new RAGService();

// ===========================EXTERNAL PACKAGES=========================
const { GoogleGenAI } = require("@google/genai");
const cosineSimilarity = require("compute-cosine-similarity");
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;

class PdfService {
    async extractPdfText(buffer) {
        const data = await pdfParse(buffer);
        return data.text;
    }

    async getSimilarity(resumeText, jobDescription) {
        const ai = new GoogleGenAI({ apiKey: API_KEY });

        const texts = [resumeText, jobDescription];

        const response = await ai.models.embedContent({
            model: "gemini-embedding-001",
            contents: texts,
            taskType: "SEMANTIC_SIMILARITY",
        });

        if (!response.embeddings || response.embeddings.length !== texts.length) {
            throw new Error("Invalid embedding response");
        }

        const [resumeEmbedding, jobDescEmbedding] = response.embeddings.map(e => e.values);

        const similarity = cosineSimilarity(resumeEmbedding, jobDescEmbedding);

        return Number(similarity.toFixed(4));
    }

    async polishResume(pdfFile, jobDescription, type, userId) {
        try {
            if (!pdfFile) {
                throw new AppError('No file uploaded', 400);
            }

            const text = await this.extractPdfText(pdfFile.buffer);
            const trimmedJobDescription = jobDescription.trim();
            const trimmedResumeText = text.trim();

            const similarity = await this.getSimilarity(trimmedResumeText, trimmedJobDescription);
            if (similarity === null || similarity === undefined) {
                throw new AppError('Error getting similarity', 500);
            }

            const insertPDFData = await pdfDetailsService.insertPDFDetails(pdfFile, userId, type);
            if (!insertPDFData || !insertPDFData[0] || !insertPDFData[0].id) {
                throw new AppError('Error inserting PDF details', 500);
            }

            const insertHistoryData = await polishHistoryService.insertHistory(insertPDFData[0].id, jobDescription, pdfFile, similarity, userId);
            if (!insertHistoryData || !insertHistoryData[0] || !insertHistoryData[0].id) {
                throw new AppError('Error inserting history details', 500);
            }
            return {
                similarityScore: similarity,
                message: 'Your resume similarity score with job description is ' + similarity
            };

        } catch (err) {
            console.error(err);
            throw new Error(err.message || 'Server error');
        }
    }

    async searchPDFRAG(pdfFile, search_query, userId, type) {
        try {
            if (!pdfFile) {
                throw new AppError('No file uploaded', 400);
            }
            if (!search_query || !search_query.trim()) {
                throw new AppError('Search query is required', 400);
            }

            const insertPDFData = await pdfDetailsService.insertPDFDetails(pdfFile, userId, type);
            if (!insertPDFData || !insertPDFData[0] || !insertPDFData[0].id) {
                throw new AppError('Error inserting PDF details', 500);
            }

            // Attach the DB ID to the file object for the RAG service usage
            const pdf_id = insertPDFData[0].id;

            // will return pages with relevant searches — scoped to this user
            const semanticSearch = await ragService.semanticSearch(pdfFile, search_query, pdf_id, userId)
            if(!semanticSearch){
                throw new AppError('Error searching PDF', 500);
            }

            const insertHistoryData = await searchHistoryService.insertSearchHistory(insertPDFData[0].id, insertPDFData[0].pdf_name, search_query, userId);
            if (!insertHistoryData || !insertHistoryData[0] || !insertHistoryData[0].id) {
                throw new AppError('Error inserting history details', 500);
            }

            return semanticSearch;

        } catch (err) {
            console.error(err);
            throw new Error(err.message || 'Server error');
        }
    }
}

module.exports = PdfService;
