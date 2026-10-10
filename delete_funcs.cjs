const fs = require('fs');

const adminPagePath = 'src/components/views/AdminPage.tsx';
let lines = fs.readFileSync(adminPagePath, 'utf8').split('\n');

const funcsToRemove = [
  'function getErrorMessage',
  'function formatNumber',
  'function formatLastLogin',
  'function formatReportTime',
  'function getReportStatusLabel',
  'function getRoleLabel',
  'function getUserStatusFilterLabel',
  'function getGenderFilterLabel',
  'function getStatusLabel',
  'function getGenderLabel',
];

for (const funcName of funcsToRemove) {
  const start = lines.findIndex(l => l.startsWith(funcName));
  if (start !== -1) {
    let end = start;
    let braceCount = 0;
    let foundBrace = false;
    for (let i = start; i < lines.length; i++) {
      for (const char of lines[i]) {
        if (char === '{') {
          braceCount++;
          foundBrace = true;
        }
        if (char === '}') braceCount--;
      }
      if (foundBrace && braceCount === 0) {
        end = i;
        break;
      }
    }
    // Remove lines from start to end
    lines.splice(start, end - start + 1);
  }
}

fs.writeFileSync(adminPagePath, lines.join('\n'));
