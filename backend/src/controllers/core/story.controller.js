const crypto = require('crypto');
const { pool } = require('../../config/db');
const { uploadBufferToCloudinary } = require('../../config/upload');
const { getIO } = require('../../realtime/socket');
const { attachMutualFriendsSummary } = require('../../utils/mutualFriends.util');

let storySchemaReadyPromise = null;

async function ensureStorySchema() {
  if (storySchemaReadyPromise) return storySchemaReadyPromise;

  storySchemaReadyPromise = (async () => {
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS stories (
          id CHAR(36) NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          media_url VARCHAR(500) NOT NULL,
          media_type ENUM('image', 'video') NOT NULL DEFAULT 'image',
          text_content TEXT NULL,
          privacy ENUM('public', 'friends', 'close_friends', 'only_me') NOT NULL DEFAULT 'friends',
          views_count INT UNSIGNED NOT NULL DEFAULT 0,
          reactions_count INT UNSIGNED NOT NULL DEFAULT 0,
          expires_at DATETIME NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_stories_user_id (user_id),
          KEY idx_stories_expires_at (expires_at),
          CONSTRAINT fk_stories_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

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

      
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_poll_votes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          story_id CHAR(36) NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          option_idx TINYINT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_story_user_poll (story_id, user_id),
          KEY idx_poll_story (story_id),
          KEY idx_poll_user (user_id),
          CONSTRAINT fk_poll_votes_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
          CONSTRAINT fk_poll_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_slider_votes (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          story_id CHAR(36) NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          value FLOAT NOT NULL DEFAULT 50,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_story_user_slider (story_id, user_id),
          KEY idx_slider_story (story_id),
          KEY idx_slider_user (user_id),
          CONSTRAINT fk_slider_votes_story FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
          CONSTRAINT fk_slider_votes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_highlights (
          id CHAR(36) NOT NULL,
          user_id BIGINT UNSIGNED NOT NULL,
          title VARCHAR(100) NOT NULL,
          cover_url VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY idx_highlights_user (user_id),
          CONSTRAINT fk_highlights_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS story_highlight_items (
          id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
          highlight_id CHAR(36) NOT NULL,
          story_id CHAR(36) NOT NULL,
          order_index INT UNSIGNED NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_highlight_story (highlight_id, story_id),
          KEY idx_highlight_items_hl (highlight_id),
          KEY idx_highlight_items_st (story_id),
          CONSTRAINT fk_highlight_items_hl FOREIGN KEY (highlight_id) REFERENCES story_highlights (id) ON DELETE CASCADE,
          CONSTRAINT fk_highlight_items_st FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      
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
                 WHERE ((c.owner_user_id = ? AND c.contact_user_id = s.user_id) 
                     OR (c.owner_user_id = s.user_id AND c.contact_user_id = ?))
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

    
    const content = message || (reaction ? `Đã thả cảm xúc ${reaction} vào story của bạn` : '');
    const metadata = JSON.stringify({
      type: 'story_reply',
      storyId: story.id,
      storyMediaUrl: story.media_url,
      storyMediaType: story.media_type,
      storyTextContent: story.text_content,
      reaction: reaction || null,
    });

    
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

    const enrichedViewers = await attachMutualFriendsSummary(userId, viewers);

    res.json({
      success: true,
      data: enrichedViewers,
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

exports.votePoll = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;
    const { optionIdx } = req.body;
    const chosenOption = Number(optionIdx) === 1 ? 1 : 0;

    await pool.query(
      `INSERT INTO story_poll_votes (story_id, user_id, option_idx) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE option_idx = VALUES(option_idx)`,
      [storyId, userId, chosenOption]
    );

    const [statsRows] = await pool.query(
      `SELECT option_idx, COUNT(*) as count FROM story_poll_votes WHERE story_id = ? GROUP BY option_idx`,
      [storyId]
    );
    let countA = 0, countB = 0;
    statsRows.forEach(r => {
      if (r.option_idx === 0) countA = Number(r.count);
      else if (r.option_idx === 1) countB = Number(r.count);
    });
    const total = countA + countB;
    const percentA = total > 0 ? Math.round((countA / total) * 100) : 0;
    const percentB = total > 0 ? (100 - percentA) : 0;

    res.json({
      success: true,
      pollStats: { countA, countB, percentA, percentB, total, myVote: chosenOption }
    });
  } catch (error) {
    console.error('[story.controller] Error in votePoll:', error);
    next(error);
  }
};


exports.getPollStats = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;

    const [statsRows] = await pool.query(
      `SELECT option_idx, COUNT(*) as count FROM story_poll_votes WHERE story_id = ? GROUP BY option_idx`,
      [storyId]
    );
    let countA = 0, countB = 0;
    statsRows.forEach(r => {
      if (r.option_idx === 0) countA = Number(r.count);
      else if (r.option_idx === 1) countB = Number(r.count);
    });
    const total = countA + countB;
    const percentA = total > 0 ? Math.round((countA / total) * 100) : 0;
    const percentB = total > 0 ? (100 - percentA) : 0;

    const [myVoteRows] = await pool.query(
      `SELECT option_idx FROM story_poll_votes WHERE story_id = ? AND user_id = ?`,
      [storyId, userId]
    );
    const myVote = myVoteRows.length > 0 ? myVoteRows[0].option_idx : null;

    res.json({
      success: true,
      pollStats: { countA, countB, percentA, percentB, total, myVote }
    });
  } catch (error) {
    console.error('[story.controller] Error in getPollStats:', error);
    next(error);
  }
};


exports.voteSlider = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;
    const value = Math.max(0, Math.min(100, Number(req.body.value) || 50));

    await pool.query(
      `INSERT INTO story_slider_votes (story_id, user_id, value) 
       VALUES (?, ?, ?) 
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [storyId, userId, value]
    );

    const [rows] = await pool.query(
      `SELECT AVG(value) as avg_val, COUNT(*) as count FROM story_slider_votes WHERE story_id = ?`,
      [storyId]
    );
    const average = rows[0]?.avg_val ? Math.round(Number(rows[0].avg_val)) : Math.round(value);
    const total = rows[0]?.count ? Number(rows[0].count) : 1;

    res.json({
      success: true,
      sliderStats: { average, myValue: Math.round(value), total }
    });
  } catch (error) {
    console.error('[story.controller] Error in voteSlider:', error);
    next(error);
  }
};


exports.getSliderStats = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const storyId = req.params.id;

    const [rows] = await pool.query(
      `SELECT AVG(value) as avg_val, COUNT(*) as count FROM story_slider_votes WHERE story_id = ?`,
      [storyId]
    );
    const average = rows[0]?.avg_val ? Math.round(Number(rows[0].avg_val)) : 50;
    const total = rows[0]?.count ? Number(rows[0].count) : 0;

    const [myRows] = await pool.query(
      `SELECT value FROM story_slider_votes WHERE story_id = ? AND user_id = ?`,
      [storyId, userId]
    );
    const myValue = myRows.length > 0 ? Math.round(Number(myRows[0].value)) : null;

    res.json({
      success: true,
      sliderStats: { average, myValue, total }
    });
  } catch (error) {
    console.error('[story.controller] Error in getSliderStats:', error);
    next(error);
  }
};

/* ==========================================================================
   STORY ARCHIVE & HIGHLIGHTS (PHASE 3)
   ========================================================================== */


exports.getStoryArchive = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;

    const [stories] = await pool.query(
      `SELECT id, user_id, media_url, media_type, text_content, privacy, views_count, reactions_count, created_at
       FROM stories
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: stories,
    });
  } catch (error) {
    console.error('[story.controller] Error in getStoryArchive:', error);
    next(error);
  }
};


exports.getHighlights = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const targetUserId = req.query.userId ? Number(req.query.userId) : req.user.id;

    const [highlights] = await pool.query(
      `SELECT sh.id, sh.user_id, sh.title, sh.cover_url, sh.created_at, sh.updated_at,
              COUNT(shi.id) as story_count
       FROM story_highlights sh
       LEFT JOIN story_highlight_items shi ON sh.id = shi.highlight_id
       WHERE sh.user_id = ?
       GROUP BY sh.id
       ORDER BY sh.updated_at DESC`,
      [targetUserId]
    );

    res.json({
      success: true,
      data: highlights,
    });
  } catch (error) {
    console.error('[story.controller] Error in getHighlights:', error);
    next(error);
  }
};


