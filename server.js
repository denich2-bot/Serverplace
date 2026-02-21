'use strict';

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
    }
}

const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { getDb, closeDb } = require('./db/database');

const app = express();
const PORT = parseInt(process.env.PORT || '4000', 10);

// Apply schema on startup
const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf-8');
getDb().exec(schema);

// Middleware
app.use(compression());
app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
}));
app.use(morgan('short'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '30d',
    immutable: true,
    etag: true,
    lastModified: true
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Trust proxy (behind nginx)
app.set('trust proxy', true);

// Routes
const apiRoutes = require('./routes/api');
const adminRoutes = require('./routes/admin');
const pageRoutes = require('./routes/pages');

app.use('/api', apiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/', pageRoutes);

// 404
app.use((req, res) => {
    res.status(404).render('404', { title: '404 — Страница не найдена', currentPage: '' });
});

// Error handler
app.use((err, req, res, _next) => {
    console.error(`[error] ${err.stack || err.message}`);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Start
app.listen(PORT, '0.0.0.0', () => {
    console.log(`[server] ServerPlace запущен на порту ${PORT}`);
    console.log(`[server] http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => { closeDb(); process.exit(0); });
process.on('SIGTERM', () => { closeDb(); process.exit(0); });
