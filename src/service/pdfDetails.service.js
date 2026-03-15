
const supabase = require("../config/supabase_client");
const logger = require("../utils/logger");

class PDFDetailsService {
    insertPDFDetails = async (pdfFile, pdf_type = "other") => {
        try {
            const { data, error } = await supabase.schema('pdf').from('pdf_upload_details')
                .insert({
                    pdf_name: pdfFile.originalname,
                    pdf_size: pdfFile.size,
                    pdf_type: pdf_type,
                    created_at: new Date()
                })
                .select()

            if (error) {
                logger.error('Error inserting data:', error)
                return null
            }

            logger.info('Inserted data:', data)
            return data
        }
        catch (err) {
            logger.error('Error inserting data:', err)
            return err
        }
    }
}

module.exports = PDFDetailsService;