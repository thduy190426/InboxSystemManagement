const { createHash } = require('crypto')
const webPush = require('web-push')
const { pool } = require('../config/db')

let tableReady = false

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY || ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || ''

  if (!publicKey || !privateKey) {
    return null
  }

  return {
    publicKey,
    privateKey,
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@example.com',
  }
}

function configureWebPush() {
  const config = getVapidConfig()

  if (!config) {
    return null
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)

  return config
}

async function ensurePushSubscriptionsTable() {
  if (tableReady) {
    return
  }

  await pool.execute(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      endpoint TEXT NOT NULL,
      endpoint_hash CHAR(64) NOT NULL,
      p256dh_key TEXT NOT NULL,
      auth_key TEXT NOT NULL,
      user_agent VARCHAR(255) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_push_subscriptions_endpoint (endpoint_hash),
      INDEX idx_push_subscriptions_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  )

  tableReady = true
}

function hashEndpoint(endpoint) {
  return createHash('sha256').update(endpoint).digest('hex')
}

async function savePushSubscription(userId, subscription, userAgent = '') {
  await ensurePushSubscriptionsTable()

  await pool.execute(
    `INSERT INTO push_subscriptions (
      user_id,
      endpoint,
      endpoint_hash,
      p256dh_key,
      auth_key,
      user_agent
    ) VALUES (?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      user_id = VALUES(user_id),
      p256dh_key = VALUES(p256dh_key),
      auth_key = VALUES(auth_key),
      user_agent = VALUES(user_agent),
      updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      subscription.endpoint,
      hashEndpoint(subscription.endpoint),
      subscription.keys.p256dh,
      subscription.keys.auth,
      userAgent.slice(0, 255),
    ],
  )
}

async function deletePushSubscription(userId, endpoint) {
  await ensurePushSubscriptionsTable()

  await pool.execute(
    `DELETE FROM push_subscriptions
    WHERE user_id = ? AND endpoint_hash = ?`,
    [userId, hashEndpoint(endpoint)],
  )
}

async function removeFailedSubscription(endpoint) {
  await ensurePushSubscriptionsTable()

  await pool.execute(
    `DELETE FROM push_subscriptions
    WHERE endpoint_hash = ?`,
    [hashEndpoint(endpoint)],
  )
}

async function sendWebPushToUsers(userIds, payload) {
  const config = configureWebPush()

  if (!config || !userIds.length) {
    return
  }

  await ensurePushSubscriptionsTable()

  const uniqueUserIds = [...new Set(userIds.filter(Boolean))]

  if (!uniqueUserIds.length) {
    return
  }

  const placeholders = uniqueUserIds.map(() => '?').join(', ')
  const [subscriptions] = await pool.execute(
    `SELECT endpoint, p256dh_key, auth_key
    FROM push_subscriptions
    WHERE user_id IN (${placeholders})`,
    uniqueUserIds,
  )

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh_key,
              auth: subscription.auth_key,
            },
          },
          JSON.stringify(payload),
        )
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await removeFailedSubscription(subscription.endpoint)
        }
      }
    }),
  )
}

module.exports = {
  configureWebPush,
  deletePushSubscription,
  getVapidConfig,
  savePushSubscription,
  sendWebPushToUsers,
}
