require('dotenv').config()
const dns = require('node:dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}
const http = require('http')
const app = require('./app')
const { pool, testConnection } = require('./config/db')
const { ensureConversationSchemaOnce } = require('./controllers/core/conversation.controller')
const { initRealtime } = require('./realtime/socket')
const { getAllowedOrigins } = require('./utils/allowedOrigins')
const logger = require('./utils/logger')

const port = Number(process.env.PORT || 4000)
const server = http.createServer(app)

async function ensureOptimalIndexes() {
  const connection = await pool.getConnection()
  try {
    const indexes = [
      'ALTER TABLE conversation_participants ADD INDEX idx_cp_user_conv_left (user_id, left_at, hidden_at, conversation_id)',
      'ALTER TABLE messages ADD INDEX idx_messages_conv_del_created_id (conversation_id, deleted_at, created_at DESC, id DESC)',
      'ALTER TABLE message_attachments ADD INDEX idx_msg_attachments_msg_created (message_id, created_at, id)',
      'ALTER TABLE messages ADD INDEX idx_messages_sender_conv (sender_id, conversation_id, deleted_at)'
    ]
    for (const sql of indexes) {
      try {
        await connection.query(sql)
      } catch (err) {
        if (err.code !== 'ER_DUP_KEYNAME') logger.debug('Index warning:', err.message)
      }
    }
  } catch (err) {
    logger.warn('Error ensuring indexes:', err.message || err)
  } finally {
    connection.release()
  }
}

async function startServer() {
  try {
    await testConnection()
    logger.info('Kết nối cơ sở dữ liệu thành công.')
    await ensureOptimalIndexes()
    await ensureConversationSchemaOnce()
    initRealtime(server, getAllowedOrigins())

    server.listen(port, () => {
      logger.info(`Máy chủ API đang chạy ở cổng http://127.0.0.1:${port}!`)
    })
  } catch (error) {
    logger.error('Khởi động máy chủ API thất bại!', error)
    process.exit(1)
  }
}

startServer()
