const fs = require('fs');

let c = fs.readFileSync('src/components/views/ChatApp.tsx', 'utf8');
c = c.replace(/import \{ useQueryClient \} from '@tanstack\/react-query'\r?\n/, '');
fs.writeFileSync('src/components/views/ChatApp.tsx', c);

let a = fs.readFileSync('src/components/views/AdminPage.tsx', 'utf8');
a = a.replace(/Edit2,\r?\n\s*Plus,\r?\n\s*Trash2,\r?\n\s*/, '');
fs.writeFileSync('src/components/views/AdminPage.tsx', a);

console.log('Success');
