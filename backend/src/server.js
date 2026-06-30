require('dotenv').config()

const http = require('http')
const app = require('./app')
const { testConnection } = require('./config/db')
const { initRealtime } = require('./realtime/socket')
const { getAllowedOrigins } = require('./utils/allowedOrigins')

const port = Number(process.env.PORT || 4000)
const server = http.createServer(app)

async function startServer() {
  try {
    await testConnection()
    initRealtime(server, getAllowedOrigins())

    server.listen(port, () => {
      console.log(`Máy chủ API đang chạy ở cổng http://127.0.0.1:${port}!`)
    })
  } catch (error) {
    console.error('Khởi động máy chủ API thất bại!')
    console.error(error)
    process.exit(1)
  }
}

startServer()