exports.createHighlight = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const userId = req.user.id;
    const { title, coverUrl, storyIds = [] } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Tiêu đề không được để trống' });
    }
    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn ít nhất 1 story' });
    }

    const highlightId = crypto.randomUUID();
    let finalCover = coverUrl;
    if (!finalCover) {
      const [firstStory] = await pool.query('SELECT media_url FROM stories WHERE id = ?', [storyIds[0]]);
      finalCover = firstStory[0]?.media_url || null;
    }

    await pool.query(
      'INSERT INTO story_highlights (id, user_id, title, cover_url) VALUES (?, ?, ?, ?)',
      [highlightId, userId, title.trim(), finalCover]
    );

    for (let i = 0; i < storyIds.length; i++) {
      await pool.query(
        'INSERT INTO story_highlight_items (highlight_id, story_id, order_index) VALUES (?, ?, ?)',
        [highlightId, storyIds[i], i]
      );
    }

    res.json({
      success: true,
      data: {
        id: highlightId,
        user_id: userId,
        title: title.trim(),
        cover_url: finalCover,
        story_count: storyIds.length,
      },
    });
  } catch (error) {
    console.error('[story.controller] Error in createHighlight:', error);
    next(error);
  }
};


exports.getHighlightById = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const highlightId = req.params.id;
    const currentUserId = req.user.id;

    const [hlRows] = await pool.query(
      `SELECT sh.*, u.full_name, u.display_name, u.avatar_url
       FROM story_highlights sh
       JOIN users u ON sh.user_id = u.id
       WHERE sh.id = ?`,
      [highlightId]
    );

    if (hlRows.length === 0) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy tin nổi bật' });
    }
    const hl = hlRows[0];

    const [items] = await pool.query(
      `SELECT s.*,
              sr.reaction as my_reaction
       FROM story_highlight_items shi
       JOIN stories s ON shi.story_id = s.id
       LEFT JOIN story_reactions sr ON s.id = sr.story_id AND sr.user_id = ?
       WHERE shi.highlight_id = ?
       ORDER BY shi.order_index ASC`,
      [currentUserId, highlightId]
    );

    const userStoryGroup = {
      user_id: hl.user_id,
      full_name: hl.full_name,
      display_name: hl.title,
      avatar_url: hl.cover_url || hl.avatar_url,
      has_unread: false,
      has_close_friends_story: false,
      items: items.map(s => ({
        ...s,
        is_close_friend: s.privacy === 'close_friends',
      })),
    };

    res.json({
      success: true,
      data: {
        highlight: hl,
        storyGroup: userStoryGroup,
      },
    });
  } catch (error) {
    console.error('[story.controller] Error in getHighlightById:', error);
    next(error);
  }
};


exports.deleteHighlight = async (req, res, next) => {
  try {
    await ensureStorySchema();
    const highlightId = req.params.id;
    const userId = req.user.id;

    const [existing] = await pool.query(
      'SELECT id FROM story_highlights WHERE id = ? AND user_id = ?',
      [highlightId, userId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Tin nổi bật không tồn tại hoặc không có quyền xóa' });
    }

    await pool.query('DELETE FROM story_highlights WHERE id = ?', [highlightId]);

    res.json({
      success: true,
      message: 'Đã xóa tin nổi bật thành công',
    });
  } catch (error) {
    console.error('[story.controller] Error in deleteHighlight:', error);
    next(error);
  }
};

