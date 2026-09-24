require('dotenv').config({ path: 'backend/.env' });
const { pool } = require('./backend/src/config/db');

async function run() {
  try {
    const [rows] = await pool.query('SHOW TABLES');
    console.log(rows);
    const [cols] = await pool.query('DESCRIBE conversations');
    console.log(cols);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
