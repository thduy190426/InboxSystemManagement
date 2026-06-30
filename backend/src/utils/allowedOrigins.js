const defaultAllowedOrigins = [
  'https://tduyymessage.netlify.app',
  'http://127.0.0.1:5173',
  'http://localhost:5173',
  'https://inboxsystem.netlify.app'
]

function getAllowedOrigins() {
  const envOrigins = [
    process.env.CLIENT_ORIGIN,
    process.env.CLIENT_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => value.split(','))
    .map((origin) => origin.trim())
    .filter(Boolean)

  return [...new Set([...envOrigins, ...defaultAllowedOrigins])]
}

module.exports = {
  getAllowedOrigins,
}
