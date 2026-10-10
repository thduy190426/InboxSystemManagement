const fs = require('fs');
let c = fs.readFileSync('src/components/views/AdminPage.tsx', 'utf8');

c = c.replace(/type UserGenderFilter = [^\n]+\n/, '');

const importStr = "import { USER_ROLES, USER_STATUSES, USER_GENDERS, type UserGenderFilter, formatNumber, getErrorMessage, formatLastLogin, formatReportTime, getReportStatusLabel, getRoleLabel, getUserStatusFilterLabel, getGenderFilterLabel, getStatusLabel, getGenderLabel } from './admin/AdminUtils';\n";

c = importStr + c;

fs.writeFileSync('src/components/views/AdminPage.tsx', c);
