const { GoogleGenAI } = require("@google/genai");
const { PDFExtract } = require("pdf.js-extract");
const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { SupabaseVectorStore } = require('@langchain/community/vectorstores/supabase');
const { Embeddings } = require("@langchain/core/embeddings");

const logger = require('../utils/logger.js');
const dotenv = require('dotenv');
dotenv.config();

const API_KEY = process.env.GOOGLE_API_KEY;
const supabase = require('../config/supabase_client.js');

class GoogleGenAIEmbeddings extends Embeddings {
    constructor({
        apiKey,
        model = "gemini-embedding-2-preview",
        outputDimensionality = 1536
    }) {
        super({});
        this.ai = new GoogleGenAI({ apiKey });
        this.model = model;
        this.outputDimensionality = outputDimensionality;
    }

    async embedDocuments(documents) {
        const nonEmpty = documents.filter(d => d && d.trim().length > 0);
        if (nonEmpty.length === 0) {
            return documents.map(() => []);
        }

        // FIXED: Pass outputDimensionality + correct structure
        const response = await this.ai.models.embedContent({
            model: this.model,
            contents: nonEmpty.map(text => ({ parts: [{ text }] })),   // Correct format
            taskType: "RETRIEVAL_DOCUMENT",
            outputDimensionality: this.outputDimensionality,           // ← This was missing
        });

        // FIXED: Truncate AND Normalize to maintain score quality
        return response.embeddings.map(emb => {
            const sliced = emb.values.slice(0, this.outputDimensionality);
            // Re-normalize the vector after slicing
            const magnitude = Math.sqrt(sliced.reduce((sum, val) => sum + val * val, 0));
            return magnitude > 0 ? sliced.map(val => val / magnitude) : sliced;
        });
    }

    async embedQuery(query) {
        const response = await this.ai.models.embedContent({
            model: this.model,
            contents: [{ parts: [{ text: query }] }],
            taskType: "RETRIEVAL_QUERY",
            outputDimensionality: this.outputDimensionality,
        });
        // Truncate and Normalize query vector
        const sliced = response.embeddings[0].values.slice(0, this.outputDimensionality);
        const magnitude = Math.sqrt(sliced.reduce((sum, val) => sum + val * val, 0));
        return magnitude > 0 ? sliced.map(val => val / magnitude) : sliced;
    }
}

// ==================== SERVICE ====================

class RAGPipelineService {
    async semanticSearch(pdfFile, query, pdf_id) {
        try {
            const pdfExtract = new PDFExtract();
            const data = await new Promise((resolve, reject) => {
                pdfExtract.extractBuffer(pdfFile.buffer, {}, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });

            const embeddings = new GoogleGenAIEmbeddings({
                apiKey: API_KEY,
                model: "gemini-embedding-2-preview",
                outputDimensionality: 1536,
            });

            const tableName = 'document_chunks';

            const vectorStore = new SupabaseVectorStore(embeddings, {
                client: supabase,
                tableName,
                queryName: 'match_documents',
            });

            // Convert pdf.js-extract output to LangChain Documents
            const documents = data.pages
                .map(page => ({
                    text: page.content.map(item => item.str).join(" ").trim(),
                    pageNum: page.pageInfo.num,
                }))
                .filter(p => p.text.length > 50)   // avoid tiny chunks
                .map(p => new Document({
                    pageContent: p.text,
                    metadata: {
                        page: p.pageNum,
                        source: pdfFile.originalname,
                        pdfId: pdf_id
                    }
                }));

            if (documents.length === 0) {
                logger.warn('No text content extracted from PDF');
                return [];
            }

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200
            });

            const chunks = await splitter.splitDocuments(documents);

            // PREVENT DUPLICATES: Check if this PDF is already indexed
            const pdfId = pdf_id
            const { data: existing } = await supabase
                .from(tableName)
                .select('id')
                .contains('metadata', { pdfId })
                .limit(1);

            if (!existing || existing.length === 0) {
                console.log(`Indexing new PDF: ${pdfFile.originalname} (ID: ${pdfId})`);
                await vectorStore.addDocuments(chunks);
            } else {
                console.log(`PDF already indexed, skipping insertion: ${pdfFile.originalname}`);
            }

            const results = await vectorStore.similaritySearchWithScore(query, 40);

            const goodResults = results
                .map(([doc, score]) => ({
                    doc,
                    similarity: Number(score.toFixed(4)),
                    similarityPercent: Math.round(score * 100)
                }))
                .filter(r => r.similarity >= 0.15)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 12);

            console.log(`Query: "${query}" | Top Match: ${goodResults[0]?.similarity || 0}`);
            goodResults.forEach((r, i) => {
                console.log(`#${i + 1} | Page ${r.doc.metadata.page} | Score: ${r.similarity}`);
            });

            // Final clean response for frontend
            const responseData = {
                success: true,
                query: query,
                pdfId: pdf_id,
                totalMatches: goodResults.length,
                summary: goodResults.length > 0
                    ? `Found ${goodResults.length} relevant sections matching your query`
                    : "No strong matches found for this query.",
                results: goodResults.map((item, index) => ({
                    id: index + 1,
                    page: item.doc.metadata.page || 1,
                    similarity: item.similarity,
                    similarityPercent: item.similarityPercent,
                    text: item.doc.pageContent.trim(),
                    highlightedText: item.doc.pageContent.trim(),
                    metadata: {
                        source: item.doc.metadata.source,
                        pdfId: item.doc.metadata.pdfId
                    }
                }))
            };

            return responseData;

        } catch (err) {
            logger.error('Error in semanticSearch:', err);
            throw err;
        }
    }
}

module.exports = RAGPipelineService;