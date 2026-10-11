const crypto = require('crypto');
const { pool } = require('../../config/db');
const { uploadBufferToCloudinary } = require('../../config/upload');
const { getIO } = require('../../realtime/socket');

let storySchemaReadyPromise = null;

async function ensureStorySchema() {
  if (storySchemaReadyPromise) return storySchemaReadyPromise;

  storySchemaReadyPromise = (async () => {
    try {
      // 1. Ensure story_views table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_views (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          story_id CHAR(36) NOT NULL,
          viewer_id BIGINT UNSIGNED NOT NULL,
          viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_story_viewer (story_id, viewer_id),
          KEY idx_story_views_story (story_id),
          KEY idx_story_views_viewer (viewer_id),
          CONSTRAINT fk_story_views_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
          CONSTRAINT fk_story_views_user FOREIGN KEY (viewer_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 2. Ensure story_reactions table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_reactions (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          story_id CHAR(36) NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          reaction VARCHAR(16) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_story_user_reaction (story_id, user_id),
          KEY idx_story_reactions_story (story_id),
          KEY idx_story_reactions_user (user_id),
          CONSTRAINT fk_story_reactions_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
          CONSTRAINT fk_story_reactions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Ensure story_close_friends table
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_close_friends (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          user_id BIGINT UNSIGNED NOT NULL,
          friend_id BIGINT UNSIGNED NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_user_close_friend (user_id, friend_id),
          KEY idx_close_friends_user (user_id),
          KEY idx_close_friends_friend (friend_id),
          CONSTRAINT fk_close_friends_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
          CONSTRAINT fk_close_friends_friend FOREIGN KEY (friend_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 4. Alter stories if missing columns
      try {
        await pool.execute('ALTER TABLE stories ADD COLUMN views_count INT UNSIGNED NOT NULL DEFAULT 0');
      } catch (e) {
        if (e && e.code !== 'ER_DUP_FIELDNAME') console.warn('[story.controller] views_count:', e.message);
      }
      try {
        await pool.execute('ALTER TABLE stories ADD COLUMN reactions_count INT UNSIGNED NOT NULL DEFAULT 0');
      } catch (e) {
        if (e && e.code !== 'ER_DUP_FIELDNAME') console.warn('[story.controller] reactions_count:', e.message);
      }
      try {
        await pool.execute(`
          ALTER TABLE stories 
          MODIFY COLUMN privacy ENUM('public', 'friends', 'close_friends', 'only_me') NOT NULL DEFAULT 'friends'
        `);
      } catch (e) {
        console.warn('[story.controller] privacy column modify:', e.message);
      }
      console.log('[story.controller] Story schema initialization verified.');
    } catch (err) {
      console.warn('[story.controller] Schema initialization check:', err.message);
    }
  })();

  return storySchemaReadyPromise;
}

// Trigger initialization safely
ensureStorySchema().catch(() => {});

exports.createStory = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const { privacy = 'friends', text_content = '' } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'Media file is required for a story' });
    }

    let media_type = 'image';
    let resourceType = 'image';

    if (file.mimetype.startsWith('video/')) {
      media_type = 'video';
      resourceType = 'video';
    }

    const uploadOptions = {
      folder: 'stories',
      resourceType: resourceType,
    };
    
    const uploadResult = await uploadBufferToCloudinary(file, uploadOptions);
    const storyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    await pool.query(
      `INSERT INTO stories (id, user_id, media_url, media_type, text_content, privacy, views_count, reactions_count, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?)`,
      [storyId, userId, uploadResult.secure_url, media_type, text_content, privacy, expiresAt]
    );

    const [userRows] = await pool.query(
      'SELECT id, full_name, display_name, avatar_url FROM users WHERE id = ?',
      [userId]
    );
    const user = userRows[0];

    const newStory = {
      id: storyId,
      user_id: userId,
      user: {
        id: user.id,
        full_name: user.full_name,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      media_url: uploadResult.secure_url,
      media_type,
      text_content,
      privacy,
      views_count: 0,
      reactions_count: 0,
      expires_at: expiresAt,
      created_at: new Date(),
    };

    const io = getIO();
    if (io) {
      io.emit('story:created', newStory);
    }

    res.status(201).json({
      success: true,
      story: newStory,
    });
  } catch (error) {
    console.error('[story.controller] Error in createStory:', error);
    next(error);
  }
};

