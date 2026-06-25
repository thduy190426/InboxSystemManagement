require('dotenv').config()

const http = require('http')
const app = require('./app')
const { testConnection } = require('./config/db')
const { initRealtime } = require('./realtime/socket')

const port = Number(process.env.PORT || 4000)
const server = http.createServer(app)

async function startServer() {
  try {
    await testConnection()
    initRealtime(server, [
      process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5173',
    ])

    server.listen(port, () => {
      console.log(`API server is running at http://127.0.0.1:${port}`)
    })
  } catch (error) {
    console.error('Unable to start API server.')
    console.error(error)
    process.exit(1)
  }
}

startServer()
