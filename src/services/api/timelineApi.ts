import type { AuthUser } from './authApi'
import type { ContactUser } from '../../types'
import type {
  TimelinePost,
  PostComment,
  PostReactionType,
  FollowStats,
  CreatePostPayload,
} from '../../types/timeline'

const POSTS_STORAGE_KEY = 'inbox_timeline_posts'
const COVERS_STORAGE_KEY = 'inbox_profile_covers'
const FOLLOWS_STORAGE_KEY = 'inbox_profile_follows'

// Default seed posts when starting fresh
function getDefaultSeedPosts(userId: string, userName: string, userAvatar?: string | null): TimelinePost[] {
  const now = Date.now()
  return [
    {
      id: `post-seed-1-${userId}`,
      userId,
      authorName: userName,
      authorAvatar: userAvatar,
      content: 'Chào mừng bạn đến với trang cá nhân của tôi! 👋 Hãy kết nối và cùng trò chuyện nhé.',
      mediaUrls: [],
      privacy: 'public',
      reactions: [
        {
          userId: 'seed-user-2',
          userName: 'Trần Minh Anh',
          type: 'love',
          createdAt: new Date(now - 3600000).toISOString(),
        },
      ],
      comments: [
        {
          id: `comment-seed-1`,
          postId: `post-seed-1-${userId}`,
          userId: 'seed-user-2',
          userName: 'Trần Minh Anh',
          userAvatar: null,
          content: 'Chúc bạn một ngày làm việc hiệu quả và tràn đầy năng lượng! ✨',
          createdAt: new Date(now - 1800000).toISOString(),
        },
      ],
      createdAt: new Date(now - 7200000).toISOString(),
    },
    {
      id: `post-seed-2-${userId}`,
      userId,
      authorName: userName,
      authorAvatar: userAvatar,
      content: 'Vừa hoàn thành dự án nâng cấp hệ thống liên lạc bảo mật E2EE và tính năng gọi video chất lượng cao! 🚀',
      mediaUrls: [
        'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80',
      ],
      privacy: 'public',
      reactions: [
        {
          userId: 'seed-user-3',
          userName: 'Lê Hoàng Nam',
          type: 'like',
          createdAt: new Date(now - 86400000).toISOString(),
        },
        {
          userId: 'seed-user-4',
          userName: 'Nguyễn Thu Trang',
          type: 'love',
          createdAt: new Date(now - 80000000).toISOString(),
        },
      ],
      comments: [],
      createdAt: new Date(now - 90000000).toISOString(),
    },
  ]
}

function loadPostsFromStorage(): TimelinePost[] {
  try {
    const raw = localStorage.getItem(POSTS_STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw) as TimelinePost[]
  } catch {
    return []
  }
}

function savePostsToStorage(posts: TimelinePost[]) {
  try {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts))
  } catch (err) {
    console.warn('[timelineApi] Failed to save posts to localStorage:', err)
  }
}

function loadCoversFromStorage(): Record<string, string> {
  try {
    const raw = localStorage.getItem(COVERS_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Record<string, string>
  } catch {
    return {}
  }
}

function saveCoversToStorage(covers: Record<string, string>) {
  try {
    localStorage.setItem(COVERS_STORAGE_KEY, JSON.stringify(covers))
  } catch (err) {
    console.warn('[timelineApi] Failed to save covers to localStorage:', err)
  }
}

// Follow pairs: "followerId:followingId"
function loadFollowsFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(FOLLOWS_STORAGE_KEY)
    if (!raw) return new Set(['seed-follower-1:1', 'seed-follower-2:1'])
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveFollowsToStorage(follows: Set<string>) {
  try {
    localStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(Array.from(follows)))
  } catch (err) {
    console.warn('[timelineApi] Failed to save follows to localStorage:', err)
  }
}

