
const { PDFExtract } = require("pdf.js-extract");
const { Document } = require("@langchain/core/documents");
const { RecursiveCharacterTextSplitter } = require("@langchain/textsplitters");
const { SupabaseVectorStore } = require('@langchain/community/vectorstores/supabase');

class RAGPipelineService {
    async semanticSearch(pdfFile, query) {
        try {
            const ai = new GoogleGenAI({ apiKey: API_KEY });

            const pdfExtract = new PDFExtract();
            const data = await pdfExtract.extractBuffer(pdfFile.buffer);

            embeddings = await ai.models.embedContent({
                model: "gemini-embedding-001",
                taskType: "SEMANTIC_SIMILARITY",
            });

            // Chunks table will be maintained one per pdf
            const tableName = 'document_chunks';

            const vectorStore = new SupabaseVectorStore(embeddings, {
                client: supabase,
                tableName,
                queryName: 'match_documents',
            });

            const documents = data.pages.map(page => new Document({
                pageContent: page.content.map(item => item.str).join(" "),
                metadata: {
                    page: page.pageInfo.num,
                    source: pdfFile.originalname,
                    path: pdfFile.path,
                }
            }));
            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200
            });
            const chunks = await splitter.splitDocuments(documents);

            await vectorStore.addDocuments(chunks);
            const results = await vectorStore.similaritySearchWithScore(
                query,
                30,
            );
            const goodResults = results
                .map(([doc, dist]) => ({ doc, similarity: 1 - dist }))
                .filter(r => r.similarity >= 0.67)
                .sort((a, b) => b.similarity - a.similarity);

            return goodResults;
        }
        catch (err) {
            console.log(err);
            throw err;
        }
    }
}

module.exports = RAGPipelineService;