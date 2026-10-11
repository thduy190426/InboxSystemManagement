const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { pool } = require('../src/config/db.js');

async function verifySchema() {
  const [storyCols] = await pool.query('SHOW COLUMNS FROM stories');
  const storyColNames = storyCols.map(c => c.Field);
  if (!storyColNames.includes('views_count') || !storyColNames.includes('reactions_count')) {
    throw new Error('Missing columns views_count or reactions_count in stories table');
  }

  const [viewTables] = await pool.query("SHOW TABLES LIKE 'story_views'");
  if (viewTables.length === 0) throw new Error('story_views table does not exist');

  const [reactTables] = await pool.query("SHOW TABLES LIKE 'story_reactions'");
  if (reactTables.length === 0) throw new Error('story_reactions table does not exist');

  const [friendTables] = await pool.query("SHOW TABLES LIKE 'story_close_friends'");
  if (friendTables.length === 0) throw new Error('story_close_friends table does not exist');

  console.log('PASS: All Story Phase 1 tables and columns verified successfully.');
  process.exit(0);
}

verifySchema().catch(err => {
  console.error('FAIL:', err);
  process.exit(1);
});
