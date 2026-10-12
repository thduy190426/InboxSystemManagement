const { pool } = require('../config/db')
const logger = require('./logger')

/**
 * Enriches an array of user objects with mutual friends metrics in a single indexed query.
 * @param {number} currentUserId - The ID of the authenticated user
 * @param {Array<object>} userRows - Array of user objects (each containing `id`, `userId`, or `user_id`)
 * @returns {Promise<Array<object>>} The enriched user array with `mutualCount` and `mutualPreviews`
 */
async function attachMutualFriendsSummary(currentUserId, userRows) {
  if (!Array.isArray(userRows) || userRows.length === 0 || !currentUserId) {
    return userRows || []
  }

  
  const targetIdSet = new Set()
  for (const user of userRows) {
    const rawId = user.userId || user.user_id || (typeof user.id === 'number' ? user.id : null)
    if (rawId && Number(rawId) !== Number(currentUserId)) {
      targetIdSet.add(Number(rawId))
    }
  }

  const targetIds = Array.from(targetIdSet)
  if (targetIds.length === 0) {
    return userRows.map((u) => ({
      ...u,
      mutualCount: 0,
      mutualPreviews: [],
    }))
  }

  try {
    
    const [rows] = await pool.query(
      `SELECT 
        c_target.owner_user_id AS target_user_id,
        m.id AS mutual_user_id,
        m.public_id,
        m.full_name,
        m.avatar_url,
        m.handle
      FROM contacts c_target
      INNER JOIN contacts c_me 
        ON c_me.owner_user_id = ? 
        AND c_me.contact_user_id = c_target.contact_user_id 
        AND c_me.status = 'accepted'
      INNER JOIN users m 
        ON m.id = c_target.contact_user_id 
        AND m.deleted_at IS NULL 
        AND m.is_active = 1
      WHERE c_target.owner_user_id IN (?) 
        AND c_target.status = 'accepted'
        AND c_target.contact_user_id != ?
      ORDER BY c_target.owner_user_id, m.full_name ASC`,
      [currentUserId, targetIds, currentUserId],
    )

    
    const mutualMap = new Map()
    for (const row of rows) {
      const targetId = Number(row.target_user_id)
      if (!mutualMap.has(targetId)) {
        mutualMap.set(targetId, [])
      }
      mutualMap.get(targetId).push({
        id: row.public_id,
        userId: row.mutual_user_id,
        fullName: row.full_name,
        avatarUrl: row.avatar_url,
        handle: row.handle,
      })
    }

    
    return userRows.map((user) => {
      const rawId = Number(user.userId || user.user_id || (typeof user.id === 'number' ? user.id : 0))
      const friends = mutualMap.get(rawId) || []
      return {
        ...user,
        mutualCount: friends.length,
        mutualPreviews: friends.slice(0, 3),
      }
    })
  } catch (error) {
    logger.error('Lỗi khi tính toán bạn chung (attachMutualFriendsSummary):', error)
    
    return userRows.map((user) => ({
      ...user,
      mutualCount: user.mutualCount || 0,
      mutualPreviews: user.mutualPreviews || [],
    }))
  }
}

/**
 * Retrieves the full list of mutual friends between current user and target user.
 * @param {number} currentUserId
 * @param {number} targetUserId
 * @returns {Promise<Array<object>>}
 */
async function getMutualFriendsList(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId || Number(currentUserId) === Number(targetUserId)) {
    return []
  }

  const [rows] = await pool.query(
    `SELECT 
      m.id AS user_id,
      m.public_id AS id,
      m.full_name,
      m.avatar_url,
      m.handle,
      m.status_message,
      m.bio,
      m.presence,
      m.created_at,
      c_me.created_at AS friend_since
    FROM contacts c_target
    INNER JOIN contacts c_me 
      ON c_me.owner_user_id = ? 
      AND c_me.contact_user_id = c_target.contact_user_id 
      AND c_me.status = 'accepted'
    INNER JOIN users m 
      ON m.id = c_target.contact_user_id 
      AND m.deleted_at IS NULL 
      AND m.is_active = 1
    WHERE c_target.owner_user_id = ? 
      AND c_target.status = 'accepted'
      AND c_target.contact_user_id NOT IN (?, ?)
    ORDER BY m.full_name ASC`,
    [currentUserId, targetUserId, currentUserId, targetUserId],
  )

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    avatarUrl: row.avatar_url,
    handle: row.handle,
    statusMessage: row.status_message,
    bio: row.bio,
    presence: row.presence || 'offline',
    createdAt: row.created_at,
    friendSince: row.friend_since,
  }))
}

module.exports = {
  attachMutualFriendsSummary,
  getMutualFriendsList,
}
