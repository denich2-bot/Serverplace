const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, 'legal');
const dest = path.join(__dirname, 'public', 'legal');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
const files = fs.readdirSync(src);
for (const f of files) {
    let newName = 'document.docx';
    if (f.includes('ПОЛИТИКА')) newName = 'privacy_policy.docx';
    else if (f.includes('СОГЛАШЕНИЕ')) newName = 'terms_of_service.docx';
    else if (f.includes('СОГЛАСИЕ')) newName = 'consent.docx';
    fs.copyFileSync(path.join(src, f), path.join(dest, newName));
    console.log('Copied', f, 'to', newName);
}
