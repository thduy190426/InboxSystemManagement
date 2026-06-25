const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const authRoutes = require('./routes/auth.routes')
const contactRoutes = require('./routes/contact.routes')
const conversationRoutes = require('./routes/conversation.routes')
const notificationRoutes = require('./routes/notification.routes')
const searchRoutes = require('./routes/search.routes')
const userRoutes = require('./routes/user.routes')
const { authenticate } = require('./middleware/auth.middleware')
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware')

const app = express()
const allowedOrigins = new Set([
  process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
])

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin is not allowed by CORS.'))
    },
    credentials: true,
  }),
)
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'inbox-system-management-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/contacts', authenticate, contactRoutes)
app.use('/api/conversations', authenticate, conversationRoutes)
app.use('/api/notifications', authenticate, notificationRoutes)
app.use('/api/search', authenticate, searchRoutes)
app.use('/api/users', authenticate, userRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
