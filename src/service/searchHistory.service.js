const { supabaseAdmin } = require("../config/supabase_client");

class SearchHistoryService {
    getHistory = async (page, limit, userId) => {
        const { data, error } = await supabaseAdmin
            .schema('pdf')
            .from('pdf_search_history')
            .select()
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw error;
        }

        return data;
    }

    async insertSearchHistory(pdfId, pdfName, query, userId) {
        try {
            const { data, error } = await supabaseAdmin
                .schema('pdf')
                .from('pdf_search_history')
                .insert([
                    {
                        pdf_id: pdfId,
                        file_name: pdfName,
                        search_query: query,
                        user_id: userId,
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
