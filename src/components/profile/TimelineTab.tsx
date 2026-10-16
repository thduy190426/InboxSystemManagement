import type { ChangeEvent, FormEvent } from 'react'
import { useState, useRef } from 'react'
import {
  Image as ImageIcon,
  Globe,
  Users,
  Lock,
  Send,
  Trash2,
  Heart,
  MessageCircle,
  X,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { AvatarFallback } from '../ui/AvatarFallback'
import type { AuthUser } from '../../services/api/authApi'
import type {
  TimelinePost,
  PostPrivacy,
  PostReactionType,
} from '../../types/timeline'
import {
  validateImageFile,
  validatePostContent,
  validateCommentContent,
  PROFILE_LIMITS,
} from '../../utils/profileValidation'

type TimelineTabProps = {
  posts: TimelinePost[]
  currentUser: AuthUser | null
  isOwnProfile: boolean
  isLoading?: boolean
  onCreatePost: (payload: {
    content: string
    mediaUrls: string[]
    privacy: PostPrivacy
  }) => Promise<void>
  onDeletePost: (postId: string) => Promise<void>
  onToggleReaction: (postId: string, type: PostReactionType) => Promise<void>
  onAddComment: (postId: string, content: string) => Promise<void>
}

export function TimelineTab({
  posts,
  currentUser,
  isOwnProfile,
  isLoading = false,
  onCreatePost,
  onDeletePost,
  onToggleReaction,
  onAddComment,
}: TimelineTabProps) {
  const { t } = useTranslation('profile')

  const [content, setContent] = useState('')
  const [mediaUrls, setMediaUrls] = useState<string[]>([])
  const [privacy, setPrivacy] = useState<PostPrivacy>('public')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [submittingCommentPostId, setSubmittingCommentPostId] = useState<string | null>(null)

  function handleImageSelect(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    if (!files || files.length === 0) return

    setComposerError(null)
    const incomingFiles = Array.from(files)

    if (mediaUrls.length + incomingFiles.length > PROFILE_LIMITS.POST_MAX_MEDIA) {
      setComposerError(
        t('errors.postMediaTooMany', {
          defaultValue: `Mỗi bài viết chỉ được đính kèm tối đa ${PROFILE_LIMITS.POST_MAX_MEDIA} hình ảnh!`,
        }),
      )
      event.target.value = ''
      return
    }

    for (const file of incomingFiles) {
      const validation = validateImageFile(
        file,
        {
          maxSizeBytes: PROFILE_LIMITS.MAX_MEDIA_FILE_SIZE,
          label: t('postMediaPhotoLabel', { defaultValue: 'ảnh đính kèm' }),
        },
        t,
      )
      if (!validation.isValid) {
        setComposerError(
          validation.error || t('errors.invalidImage', { defaultValue: 'Ảnh không hợp lệ!' }),
        )
        event.target.value = ''
        return
      }
    }

    incomingFiles.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        const url = reader.result as string
        setMediaUrls((prev) => [...prev, url])
      }
      reader.readAsDataURL(file)
    })
    event.target.value = ''
  }

  function handleRemoveMedia(index: number) {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index))
    setComposerError(null)
  }

  async function handleComposerSubmit(event: FormEvent) {
    event.preventDefault()
    setComposerError(null)

    const validation = validatePostContent(content, mediaUrls.length, t)
    if (!validation.isValid) {
      setComposerError(
        validation.error || t('errors.postInvalid', { defaultValue: 'Bài viết không hợp lệ!' }),
      )
      return
    }

    try {
      setIsSubmitting(true)
      await onCreatePost({
        content: content.trim(),
        mediaUrls,
        privacy,
      })
      setContent('')
      setMediaUrls([])
    } finally {
      setIsSubmitting(false)
    }
  }

  function toggleComments(postId: string) {
    setExpandedComments((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }))
  }

  async function handleSendComment(postId: string) {
    const text = commentInputs[postId]?.trim()
    const validation = validateCommentContent(text || '', t)
    if (!validation.isValid) {
      return
    }

    try {
      setSubmittingCommentPostId(postId)
      await onAddComment(postId, text)
      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
      setExpandedComments((prev) => ({ ...prev, [postId]: true }))
    } finally {
      setSubmittingCommentPostId(null)
    }
  }

  function formatRelativeTime(dateStr: string) {
    const time = new Date(dateStr).getTime()
    const diff = Math.max(0, Date.now() - time)
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return t('justNow', { defaultValue: 'Vừa xong' })
    if (minutes < 60) return `${minutes} ${t('minutesAgo', { defaultValue: 'phút trước' })}`
    if (hours < 24) return `${hours} ${t('hoursAgo', { defaultValue: 'giờ trước' })}`
    return `${days} ${t('daysAgo', { defaultValue: 'ngày trước' })}`
  }

  const renderPrivacyIcon = (p: PostPrivacy) => {
    switch (p) {
      case 'friends':
        return (
          <span title={t('privacyFriends', { defaultValue: 'Bạn bè' })}>
            <Users size={13} />
          </span>
        )
      case 'only_me':
        return (
          <span title={t('privacyOnlyMe', { defaultValue: 'Chỉ mình tôi' })}>
            <Lock size={13} />
          </span>
        )
      default:
        return (
          <span title={t('privacyPublic', { defaultValue: 'Công khai' })}>
            <Globe size={13} />
          </span>
        )
    }
  }

  return (
    <div className="profile-tab-content">
      {isOwnProfile && currentUser && (
        <form className="timeline-composer-card" onSubmit={handleComposerSubmit}>
          <div className="composer-input-row">
            <AvatarFallback
              className="composer-avatar"
              name={currentUser.displayName || currentUser.fullName}
              src={currentUser.avatarUrl}
            />
            <textarea
              className="composer-textarea"
              maxLength={PROFILE_LIMITS.POST_CONTENT_MAX}
              onChange={(e) => {
                setContent(e.target.value)
                if (composerError) setComposerError(null)
              }}
              placeholder={t('composerPlaceholder', { defaultValue: 'Bạn đang nghĩ gì thế?' })}
              rows={3}
              value={content}
            />
          </div>

          {composerError && (
            <div className="pp-field-error" style={{ padding: '4px 16px', color: '#ef4444' }}>
              {composerError}
            </div>
          )}

          {mediaUrls.length > 0 && (
            <div className="composer-media-previews">
              {mediaUrls.map((url, idx) => (
                <div className="composer-media-item" key={idx}>
                  <img alt="" src={url} />
                  <button
                    className="composer-media-remove"
                    onClick={() => handleRemoveMedia(idx)}
                    type="button"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="composer-toolbar">
            <div className="composer-actions-left">
              <input
                accept="image/*"
                className="sr-only"
                multiple
                onChange={handleImageSelect}
                ref={imageInputRef}
                style={{ display: 'none' }}
                type="file"
              />
              <button
                className="composer-btn-icon"
                onClick={() => imageInputRef.current?.click()}
                type="button"
              >
                <ImageIcon size={16} />
                <span>
                  {t('addPhotos', { defaultValue: 'Thêm hình ảnh' })} ({mediaUrls.length}/{PROFILE_LIMITS.POST_MAX_MEDIA})
                </span>
              </button>

              <select
                className="composer-privacy-select"
                onChange={(e) => setPrivacy(e.target.value as PostPrivacy)}
                value={privacy}
              >
                <option value="public">{t('privacyPublic', { defaultValue: 'Công khai' })}</option>
                <option value="friends">{t('privacyFriends', { defaultValue: 'Bạn bè' })}</option>
                <option value="only_me">{t('privacyOnlyMe', { defaultValue: 'Chỉ mình tôi' })}</option>
              </select>
            </div>

            <button
              className="profile-btn profile-btn--primary"
              disabled={isSubmitting || (!content.trim() && mediaUrls.length === 0)}
              type="submit"
            >
              {isSubmitting ? (
                <span>{t('postingBtn', { defaultValue: 'Đang đăng...' })}</span>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>{t('postBtn', { defaultValue: 'Đăng bài' })}</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className="timeline-posts-feed">
        {isLoading && posts.length === 0 ? (
          <div className="empty-tab-state">
            <p>{t('loadingPosts', { defaultValue: 'Đang tải bài viết trên dòng thời gian...' })}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-tab-state">
            <p>{t('noPostsYet', { defaultValue: 'Chưa có bài viết nào trên dòng thời gian.' })}</p>
          </div>
        ) : (
          posts.map((post) => {
            const isLiked = post.reactions.some(
              (r) => String(r.userId) === String(currentUser?.id),
            )
            const isAuthor =
              isOwnProfile || String(post.userId) === String(currentUser?.id)
            const isCommentsOpen = expandedComments[post.id] ?? false

            return (
              <article className="timeline-post-card" key={post.id}>
                <header className="post-header-row">
                  <div className="post-author-info">
                    <AvatarFallback
                      className="post-author-avatar"
                      name={post.authorName}
                      src={post.authorAvatar}
                    />
                    <div>
                      <div className="post-author-name">{post.authorName}</div>
                      <div className="post-meta-row">
                        <span>{formatRelativeTime(post.createdAt)}</span>
                        <span>•</span>
                        {renderPrivacyIcon(post.privacy)}
                      </div>
                    </div>
                  </div>

                  {isAuthor && (
                    <button
                      className="profile-btn profile-btn--ghost"
                      onClick={() => {
                        const confirmMsg = t('deletePostConfirm', {
                          defaultValue: 'Bạn có chắc chắn muốn xóa bài viết này không?',
                        })
                        if (window.confirm(confirmMsg)) {
                          onDeletePost(post.id)
                        }
                      }}
                      style={{ padding: '6px' }}
                      title={t('deletePost', { defaultValue: 'Xóa bài viết' })}
                      type="button"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </header>

                {post.content && (
                  <div className="post-content-text">{post.content}</div>
                )}

                {post.mediaUrls.length > 0 && (
                  <div className="post-media-grid">
                    {post.mediaUrls.map((imgUrl, i) => (
                      <img alt="" key={i} src={imgUrl} />
                    ))}
                  </div>
                )}

                <div className="post-actions-bar">
                  <button
                    className={`post-action-btn${isLiked ? ' post-action-btn--liked' : ''}`}
                    onClick={() => onToggleReaction(post.id, 'like')}
                    type="button"
                  >
                    <Heart fill={isLiked ? '#ef4444' : 'none'} size={17} />
                    <span>
                      {t('likeBtn', { defaultValue: 'Thích' })}{' '}
                      {post.reactions.length > 0 && `(${post.reactions.length})`}
                    </span>
                  </button>

                  <button
                    className="post-action-btn"
                    onClick={() => toggleComments(post.id)}
                    type="button"
                  >
                    <MessageCircle size={17} />
                    <span>
                      {t('commentBtn', { defaultValue: 'Bình luận' })}{' '}
                      {post.comments.length > 0 && `(${post.comments.length})`}
                    </span>
                  </button>
                </div>

                {isCommentsOpen && (
                  <div className="post-comments-container">
                    {post.comments.map((comment) => (
                      <div className="comment-item-row" key={comment.id}>
                        <AvatarFallback
                          className="comment-avatar"
                          name={comment.userName}
                          src={comment.userAvatar}
                        />
                        <div className="comment-bubble">
                          <div className="comment-author-name">{comment.userName}</div>
                          <div className="comment-content-text">{comment.content}</div>
                        </div>
                      </div>
                    ))}

                    {currentUser && (
                      <div className="comment-input-row">
                        <input
                          className="comment-input-field"
                          disabled={submittingCommentPostId === post.id}
                          maxLength={PROFILE_LIMITS.COMMENT_CONTENT_MAX}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleSendComment(post.id)
                            }
                          }}
                          placeholder={t('writeComment', {
                            defaultValue: 'Viết bình luận công khai...',
                          })}
                          type="text"
                          value={commentInputs[post.id] || ''}
                        />
                        <button
                          className="comment-send-btn"
                          disabled={
                            submittingCommentPostId === post.id ||
                            !commentInputs[post.id]?.trim()
                          }
                          onClick={() => handleSendComment(post.id)}
                          type="button"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
