// ===========================SERVICES=================================
const PDFDetailsService = require('./pdfDetails.service')
const PolishHistoryService = require('./polishHistory.service');
const AppError = require('../utils/appError');

// ==============================Service Instances=====================
const pdfDetailsService = new PDFDetailsService();
const polishHistoryService = new PolishHistoryService();

// ===========================EXTERNAL PACKAGES=========================
const { GoogleGenAI } = require("@google/genai");
const cosineSimilarity = require("compute-cosine-similarity");
const { PDFExtract } = require("pdf.js-extract");
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;

class PdfService {
    async extractPdfText(buffer) {
        const pdfExtract = new PDFExtract();
        return new Promise((resolve, reject) => {
            pdfExtract.extractBuffer(buffer, {}, (err, data) => {
                if (err) return reject(err);
                const text = data.pages
                    .map(page => page.content.map(item => item.str).join(" "))
                    .join("\n\n");
                resolve(text);
            });
        });
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
    async polishResume(pdfFile, jobDescription, type) {
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
            const insertPDFData = await pdfDetailsService.insertPDFDetails(pdfFile, type);
            if (!insertPDFData[0].id) {
                throw new AppError('Error inserting PDF details', 500);
            }

            const insertHistoryData = await polishHistoryService.insertHistory(insertPDFData[0].id, jobDescription, pdfFile, similarity);
            if (!insertHistoryData[0].id) {
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
}

module.exports = PdfService;