exports.getActiveStories = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;

    // Lọc theo quyền riêng tư:
    // 1. Story của chính mình: luôn xem được
    // 2. Story 'public': xem được
    // 3. Story 'close_friends': chỉ xem được nếu requester là bạn thân của tác giả
    // 4. Story 'friends': xem được nếu requester là bạn bè (contacts)
    // 5. Story 'only_me': chỉ tác giả xem được
    const [stories] = await pool.query(
      `SELECT s.id, s.user_id, s.media_url, s.media_type, s.text_content, s.privacy, 
              s.views_count, s.reactions_count, s.expires_at, s.created_at,
              u.full_name, u.display_name, u.avatar_url, u.public_id,
              EXISTS (
                SELECT 1 FROM story_views sv 
                WHERE sv.story_id = s.id AND sv.viewer_id = ?
              ) AS has_viewed,
              (
                SELECT sr.reaction FROM story_reactions sr 
                WHERE sr.story_id = s.id AND sr.user_id = ? 
                LIMIT 1
              ) AS my_reaction,
              EXISTS (
                SELECT 1 FROM story_close_friends scf
                WHERE scf.user_id = s.user_id AND scf.friend_id = ?
              ) AS is_in_author_close_friends
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > NOW()
         AND (
           s.user_id = ?
           OR s.privacy = 'public'
           OR (
             s.privacy = 'close_friends' 
             AND EXISTS (
               SELECT 1 FROM story_close_friends scf 
               WHERE scf.user_id = s.user_id AND scf.friend_id = ?
             )
           )
           OR (
             s.privacy = 'friends'
             AND (
               EXISTS (
                 SELECT 1 FROM contacts c 
                 WHERE ((c.user_id = ? AND c.contact_id = s.user_id) 
                     OR (c.user_id = s.user_id AND c.contact_id = ?))
                   AND c.status = 'accepted'
               )
             )
           )
         )
       ORDER BY s.created_at ASC`,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    const groupedStories = {};
    for (const story of stories) {
      if (!groupedStories[story.user_id]) {
        groupedStories[story.user_id] = {
          user_id: story.user_id,
          public_id: story.public_id,
          full_name: story.full_name,
          display_name: story.display_name,
          avatar_url: story.avatar_url,
          is_close_friend: Boolean(story.privacy === 'close_friends'),
          items: [],
        };
      }

      if (story.privacy === 'close_friends') {
        groupedStories[story.user_id].is_close_friend = true;
      }

      groupedStories[story.user_id].items.push({
        id: story.id,
        media_url: story.media_url,
        media_type: story.media_type,
        text_content: story.text_content,
        privacy: story.privacy,
        views_count: Number(story.views_count || 0),
        reactions_count: Number(story.reactions_count || 0),
        has_viewed: Boolean(story.has_viewed),
        my_reaction: story.my_reaction || null,
        is_close_friend: Boolean(story.privacy === 'close_friends'),
        expires_at: story.expires_at,
        created_at: story.created_at,
      });
    }

    res.json({
      success: true,
      data: Object.values(groupedStories),
    });
  } catch (error) {
    console.error('[story.controller] Error in getActiveStories:', error);
    next(error);
  }
};

exports.recordView = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const viewerId = req.user.id;
    const storyId = req.params.id;

    const [storyRows] = await pool.query(
      'SELECT id, user_id FROM stories WHERE id = ?',
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }
    const story = storyRows[0];

    const [insertResult] = await pool.query(
      'INSERT IGNORE INTO story_views (story_id, viewer_id) VALUES (?, ?)',
      [storyId, viewerId]
    );

    if (insertResult.affectedRows > 0) {
      await pool.query(
        'UPDATE stories SET views_count = views_count + 1 WHERE id = ?',
        [storyId]
      );

      const io = getIO();
      if (io) {
        io.to(`user:${story.user_id}`).emit('story:viewed', {
          storyId,
          viewerId,
          viewer: {
            id: req.user.id,
            full_name: req.user.full_name,
            display_name: req.user.display_name,
            avatar_url: req.user.avatar_url,
          },
          viewedAt: new Date(),
        });
      }
    }

    const [countRows] = await pool.query(
      'SELECT views_count FROM stories WHERE id = ?',
      [storyId]
    );

    res.json({
      success: true,
      storyId,
      views_count: countRows[0]?.views_count || 0,
      isNewView: insertResult.affectedRows > 0,
    });
  } catch (error) {
    console.error('[story.controller] Error in recordView:', error);
    next(error);
  }
};

