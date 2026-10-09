const db = require('../../config/db')

async function uploadKeys(req, res, next) {
  try {
    const { deviceId, registrationId, identityKey, signedPreKey, oneTimePreKeys } = req.body
    const userId = req.user.id

    if (!deviceId || registrationId === undefined || !identityKey || !signedPreKey) {
      return res.status(400).json({ error: 'Missing required key information' })
    }

    const connection = await db.getConnection()
    try {
      await connection.beginTransaction()

      await connection.execute(
        `INSERT INTO e2ee_devices (user_id, device_id, registration_id)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE registration_id = ?, last_seen_at = CURRENT_TIMESTAMP`,
        [userId, deviceId, registrationId, registrationId]
      )

      await connection.execute(
        `INSERT INTO e2ee_identity_keys (user_id, device_id, identity_key)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE identity_key = ?`,
        [userId, deviceId, identityKey, identityKey]
      )

      await connection.execute(
        `INSERT INTO e2ee_signed_prekeys (user_id, device_id, key_id, public_key, signature)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE public_key = ?, signature = ?, created_at = CURRENT_TIMESTAMP`,
        [
          userId, deviceId, signedPreKey.keyId, signedPreKey.publicKey, signedPreKey.signature,
          signedPreKey.publicKey, signedPreKey.signature
        ]
      )

      if (Array.isArray(oneTimePreKeys) && oneTimePreKeys.length > 0) {
        await connection.execute(
          `DELETE FROM e2ee_onetime_prekeys WHERE user_id = ? AND device_id = ?`,
          [userId, deviceId]
        )

        const values = []
        const placeholders = []
        for (const preKey of oneTimePreKeys) {
          placeholders.push('(?, ?, ?, ?)')
          values.push(userId, deviceId, preKey.keyId, preKey.publicKey)
        }

        await connection.execute(
          `INSERT INTO e2ee_onetime_prekeys (user_id, device_id, key_id, public_key)
           VALUES ${placeholders.join(', ')}`,
          values
        )
      }

      await connection.commit()
      res.json({ success: true })
    } catch (error) {
      await connection.rollback()
      throw error
    } finally {
      connection.release()
    }
  } catch (error) {
    next(error)
  }
}

async function fetchKeys(req, res, next) {
  try {
    const targetUserId = req.params.userId
    const [devices] = await db.execute(
      `SELECT device_id, registration_id
       FROM e2ee_devices
       WHERE user_id = ?
       ORDER BY last_seen_at DESC
       LIMIT 1`,
      [targetUserId]
    )

    if (devices.length === 0) {
      return res.status(404).json({ error: 'Target user has no registered E2EE devices' })
    }

    const device = devices[0]

    const [identityKeys] = await db.execute(
      `SELECT identity_key FROM e2ee_identity_keys WHERE user_id = ? AND device_id = ?`,
      [targetUserId, device.device_id]
    )

    const [signedPreKeys] = await db.execute(
      `SELECT key_id, public_key, signature FROM e2ee_signed_prekeys WHERE user_id = ? AND device_id = ? ORDER BY created_at DESC LIMIT 1`,
      [targetUserId, device.device_id]
    )

    const [oneTimePreKeys] = await db.execute(
      `SELECT key_id, public_key FROM e2ee_onetime_prekeys WHERE user_id = ? AND device_id = ? LIMIT 1`,
      [targetUserId, device.device_id]
    )

    if (identityKeys.length === 0 || signedPreKeys.length === 0) {
      return res.status(404).json({ error: 'Incomplete key bundle for target user' })
    }

    const bundle = {
      identityKey: identityKeys[0].identity_key,
      registrationId: device.registration_id,
      signedPreKey: {
        keyId: signedPreKeys[0].key_id,
        publicKey: signedPreKeys[0].public_key,
        signature: signedPreKeys[0].signature
      },
      preKey: oneTimePreKeys.length > 0 ? {
        keyId: oneTimePreKeys[0].key_id,
        publicKey: oneTimePreKeys[0].public_key
      } : null
    }

    if (oneTimePreKeys.length > 0) {
      await db.execute(
        `DELETE FROM e2ee_onetime_prekeys WHERE user_id = ? AND device_id = ? AND key_id = ?`,
        [targetUserId, device.device_id, oneTimePreKeys[0].key_id]
      )
    }

    res.json({
      devices: [
        {
          deviceId: device.device_id,
          ...bundle
        }
      ]
    })

  } catch (error) {
    next(error)
  }
}

module.exports = {
  uploadKeys,
  fetchKeys
}