export const timelineApi = {
  async fetchUserPosts(userId: string, userName = 'User', userAvatar?: string | null): Promise<TimelinePost[]> {
    let allPosts = loadPostsFromStorage()
    let userPosts = allPosts.filter((p) => String(p.userId) === String(userId))

    if (userPosts.length === 0) {
      // Seed default posts for this user
      const seedPosts = getDefaultSeedPosts(userId, userName, userAvatar)
      allPosts = [...seedPosts, ...allPosts]
      savePostsToStorage(allPosts)
      userPosts = seedPosts
    }

    return userPosts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  async createPost(user: AuthUser, payload: CreatePostPayload): Promise<TimelinePost> {
    const newPost: TimelinePost = {
      id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      userId: String(user.id),
      authorName: user.displayName || user.fullName,
      authorAvatar: user.avatarUrl,
      authorHandle: user.handle,
      authorRole: user.role,
      content: payload.content,
      mediaUrls: payload.mediaUrls || [],
      privacy: payload.privacy || 'public',
      reactions: [],
      comments: [],
      createdAt: new Date().toISOString(),
    }

    const allPosts = loadPostsFromStorage()
    allPosts.unshift(newPost)
    savePostsToStorage(allPosts)
    return newPost
  },

  async deletePost(postId: string, userId: string): Promise<boolean> {
    const allPosts = loadPostsFromStorage()
    const filtered = allPosts.filter((p) => p.id !== postId || String(p.userId) !== String(userId))
    savePostsToStorage(filtered)
    return true
  },

  async toggleReaction(
    postId: string,
    user: AuthUser,
    type: PostReactionType = 'like',
  ): Promise<TimelinePost> {
    const allPosts = loadPostsFromStorage()
    const targetPost = allPosts.find((p) => p.id === postId)
    if (!targetPost) {
      throw new Error('Bài viết không tồn tại')
    }

    const existingIdx = targetPost.reactions.findIndex((r) => String(r.userId) === String(user.id))
    if (existingIdx >= 0) {
      if (targetPost.reactions[existingIdx].type === type) {
        // Remove reaction
        targetPost.reactions.splice(existingIdx, 1)
      } else {
        // Change reaction type
        targetPost.reactions[existingIdx].type = type
      }
    } else {
      targetPost.reactions.push({
        userId: String(user.id),
        userName: user.displayName || user.fullName,
        type,
        createdAt: new Date().toISOString(),
      })
    }

    savePostsToStorage(allPosts)
    return { ...targetPost }
  },

  async addComment(postId: string, user: AuthUser, content: string): Promise<PostComment> {
    const allPosts = loadPostsFromStorage()
    const targetPost = allPosts.find((p) => p.id === postId)
    if (!targetPost) {
      throw new Error('Bài viết không tồn tại')
    }

    const newComment: PostComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      postId,
      userId: String(user.id),
      userName: user.displayName || user.fullName,
      userAvatar: user.avatarUrl,
      userHandle: user.handle,
      content: content.trim(),
      createdAt: new Date().toISOString(),
    }

    targetPost.comments.push(newComment)
    savePostsToStorage(allPosts)
    return newComment
  },

  async fetchFollowStats(targetUserId: string, currentUserId: string): Promise<FollowStats> {
    const follows = loadFollowsFromStorage()
    let followersCount = 0
    let followingCount = 0
    let isFollowing = false

    follows.forEach((pair) => {
      const [follower, following] = pair.split(':')
      if (following === String(targetUserId)) {
        followersCount++
      }
      if (follower === String(targetUserId)) {
        followingCount++
      }
      if (follower === String(currentUserId) && following === String(targetUserId)) {
        isFollowing = true
      }
    })

    return {
      followersCount: Math.max(followersCount, 12), // Baseline realistic number
      followingCount: Math.max(followingCount, 8),
      isFollowing,
    }
  },

  async toggleFollowUser(
    targetUserId: string,
    currentUserId: string,
  ): Promise<{ isFollowing: boolean; stats: FollowStats }> {
    const follows = loadFollowsFromStorage()
    const key = `${currentUserId}:${targetUserId}`
    let nextFollowing = false

    if (follows.has(key)) {
      follows.delete(key)
      nextFollowing = false
    } else {
      follows.add(key)
      nextFollowing = true
    }

    saveFollowsToStorage(follows)
    const stats = await timelineApi.fetchFollowStats(targetUserId, currentUserId)
    return { isFollowing: nextFollowing, stats }
  },

  async fetchFollowersList(_userId: string): Promise<ContactUser[]> {
    return [
      {
        id: 'follower-1',
        userId: 101,
        fullName: 'Nguyễn Văn Hùng',
        email: 'hung.nguyen@example.com',
        phone: '0901234567',
        bio: 'Yêu công nghệ và thiết kế giao diện ✨',
        statusMessage: 'Đang làm việc',
        presence: 'online',
        avatarUrl: null,
        handle: 'vanhung',
        friendshipStatus: 'accepted',
        requestDirection: null,
        contactId: 'contact-f-1',
      },
      {
        id: 'follower-2',
        userId: 102,
        fullName: 'Trần Thị Mai',
        email: 'mai.tran@example.com',
        phone: '0912345678',
        bio: 'Nhiếp ảnh gia & Content Creator',
        statusMessage: null,
        presence: 'away',
        avatarUrl: null,
        handle: 'maitran',
        friendshipStatus: 'none',
        requestDirection: null,
        contactId: null,
      },
      {
        id: 'follower-3',
        userId: 103,
        fullName: 'Lê Quốc Bảo',
        email: 'bao.le@example.com',
        phone: null,
        bio: 'Frontend enthusiast',
        statusMessage: null,
        presence: 'offline',
        avatarUrl: null,
        handle: 'quocbao',
        friendshipStatus: 'none',
        requestDirection: null,
        contactId: null,
      },
    ]
  },

  async fetchFollowingList(_userId: string): Promise<ContactUser[]> {
    return [
      {
        id: 'following-1',
        userId: 104,
        fullName: 'Phạm Thu Hương',
        email: 'huong.pham@example.com',
        phone: '0934567890',
        bio: 'UI/UX Designer',
        statusMessage: 'Đang họp team',
        presence: 'online',
        avatarUrl: null,
        handle: 'thuhuong',
        friendshipStatus: 'accepted',
        requestDirection: null,
        contactId: 'contact-fl-1',
      },
      {
        id: 'following-2',
        userId: 105,
        fullName: 'Hoàng Minh Đức',
        email: 'duc.hoang@example.com',
        phone: null,
        bio: 'Fullstack Developer',
        statusMessage: null,
        presence: 'busy',
        avatarUrl: null,
        handle: 'minhduc',
        friendshipStatus: 'none',
        requestDirection: null,
        contactId: null,
      },
    ]
  },

  async uploadCoverPhoto(file: File, userId: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const covers = loadCoversFromStorage()
        covers[String(userId)] = dataUrl
        saveCoversToStorage(covers)
        resolve(dataUrl)
      }
      reader.onerror = (err) => reject(err)
      reader.readAsDataURL(file)
    })
  },

  async getCoverPhoto(userId: string): Promise<string | null> {
    const covers = loadCoversFromStorage()
    return covers[String(userId)] || null
  },
}