exports.reactToStory = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;
    const { reaction } = req.body;

    if (!reaction) {
      return res.status(400).json({ success: false, message: 'Reaction emoji is required' });
    }

    const [storyRows] = await pool.query(
      'SELECT id, user_id, media_url, media_type, text_content FROM stories WHERE id = ?',
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }
    const story = storyRows[0];

    const [existing] = await pool.query(
      'SELECT reaction FROM story_reactions WHERE story_id = ? AND user_id = ?',
      [storyId, userId]
    );

    let action = 'added';
    let currentReaction = reaction;

    if (existing.length > 0 && existing[0].reaction === reaction) {
      // Bấm lại emoji cũ -> Gỡ bỏ reaction
      await pool.query(
        'DELETE FROM story_reactions WHERE story_id = ? AND user_id = ?',
        [storyId, userId]
      );
      await pool.query(
        'UPDATE stories SET reactions_count = GREATEST(0, CAST(reactions_count AS SIGNED) - 1) WHERE id = ?',
        [storyId]
      );
      action = 'removed';
      currentReaction = null;
    } else {
      // Đổi sang emoji khác hoặc thả mới
      const isNew = existing.length === 0;
      await pool.query(
        `INSERT INTO story_reactions (story_id, user_id, reaction)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE reaction = VALUES(reaction)`,
        [storyId, userId, reaction]
      );

      if (isNew) {
        await pool.query(
          'UPDATE stories SET reactions_count = reactions_count + 1 WHERE id = ?',
          [storyId]
        );
        action = 'added';
      } else {
        action = 'updated';
      }
    }

    const [countRows] = await pool.query(
      'SELECT reactions_count FROM stories WHERE id = ?',
      [storyId]
    );

    const io = getIO();
    if (io) {
      const payload = {
        storyId,
        userId,
        user: {
          id: req.user.id,
          full_name: req.user.full_name,
          display_name: req.user.display_name,
          avatar_url: req.user.avatar_url,
        },
        reaction: currentReaction,
        action,
        reactions_count: countRows[0]?.reactions_count || 0,
      };

      io.to(`user:${story.user_id}`).emit('story:reacted', payload);
      io.emit('story:reaction_updated', {
        storyId,
        reactions_count: countRows[0]?.reactions_count || 0,
      });
    }

    res.json({
      success: true,
      storyId,
      action,
      reaction: currentReaction,
      reactions_count: countRows[0]?.reactions_count || 0,
    });
  } catch (error) {
    console.error('[story.controller] Error in reactToStory:', error);
    next(error);
  }
};

