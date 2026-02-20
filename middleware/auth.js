'use strict';

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'change-me';

function authMiddleware(req, res, next) {
    // Check cookie first, then Authorization header
    const token = req.cookies?.admin_token ||
        (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
            ? req.headers.authorization.slice(7)
            : null);

    if (!token) {
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        return res.redirect('/admin/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.admin = decoded;
        next();
    } catch (err) {
        console.error(`[auth] Invalid token: ${err.message}`);
        if (req.path.startsWith('/api/')) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        res.clearCookie('admin_token');
        return res.redirect('/admin/login');
    }
}

function generateToken(email) {
    return jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: '24h' });
}

module.exports = { authMiddleware, generateToken };
