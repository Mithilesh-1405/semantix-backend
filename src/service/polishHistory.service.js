const { supabaseAdmin } = require("../config/supabase_client");

class PolishHistoryService {
    getHistory = async (page, limit, userId) => {
        const { data, error } = await supabaseAdmin
            .schema('pdf')
            .from('polish_history')
            .select()
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw error;
        }

        return data;
    }

    insertHistory = async (pdf_id, job_description, pdf_file, similarity, userId) => {
        const { data, error } = await supabaseAdmin
            .schema('pdf')
            .from('polish_history')
            .insert({
                pdf_id: pdf_id,
                file_name: pdf_file.originalname,
                file_size: pdf_file.size,
                job_description: job_description,
                similarity_score: similarity,
                user_id: userId,
                created_at: new Date()
            })
            .select()

        if (error) {
            throw error;
        }

        return data;
    }
}

module.exports = PolishHistoryService;