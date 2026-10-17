import type { AuthUser } from './authApi'
import type { ContactUser } from '../../types'
import type {
  TimelinePost,
  PostComment,
  PostReactionType,
  FollowStats,
  CreatePostPayload,
  PostPrivacy,
} from '../../types/timeline'

const POSTS_STORAGE_KEY = 'inbox_timeline_posts'
const COVERS_STORAGE_KEY = 'inbox_profile_covers'
const FOLLOWS_STORAGE_KEY = 'inbox_profile_follows'

function loadPostsFromStorage(): TimelinePost[] {
  try {
    const raw = localStorage.getItem(POSTS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as TimelinePost[]
    const cleaned = parsed.filter((p) => !p.id.startsWith('post-seed-'))
    if (cleaned.length !== parsed.length) {
      savePostsToStorage(cleaned)
    }
    return cleaned
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

function loadFollowsFromStorage(): Set<string> {
  try {
    const raw = localStorage.getItem(FOLLOWS_STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = (JSON.parse(raw) as string[]).filter((pair) => !pair.startsWith('seed-'))
    return new Set(parsed)
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
  async fetchUserPosts(userId: string): Promise<TimelinePost[]> {
    const allPosts = loadPostsFromStorage()
    const userPosts = allPosts.filter((p) => String(p.userId) === String(userId))
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

  async updatePost(
    postId: string,
    userId: string,
    updates: { content?: string; privacy?: PostPrivacy; mediaUrls?: string[] },
  ): Promise<TimelinePost> {
    const allPosts = loadPostsFromStorage()
    const targetPost = allPosts.find((p) => p.id === postId && String(p.userId) === String(userId))
    if (!targetPost) {
      throw new Error('Bài viết không tồn tại hoặc bạn không có quyền chỉnh sửa')
    }

    if (updates.content !== undefined) {
      targetPost.content = updates.content
    }
    if (updates.privacy !== undefined) {
      targetPost.privacy = updates.privacy
    }
    if (updates.mediaUrls !== undefined) {
      targetPost.mediaUrls = updates.mediaUrls
    }
    targetPost.updatedAt = new Date().toISOString()

    savePostsToStorage(allPosts)
    return { ...targetPost }
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
        targetPost.reactions.splice(existingIdx, 1)
      } else {
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
      followersCount,
      followingCount,
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
    return []
  },

  async fetchFollowingList(_userId: string): Promise<ContactUser[]> {
    return []
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
