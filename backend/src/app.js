const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const adminRoutes = require('./routes/admin.routes')
const authRoutes = require('./routes/auth.routes')
const contactRoutes = require('./routes/contact.routes')
const conversationRoutes = require('./routes/conversation.routes')
const notificationRoutes = require('./routes/notification.routes')
const pushRoutes = require('./routes/push.routes')
const searchRoutes = require('./routes/search.routes')
const userRoutes = require('./routes/user.routes')
const { authenticate, requireAdmin } = require('./middleware/auth.middleware')
const { notFoundHandler, errorHandler } = require('./middleware/error.middleware')
const { logRequest } = require('./middleware/requestLogger.middleware')
const { getAllowedOrigins, normalizeOrigin } = require('./utils/allowedOrigins')

const app = express()
const allowedOrigins = new Set(getAllowedOrigins())
const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
      callback(null, true)
      return
    }

    callback(new Error('Nguon goc khong duoc phep boi CORS!'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
)
app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '1mb' }))
app.use(logRequest)

app.get('/api/health', (_request, response) => {
  response.json({
    ok: true,
    service: 'inbox-system-management-api',
    timestamp: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/admin', authenticate, requireAdmin, adminRoutes)
app.use('/api/contacts', authenticate, contactRoutes)
app.use('/api/conversations', authenticate, conversationRoutes)
app.use('/api/notifications', authenticate, notificationRoutes)
app.use('/api/push', authenticate, pushRoutes)
app.use('/api/search', authenticate, searchRoutes)
app.use('/api/users', authenticate, userRoutes)

app.use(notFoundHandler)
app.use(errorHandler)

module.exports = app
