const supabase = require("../config/supabase_client");

class PolishHistoryService {
    getHistory = async (page, limit, search) => {
        const { data, error } = await supabase
            .schema('pdf')
            .from('polish_history')
            .select()
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw error;
        }

        return data;
    }

    insertHistory = async (pdf_id, job_description, pdf_file, similarity) => {
        const { data, error } = await supabase
            .schema('pdf')
            .from('polish_history')
            .insert({
                pdf_id: pdf_id,
                file_name: pdf_file.originalname,
                file_size: pdf_file.size,
                job_description: job_description,
                similarity_score: similarity,
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