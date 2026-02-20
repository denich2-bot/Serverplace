'use strict';

// Simple in-memory rate limiter: max requests per window per IP
const store = new Map();

function rateLimit(maxRequests, windowMs) {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const key = ip;

        if (!store.has(key)) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            return next();
        }

        const entry = store.get(key);
        if (now > entry.resetAt) {
            entry.count = 1;
            entry.resetAt = now + windowMs;
            return next();
        }

        entry.count++;
        if (entry.count > maxRequests) {
            console.warn(`[rateLimit] IP ${ip} превысил лимит: ${entry.count}/${maxRequests}`);
            return res.status(429).json({ error: 'Слишком много запросов. Попробуйте позже.' });
        }

        next();
    };
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetAt) store.delete(key);
    }
}, 5 * 60 * 1000);

module.exports = { rateLimit };
