const pdfParse = require('pdf-parse');
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
                model: "BAAI/bge-m3",
                apiKey: process.env.HUGGINGFACE_API_KEY,
            });

            const pages = [];
            const pagerender = (pageData) => {
                return pageData.getTextContent().then(textContent => {
                    const text = textContent.items.map(item => item.str).join(" ").trim();
                    pages.push({ text, pageNum: pageData.pageIndex + 1 });
                    return text;
                });
            };

            await pdfParse(pdfFile.buffer, { pagerender });

            const tableName = 'document_chunks';

            const vectorStore = new SupabaseVectorStore(embeddings, {
                client: supabaseAdmin,
                tableName,
                queryName: 'match_documents',
            });

            const documents = pages
                .filter(p => p.text.length > 20)
                .map(p => new Document({
                    pageContent: p.text,
                    metadata: {
                        page: p.pageNum,
                        source: pdfFile.originalname,
                        pdfId: pdf_id,
                        userId: userId
                    }
                }));

            if (documents.length === 0) {
                logger.warn('No text content extracted from PDF');
                return { success: false, message: "No text found in PDF" };
            }

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 300,
                chunkOverlap: 80,
            });

            const chunks = await splitter.splitDocuments(documents);
            const { data: existing } = await supabaseAdmin
                .from(tableName)
                .select('id')
                .eq('metadata->>pdfId', pdf_id)
                .eq('metadata->>userId', userId)
                .limit(1);

            if (!existing || existing.length === 0) {
                console.log(`📄 Indexing new PDF for user ${userId}: ${pdfFile.originalname}`);
                await vectorStore.addDocuments(chunks);
            } else {
                console.log(`✅ PDF already indexed for user ${userId}: ${pdfFile.originalname}`);
            }

            // ====================== SEARCH ======================
            const results = await vectorStore.similaritySearchWithScore(
                query,
                Math.min(20, chunks.length),
                { pdfId: pdf_id, userId: userId }
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
                .slice(0, 3);

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
                    text: item.text,
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