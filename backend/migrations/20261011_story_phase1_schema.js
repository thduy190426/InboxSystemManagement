const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { pool } = require('../src/config/db.js');

async function runMigration() {
  console.log('[Migration] Starting Story Phase 1 schema migration...');
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Cập nhật bảng stories nếu thiếu các cột
    console.log('[Migration] Updating stories table...');
    const [cols] = await conn.query('SHOW COLUMNS FROM stories');
    const colNames = cols.map(c => c.Field);

    if (!colNames.includes('views_count')) {
      await conn.query('ALTER TABLE stories ADD COLUMN views_count INT UNSIGNED NOT NULL DEFAULT 0');
    }
    if (!colNames.includes('reactions_count')) {
      await conn.query('ALTER TABLE stories ADD COLUMN reactions_count INT UNSIGNED NOT NULL DEFAULT 0');
    }

    // Cập nhật enum privacy để hỗ trợ close_friends
    await conn.query(`
      ALTER TABLE stories 
      MODIFY COLUMN privacy ENUM('public', 'friends', 'close_friends', 'only_me') NOT NULL DEFAULT 'friends'
    `);

    // 2. Tạo bảng story_views
    console.log('[Migration] Creating story_views table...');
    await conn.query(`
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

    // 3. Tạo bảng story_reactions
    console.log('[Migration] Creating story_reactions table...');
    await conn.query(`
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

    // 4. Tạo bảng story_close_friends
    console.log('[Migration] Creating story_close_friends table...');
    await conn.query(`
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

    await conn.commit();
    console.log('[Migration] Story Phase 1 migration completed successfully!');
  } catch (error) {
    await conn.rollback();
    console.error('[Migration] Failed:', error);
    process.exit(1);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
