export type PostPrivacy = 'public' | 'friends' | 'only_me'

export type PostReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry'

export type PostReaction = {
  userId: string
  userName: string
  type: PostReactionType
  createdAt: string
}

export type PostComment = {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar?: string | null
  userHandle?: string | null
  content: string
  createdAt: string
}

export type TimelinePost = {
  id: string
  userId: string
  authorName: string
  authorAvatar?: string | null
  authorHandle?: string | null
  authorRole?: string | null
  content: string
  mediaUrls: string[]
  privacy: PostPrivacy
  reactions: PostReaction[]
  comments: PostComment[]
  createdAt: string
  updatedAt?: string
}

export type FollowStats = {
  followersCount: number
  followingCount: number
  isFollowing: boolean
}

export type CreatePostPayload = {
  content: string
  mediaUrls?: string[]
  privacy?: PostPrivacy
}
