const crypto = require('crypto');
const { pool } = require('../../config/db');
const { uploadBufferToCloudinary } = require('../../config/upload');
const { getIO } = require('../../realtime/socket');

exports.createStory = async (req, res, next) => {
  try {
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
      resource_type: resourceType,
    };
    const uploadResult = await uploadBufferToCloudinary(file, uploadOptions);

    const storyId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); 

    await pool.query(
      `INSERT INTO stories (id, user_id, media_url, media_type, text_content, privacy, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [storyId, userId, uploadResult.secure_url, media_type, text_content, privacy, expiresAt]
    );

    // Fetch user details for the response
    const [userRows] = await pool.query(
      'SELECT full_name, display_name, avatar_url FROM users WHERE id = ?',
      [userId]
    );
    const user = userRows[0];

    const newStory = {
      id: storyId,
      user_id: userId,
      user: {
        full_name: user.full_name,
        display_name: user.display_name,
        avatar_url: user.avatar_url,
      },
      media_url: uploadResult.secure_url,
      media_type,
      text_content,
      privacy,
      expires_at: expiresAt,
      created_at: new Date(),
    };

    // Emit event to connected users (friends)
    const io = getIO();
    io.emit('story:created', newStory);

    res.status(201).json({
      success: true,
      story: newStory,
    });
  } catch (error) {
    next(error);
  }
};

exports.getActiveStories = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Fetch stories that have not expired yet
    // For now, fetch my stories and public/friends stories
    const [stories] = await pool.query(
      `SELECT s.id, s.user_id, s.media_url, s.media_type, s.text_content, s.privacy, s.expires_at, s.created_at,
              u.full_name, u.display_name, u.avatar_url, u.public_id
       FROM stories s
       JOIN users u ON s.user_id = u.id
       WHERE s.expires_at > NOW()
       ORDER BY s.created_at DESC`
    );

    // Group by user for easier consumption by frontend
    const groupedStories = {};
    for (const story of stories) {
      if (!groupedStories[story.user_id]) {
        groupedStories[story.user_id] = {
          user_id: story.user_id,
          public_id: story.public_id,
          full_name: story.full_name,
          display_name: story.display_name,
          avatar_url: story.avatar_url,
          items: [],
        };
      }
      groupedStories[story.user_id].items.push({
        id: story.id,
        media_url: story.media_url,
        media_type: story.media_type,
        text_content: story.text_content,
        privacy: story.privacy,
        expires_at: story.expires_at,
        created_at: story.created_at,
      });
    }

    res.json({
      success: true,
      data: Object.values(groupedStories),
    });
  } catch (error) {
    next(error);
  }
};
