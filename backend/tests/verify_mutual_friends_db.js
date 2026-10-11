const assert = require('assert')
const { attachMutualFriendsSummary, getMutualFriendsList } = require('../src/utils/mutualFriends.util')

async function testEdgeCases() {
  console.log('Testing attachMutualFriendsSummary with empty array...')
  const emptyRes = await attachMutualFriendsSummary(1, [])
  assert.deepStrictEqual(emptyRes, [], 'Empty array should return empty array')

  console.log('Testing attachMutualFriendsSummary with null user...')
  const nullUserRes = await attachMutualFriendsSummary(null, [{ id: 2 }])
  assert.strictEqual(nullUserRes.length, 1)

  console.log('Testing attachMutualFriendsSummary with self target...')
  const selfRes = await attachMutualFriendsSummary(1, [{ id: 1 }])
  assert.strictEqual(selfRes[0].mutualCount, 0, 'Self target should have 0 mutual friends')

  console.log('Testing getMutualFriendsList with invalid IDs...')
  const invalidList1 = await getMutualFriendsList(null, 2)
  assert.deepStrictEqual(invalidList1, [])
  const invalidList2 = await getMutualFriendsList(1, 1)
  assert.deepStrictEqual(invalidList2, [])

  console.log('All basic DB utility unit edge case tests passed successfully!')
}

testEdgeCases().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
