const fs = require('fs');
let c = fs.readFileSync('src/components/views/AdminPage.tsx', 'utf8');

// Remove local definitions
c = c.replace(/const USER_ROLES[^\n]+\n/, '');
c = c.replace(/const USER_STATUSES[^\n]+\n/, '');
c = c.replace(/const USER_GENDERS[^\n]+\n/, '');

// Add imports
c = c.replace(/import \{([^}]+)\} from '\.\/admin\/AdminUtils';/, (match, p1) => {
  const imports = new Set(p1.split(',').map(s => s.trim()));
  imports.add('USER_ROLES');
  imports.add('USER_STATUSES');
  imports.add('USER_GENDERS');
  imports.add('UserGenderFilter');
  return 'import { ' + Array.from(imports).filter(Boolean).join(', ') + " } from './admin/AdminUtils';";
});

fs.writeFileSync('src/components/views/AdminPage.tsx', c);
