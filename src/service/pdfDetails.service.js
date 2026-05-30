const { supabaseAdmin } = require("../config/supabase_client");
const logger = require("../utils/logger");

class PDFDetailsService {
    async insertPDFDetails(pdfFile, userId, pdf_type = "other") {
        try {
            // First, check if this exact file was already uploaded by this user
            const { data: existing, error: findError } = await supabaseAdmin.schema('pdf')
                .from('pdf_upload_details')
                .select()
                .eq('pdf_name', pdfFile.originalname)
                .eq('pdf_size', pdfFile.size)
                .eq('user_id', userId)
                .limit(1);

            if (existing && existing.length > 0) {
                logger.info('Using existing PDF record:', existing[0].id)
                return existing
            }

            // If not found, insert new record
            const { data, error } = await supabaseAdmin.schema('pdf').from('pdf_upload_details')
                .insert({
                    pdf_name: pdfFile.originalname,
                    pdf_size: pdfFile.size,
                    pdf_type: pdf_type,
                    user_id: userId,
                    created_at: new Date()
                })
                .select()

            if (error) {
                logger.error('Error inserting data:', error)
                return null
            }

            logger.info('Inserted new data:', data)
            return data
        }
        catch (err) {
            logger.error('Error in insertPDFDetails:', err)
            return err
        }
    }
}

module.exports = PDFDetailsService;