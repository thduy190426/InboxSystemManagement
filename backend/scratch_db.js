require('dotenv').config({ path: '.env' });
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inbox_system_management',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
  charset: 'utf8mb4',
});

async function run() {
  try {
    const [cols] = await pool.query('DESCRIBE conversations');
    
    // Check if backgroundImage column exists
    const hasBg = cols.some(c => c.Field === 'backgroundImage');
    if (!hasBg) {
      console.log('Adding backgroundImage column...');
      await pool.query('ALTER TABLE conversations ADD COLUMN backgroundImage VARCHAR(1000) NULL');
      console.log('Column added.');
    } else {
      console.log('Column already exists.');
    }
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
