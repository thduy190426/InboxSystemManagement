const fs = require('fs');
let a = fs.readFileSync('src/components/views/AdminPage.tsx', 'utf8');

a = a.replace(/^[ \t]*Edit2,?\s*$/gm, '');
a = a.replace(/^[ \t]*Plus,?\s*$/gm, '');
a = a.replace(/^[ \t]*Trash2,?\s*$/gm, '');
// Clean up blank lines left inside import blocks
a = a.replace(/\{\s*\n\s*\n/g, '{\n');
a = a.replace(/\n\s*\n\s*\}/g, '\n}');

fs.writeFileSync('src/components/views/AdminPage.tsx', a);
console.log('Cleaned AdminPage');
