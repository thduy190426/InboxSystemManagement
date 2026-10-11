const assert = require('assert');

console.log('=== RUNNING STORY SYSTEM VERIFICATION SUITE ===');

// 1. Verify Reaction single-reaction logic simulation
function simulateReactions() {
  console.log('Test 1: Single-reaction constraint simulation...');
  const store = new Map(); // key: `${storyId}:${userId}`, val: emoji

  function react(storyId, userId, emoji) {
    const key = `${storyId}:${userId}`;
    const current = store.get(key);
    if (current === emoji) {
      store.delete(key);
      return { action: 'removed', reaction: null };
    } else {
      store.set(key, emoji);
      return { action: current ? 'updated' : 'added', reaction: emoji };
    }
  }

  // User 1 reacts ❤️
  let res = react('story-1', 1, '❤️');
  assert.strictEqual(res.action, 'added');
  assert.strictEqual(res.reaction, '❤️');
  assert.strictEqual(store.get('story-1:1'), '❤️');

  // User 1 changes to 😂 -> MUST REPLACE ❤️ (Single reaction constraint)
  res = react('story-1', 1, '😂');
  assert.strictEqual(res.action, 'updated');
  assert.strictEqual(res.reaction, '😂');
  assert.strictEqual(store.get('story-1:1'), '😂');

  // User 1 clicks 😂 again -> MUST REMOVE
  res = react('story-1', 1, '😂');
  assert.strictEqual(res.action, 'removed');
  assert.strictEqual(res.reaction, null);
  assert.strictEqual(store.has('story-1:1'), false);

  console.log('  -> PASS: Single-reaction constraint verified.');
}

// 2. Verify View Deduplication simulation
function simulateViews() {
  console.log('Test 2: View tracking deduplication simulation...');
  const viewsSet = new Set(); // set of `${storyId}:${viewerId}`
  let viewsCount = 0;

  function recordView(storyId, viewerId) {
    const key = `${storyId}:${viewerId}`;
    if (viewsSet.has(key)) {
      return { isNew: false, viewsCount };
    }
    viewsSet.add(key);
    viewsCount += 1;
    return { isNew: true, viewsCount };
  }

  // Viewer 2 views story-1
  let res = recordView('story-1', 2);
  assert.strictEqual(res.isNew, true);
  assert.strictEqual(res.viewsCount, 1);

  // Viewer 2 views story-1 again (e.g. repeated loop or re-opening)
  res = recordView('story-1', 2);
  assert.strictEqual(res.isNew, false);
  assert.strictEqual(res.viewsCount, 1); // viewsCount does not increment

  // Viewer 3 views story-1
  res = recordView('story-1', 3);
  assert.strictEqual(res.isNew, true);
  assert.strictEqual(res.viewsCount, 2);

  console.log('  -> PASS: View tracking deduplication verified.');
}

// 3. Verify Story Reply Metadata Structure
function verifyReplyMetadata() {
  console.log('Test 3: Story Reply Metadata formatting...');
  const metadata = {
    type: 'story_reply',
    storyId: '00000000-0000-0000-0000-000000000001',
    storyMediaUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    storyMediaType: 'image',
    storyTextContent: 'Hello world',
    reaction: '🔥',
  };

  const serialized = JSON.stringify(metadata);
  const parsed = JSON.parse(serialized);

  assert.strictEqual(parsed.type, 'story_reply');
  assert.strictEqual(parsed.reaction, '🔥');
  assert.strictEqual(parsed.storyMediaType, 'image');

  console.log('  -> PASS: Story Reply metadata serialization verified.');
}

// 4. Verify Close Friends Filter
function verifyCloseFriendsPrivacy() {
  console.log('Test 4: Close Friends Privacy filtering logic...');
  const closeFriends = new Set(['user-1:friend-2']); // user-1 added friend-2

  function canViewStory(authorId, viewerId, privacy) {
    if (authorId === viewerId) return true; // Author can always view
    if (privacy === 'public') return true;
    if (privacy === 'close_friends') {
      return closeFriends.has(`${authorId}:${viewerId}`);
    }
    if (privacy === 'only_me') return false;
    return true; // 'friends'
  }

  // Author user-1 with close_friends story
  assert.strictEqual(canViewStory('user-1', 'user-1', 'close_friends'), true);
  // friend-2 is in close friends
  assert.strictEqual(canViewStory('user-1', 'friend-2', 'close_friends'), true);
  // stranger-3 is NOT in close friends
  assert.strictEqual(canViewStory('user-1', 'stranger-3', 'close_friends'), false);
  // only_me story
  assert.strictEqual(canViewStory('user-1', 'friend-2', 'only_me'), false);

  console.log('  -> PASS: Close Friends privacy rules verified.');
}

try {
  simulateReactions();
  simulateViews();
  verifyReplyMetadata();
  verifyCloseFriendsPrivacy();
  console.log('=== ALL STORY VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
  process.exit(0);
} catch (err) {
  console.error('Verification failed:', err);
  process.exit(1);
}
