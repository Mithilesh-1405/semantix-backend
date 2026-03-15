const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
);

exports.authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        throw new Error('Authentication header is missing!');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        throw new Error('Authentication required', 401);
    }
    try {
        const { data, error } = await supabase.auth.getUser(token);
        req.user = data.user;
        next();
    } catch (error) {
        throw new Error('Invalid token', 401);
    }
}