'use strict';

const fs = require('fs');
const path = require('path');
const { getDb, closeDb } = require('./database');

const db = getDb();

try {
    // 1. Add column if not exists
    console.log('Adding service_type column to offers...');
    try {
        db.exec("ALTER TABLE offers ADD COLUMN service_type TEXT DEFAULT 'vds'");
        console.log('Column added.');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column service_type already exists.');
        } else {
            throw e;
        }
    }

    // 2. Create index
    console.log('Creating index idx_offers_service_type...');
    db.exec('CREATE INDEX IF NOT EXISTS idx_offers_service_type ON offers(service_type)');

    // 3. Assign random service types for testing
    // Options: 'vds', 'cloud', 'hosting', 'dedicated', 's3'
    // To keep logic intact, we will leave 60% as VDS, 10% Cloud, 10% Hosting, 10% Dedicated, 10% S3

    db.exec(`
        UPDATE offers SET service_type = 'vds';
        
        UPDATE offers SET service_type = 'cloud' 
        WHERE rowid % 10 = 0;
        
        UPDATE offers SET service_type = 'hosting' 
        WHERE rowid % 10 = 1;

        UPDATE offers SET service_type = 'dedicated' 
        WHERE rowid % 10 = 2;

        UPDATE offers SET service_type = 's3' 
        WHERE rowid % 10 = 3;
    `);

    // Let's print out the exact count of each service type
    const counts = db.prepare('SELECT service_type, COUNT(*) as count FROM offers GROUP BY service_type').all();
    console.log('Current service type distribution:');
    counts.forEach(row => {
        console.log(`- ${row.service_type}: ${row.count}`);
    });

    console.log('Migration completed successfully.');

} catch (err) {
    console.error('Migration failed:', err);
} finally {
    closeDb();
}
