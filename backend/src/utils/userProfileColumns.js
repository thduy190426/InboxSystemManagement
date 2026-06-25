const { pool } = require('../config/db')

const profileColumns = [
  { name: 'gender', definition: 'VARCHAR(20) NULL' },
  { name: 'address', definition: 'VARCHAR(255) NULL' },
  { name: 'birth_date', definition: 'DATE NULL' },
]

let userProfileColumnsReady = null

async function addColumnIfMissing(column) {
  const [rows] = await pool.execute(
    `SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = ?
    LIMIT 1`,
    [column.name],
  )

  if (rows[0]) {
    return
  }

  try {
    await pool.execute(`ALTER TABLE users ADD COLUMN ${column.name} ${column.definition}`)
  } catch (error) {
    if (error?.code === 'ER_DUP_FIELDNAME') {
      return
    }

    throw error
  }
}

async function ensureUserProfileColumns() {
  if (!userProfileColumnsReady) {
    userProfileColumnsReady = Promise.all(profileColumns.map(addColumnIfMissing)).catch((error) => {
      userProfileColumnsReady = null
      throw error
    })
  }

  await userProfileColumnsReady
}

module.exports = {
  ensureUserProfileColumns,
}
