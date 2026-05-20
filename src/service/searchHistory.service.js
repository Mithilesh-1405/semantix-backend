const supabase = require("../config/supabase_client");

class SearchHistoryService {
    getHistory = async (page, limit, search) => {
        const { data, error } = await supabase
            .schema('pdf')
            .from('pdf_search_history')
            .select()
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw error;
        }

        return data;
    }
    async insertSearchHistory(pdfId, pdfName, query) {
        try {
            const { data, error } = await supabase
                .schema('pdf')
                .from('pdf_search_history')
                .insert([
                    {
                        pdf_id: pdfId,
                        file_name: pdfName,
                        search_query: query,
                    }
                ])
                .select();

            if (error) {
                throw error;
            }

            return data;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = SearchHistoryService;