exports.replyToStory = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const viewerId = req.user.id;
    const storyId = req.params.id;
    const { message = '', reaction = null } = req.body;

    if (!message && !reaction) {
      return res.status(400).json({ success: false, message: 'Message or reaction is required' });
    }

    // 1. Tìm thông tin story
    const [storyRows] = await pool.query(
      'SELECT id, user_id, media_url, media_type, text_content FROM stories WHERE id = ?',
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }
    const story = storyRows[0];
    const authorId = story.user_id;

    if (String(viewerId) === String(authorId)) {
      return res.status(400).json({ success: false, message: 'Cannot reply to your own story' });
    }

    // 2. Tìm hoặc tạo cuộc trò chuyện 1-1 giữa viewer và author
    let conversationId = null;
    const [existingConv] = await pool.query(
      `SELECT c.id FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
       WHERE c.type = 'direct' LIMIT 1`,
      [viewerId, authorId]
    );

    if (existingConv.length > 0) {
      conversationId = existingConv[0].id;
    } else {
      const [newConvResult] = await pool.query(
        "INSERT INTO conversations (type, title) VALUES ('direct', '')"
      );
      conversationId = newConvResult.insertId;
      await pool.query(
        `INSERT INTO conversation_participants (conversation_id, user_id, role) 
         VALUES (?, ?, 'member'), (?, ?, 'member')`,
        [conversationId, viewerId, conversationId, authorId]
      );
    }

    // 3. Chuẩn bị nội dung và metadata story
    const content = message || (reaction ? `Đã thả cảm xúc ${reaction} vào story của bạn` : '');
    const metadata = JSON.stringify({
      type: 'story_reply',
      storyId: story.id,
      storyMediaUrl: story.media_url,
      storyMediaType: story.media_type,
      storyTextContent: story.text_content,
      reaction: reaction || null,
    });

    // 4. Tạo tin nhắn story_reply
    const [msgResult] = await pool.query(
      `INSERT INTO messages (conversation_id, sender_id, type, content, metadata, created_at)
       VALUES (?, ?, 'story_reply', ?, ?, NOW())`,
      [conversationId, viewerId, content, metadata]
    );

    const messageId = msgResult.insertId;

    await pool.query(
      'UPDATE conversations SET updated_at = NOW() WHERE id = ?',
      [conversationId]
    );

    const [msgRows] = await pool.query(
      `SELECT m.*, u.full_name, u.display_name, u.avatar_url
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [messageId]
    );
    const createdMessage = msgRows[0];

    const io = getIO();
    if (io) {
      io.to(`conversation:${conversationId}`).emit('message:new', createdMessage);
      io.to(`user:${authorId}`).emit('conversation:message', {
        conversationId,
        message: createdMessage,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Story reply sent successfully',
      data: {
        conversationId,
        message: createdMessage,
      },
    });
  } catch (error) {
    console.error('[story.controller] Error in replyToStory:', error);
    next(error);
  }
};

exports.getStoryViewers = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;

    const [storyRows] = await pool.query(
      'SELECT id, user_id FROM stories WHERE id = ?',
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story not found or expired' });
    }

    if (String(storyRows[0].user_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Only the story author can view story analytics' });
    }

    const [viewers] = await pool.query(
      `SELECT sv.viewer_id AS id, sv.viewed_at,
              u.full_name, u.display_name, u.avatar_url,
              sr.reaction
       FROM story_views sv
       JOIN users u ON sv.viewer_id = u.id
       LEFT JOIN story_reactions sr ON sr.story_id = sv.story_id AND sr.user_id = sv.viewer_id
       WHERE sv.story_id = ?
       ORDER BY sv.viewed_at DESC`,
      [storyId]
    );

    res.json({
      success: true,
      data: viewers,
    });
  } catch (error) {
    console.error('[story.controller] Error in getStoryViewers:', error);
    next(error);
  }
};

exports.deleteStory = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;

    const [storyRows] = await pool.query(
      'SELECT id, user_id FROM stories WHERE id = ?',
      [storyId]
    );
    if (storyRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Story not found or already deleted' });
    }

    if (String(storyRows[0].user_id) !== String(userId)) {
      return res.status(403).json({ success: false, message: 'Unauthorized to delete this story' });
    }

    await pool.query('DELETE FROM stories WHERE id = ?', [storyId]);

    const io = getIO();
    if (io) {
      io.emit('story:deleted', { storyId, userId });
    }

    res.json({
      success: true,
      message: 'Story deleted successfully',
    });
  } catch (error) {
    console.error('[story.controller] Error in deleteStory:', error);
    next(error);
  }
};

exports.getCloseFriends = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;

    const [friends] = await pool.query(
      `SELECT scf.friend_id AS id, scf.created_at,
              u.full_name, u.display_name, u.avatar_url, u.email
       FROM story_close_friends scf
       JOIN users u ON scf.friend_id = u.id
       WHERE scf.user_id = ?
       ORDER BY scf.created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: friends,
    });
  } catch (error) {
    console.error('[story.controller] Error in getCloseFriends:', error);
    next(error);
  }
};

exports.toggleCloseFriend = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const { friend_id } = req.body;

    if (!friend_id) {
      return res.status(400).json({ success: false, message: 'friend_id is required' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM story_close_friends WHERE user_id = ? AND friend_id = ?',
      [userId, friend_id]
    );

    let isCloseFriend = false;
    if (existing.length > 0) {
      await pool.query(
        'DELETE FROM story_close_friends WHERE user_id = ? AND friend_id = ?',
        [userId, friend_id]
      );
      isCloseFriend = false;
    } else {
      await pool.query(
        'INSERT INTO story_close_friends (user_id, friend_id) VALUES (?, ?)',
        [userId, friend_id]
      );
      isCloseFriend = true;
    }

    res.json({
      success: true,
      friend_id,
      isCloseFriend,
    });
  } catch (error) {
    console.error('[story.controller] Error in toggleCloseFriend:', error);
    next(error);
  }
};
