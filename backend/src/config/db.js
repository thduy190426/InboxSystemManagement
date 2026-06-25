const mysql = require('mysql2/promise')

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inbox_system_management',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  namedPlaceholders: true,
  charset: 'utf8mb4',
})

async function testConnection() {
  const connection = await pool.getConnection()

  try {
    await connection.ping()
  } finally {
    connection.release()
  }
}

module.exports = {
  pool,
  testConnection,
}
