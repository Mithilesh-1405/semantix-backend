const { PDFExtract } = require("pdf.js-extract");
const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { SupabaseVectorStore } = require('@langchain/community/vectorstores/supabase');
const { HuggingFaceInferenceEmbeddings } = require("@langchain/community/embeddings/hf");

const logger = require('../utils/logger.js');
const dotenv = require('dotenv');
dotenv.config();

const { supabaseAdmin } = require('../config/supabase_client.js');

class RAGPipelineService {

    async semanticSearch(pdfFile, query, pdf_id, userId) {
        try {
            // ====================== FREE EMBEDDING MODEL ======================
            const embeddings = new HuggingFaceInferenceEmbeddings({
                model: "BAAI/bge-m3",                    // Best free model right now
                apiKey: process.env.HUGGINGFACE_API_KEY, // Get free from huggingface.co
            });

            const pdfExtract = new PDFExtract();
            const data = await new Promise((resolve, reject) => {
                pdfExtract.extractBuffer(pdfFile.buffer, {}, (err, data) => {
                    if (err) return reject(err);
                    resolve(data);
                });
            });

            const tableName = 'document_chunks';

            // Use admin client so vector store operations bypass RLS
            const vectorStore = new SupabaseVectorStore(embeddings, {
                client: supabaseAdmin,
                tableName,
                queryName: 'match_documents',
            });

            // Convert PDF to LangChain Documents — include userId in metadata
            const documents = data.pages
                .map(page => ({
                    text: page.content.map(item => item.str).join(" ").trim(),
                    pageNum: page.pageInfo.num,
                }))
                .filter(p => p.text.length > 20)
                .map(p => new Document({
                    pageContent: p.text,
                    metadata: {
                        page: p.pageNum,
                        source: pdfFile.originalname,
                        pdfId: pdf_id,
                        userId: userId        // ← user-specific tag
                    }
                }));

            if (documents.length === 0) {
                logger.warn('No text content extracted from PDF');
                return { success: false, message: "No text found in PDF" };
            }

            // Better chunking for semantic search
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 300,       // was 600 — resumes are short-form
                chunkOverlap: 80,     // was 100
            });

            const chunks = await splitter.splitDocuments(documents);

            // Prevent duplicate indexing — scoped to this user's upload
            const { data: existing } = await supabaseAdmin
                .from(tableName)
                .select('id')
                .eq('metadata->>pdfId', pdf_id)
                .eq('metadata->>userId', userId)   // ← user-specific check
                .limit(1);

            if (!existing || existing.length === 0) {
                console.log(`📄 Indexing new PDF for user ${userId}: ${pdfFile.originalname}`);
                await vectorStore.addDocuments(chunks);
            } else {
                console.log(`✅ PDF already indexed for user ${userId}: ${pdfFile.originalname}`);
            }

            // ====================== SEARCH ======================
            // Filter results by both pdfId and userId to keep context user-specific
            const results = await vectorStore.similaritySearchWithScore(
                query,
                Math.min(20, chunks.length),
                { pdfId: pdf_id, userId: userId }   // ← user-specific filter
            );

            const top3 = results
                .map(([doc, distance]) => ({
                    similarity: Number((1 - distance).toFixed(4)),
                    similarityPercent: Math.round((1 - distance) * 100),
                    page: doc?.metadata?.page || 1,
                    text: doc.pageContent.trim(),
                    metadata: doc.metadata
                }))
                .filter(r => r.similarity >= 0.40)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3);  // ✅ top 3 only

            const responseData = {
                success: true,
                query,
                pdfId: pdf_id,
                totalMatches: top3.length,
                summary: top3.length > 0
                    ? `Found ${top3.length} relevant sections`
                    : "No strong matches found.",
                results: top3.map((item, index) => ({
                    id: index + 1,
                    page: item.page,
                    similarity: item.similarity,
                    similarityPercent: item.similarityPercent,
                    text: item.text,        // ✅ directly from mapped item, no index gymnastics
                    metadata: item.metadata
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