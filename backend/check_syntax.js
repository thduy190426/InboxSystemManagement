const fs = require('fs');
const { execSync } = require('child_process');

function check(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = `${dir}/${f.name}`;
    if (f.isDirectory() && f.name !== 'node_modules' && f.name !== 'uploads') {
      check(p);
    } else if (f.name.endsWith('.js')) {
      execSync(`node --check "${p}"`, { stdio: 'inherit' });
    }
  }
}

check('src');
console.log('All backend JS files passed syntax check!');
