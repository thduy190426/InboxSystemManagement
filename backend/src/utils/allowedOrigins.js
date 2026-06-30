const defaultAllowedOrigins = [
  'https://tduyymessage.netlify.app',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://inboxsystem.netlify.app',
]

function normalizeOrigin(origin) {
  return String(origin || '').trim().replace(/\/+$/, '')
}

function getAllowedOrigins() {
  const envOrigins = [
    process.env.CLIENT_ORIGIN,
    process.env.CLIENT_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map(normalizeOrigin)
    .filter(Boolean)

  return [...new Set([...envOrigins, ...defaultAllowedOrigins.map(normalizeOrigin)])]
}

module.exports = {
  getAllowedOrigins,
  normalizeOrigin,
}
