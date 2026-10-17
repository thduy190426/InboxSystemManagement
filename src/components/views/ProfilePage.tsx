import { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  IdCard,
  Users,
  Heart,
  ArrowLeft,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAutoTour } from '../../hooks/tutorial/useAutoTour'
import type { AuthUser } from '../../services/api/authApi'
import type { ContactUser } from '../../types'
import {
  updateProfile,
  uploadAvatar,
  type ProfilePayload,
} from '../../services/api/userApi'
import {
  fetchFriends,
  sendFriendRequest,
  cancelFriendRequest,
  blockContact,
} from '../../services/api/contactApi'
import { ReportUserModal } from '../profile/ReportUserModal'
import { timelineApi } from '../../services/api/timelineApi'
import type {
  TimelinePost,
  PostPrivacy,
  PostReactionType,
  FollowStats,
} from '../../types/timeline'
import { AvatarCropper } from '../ui/AvatarCropper'
import { ProfileCover } from '../profile/ProfileCover'
import { ProfileHeader } from '../profile/ProfileHeader'
import { TimelineTab } from '../profile/TimelineTab'
import { AboutTab } from '../profile/AboutTab'
import { FriendsTab } from '../profile/FriendsTab'
import { FollowersTab } from '../profile/FollowersTab'
import {
  validateImageFile,
  PROFILE_LIMITS,
} from '../../utils/profileValidation'

export type ProfilePageProps = {
  currentUser: AuthUser | null
  targetUser?: ContactUser | AuthUser | null
  onUserChange: (user: AuthUser) => void
  pushToast: (text: string, tone?: 'info' | 'error') => void
  onBackToMyProfile?: () => void
  onSendMessage?: (user: ContactUser | AuthUser) => void
  onViewUserProfile?: (user: ContactUser) => void
}

type TabType = 'timeline' | 'about' | 'friends' | 'followers'

export function ProfilePage({
  currentUser,
  targetUser,
  onUserChange,
  pushToast,
  onBackToMyProfile,
  onSendMessage,
  onViewUserProfile,
}: ProfilePageProps) {
  useAutoTour('profile', true, currentUser?.id)
  const { t } = useTranslation('profile')

  const isOwnProfile =
    !targetUser || String(targetUser.id) === String(currentUser?.id)
  const displayUser = isOwnProfile ? currentUser : targetUser

  const [activeTab, setActiveTab] = useState<TabType>('timeline')
  const [isEditingAbout, setIsEditingAbout] = useState(false)

  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)

  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [isAvatarUploading, setIsAvatarUploading] = useState(false)

  const [posts, setPosts] = useState<TimelinePost[]>([])
  const [isPostsLoading, setIsPostsLoading] = useState(false)

  const [friends, setFriends] = useState<ContactUser[]>([])
  const [isFriendsLoading, setIsFriendsLoading] = useState(false)
  const [followers, setFollowers] = useState<ContactUser[]>([])
  const [following, setFollowing] = useState<ContactUser[]>([])
  const [isFollowersLoading, setIsFollowersLoading] = useState(false)

  const [followStats, setFollowStats] = useState<FollowStats>({
    followersCount: 0,
    followingCount: 0,
    isFollowing: false,
  })
  const [isFollowLoading, setIsFollowLoading] = useState(false)
  const [friendshipStatus, setFriendshipStatus] = useState<string>(
    targetUser && 'friendshipStatus' in targetUser ? targetUser.friendshipStatus : 'none',
  )
  const [isFriendLoading, setIsFriendLoading] = useState(false)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isReportModalOpen, setIsReportModalOpen] = useState(false)

  const loadProfileData = useCallback(async () => {
    if (!displayUser) return

    try {
      const cover = await timelineApi.getCoverPhoto(displayUser.id)
      setCoverUrl(cover)
    } catch {
      
    }

    if (currentUser) {
      try {
        const stats = await timelineApi.fetchFollowStats(displayUser.id, currentUser.id)
        setFollowStats(stats)
      } catch {
      }
    }
  }, [displayUser, currentUser])

  useEffect(() => {
    loadProfileData()
  }, [loadProfileData])

  const loadPosts = useCallback(async () => {
    if (!displayUser) return
    try {
      setIsPostsLoading(true)
      const fetched = await timelineApi.fetchUserPosts(displayUser.id)
      setPosts(fetched)
    } catch (err) {
      console.error(err)
    } finally {
      setIsPostsLoading(false)
    }
  }, [displayUser])

  useEffect(() => {
    loadPosts()
  }, [loadPosts])

  const loadFriends = useCallback(async () => {
    try {
      setIsFriendsLoading(true)
      const list = await fetchFriends()
      setFriends(list)
    } catch (err) {
      console.error(err)
    } finally {
      setIsFriendsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadFriends()
  }, [loadFriends])

  const loadFollowersAndFollowing = useCallback(async () => {
    if (!displayUser) return
    try {
      setIsFollowersLoading(true)
      const [fList, fgList] = await Promise.all([
        timelineApi.fetchFollowersList(displayUser.id),
        timelineApi.fetchFollowingList(displayUser.id),
      ])
      setFollowers(fList)
      setFollowing(fgList)
    } catch (err) {
      console.error(err)
    } finally {
      setIsFollowersLoading(false)
    }
  }, [displayUser])

  useEffect(() => {
    loadFollowersAndFollowing()
  }, [loadFollowersAndFollowing])

  async function handleCoverChange(file: File) {
    if (!currentUser) return

    const validation = validateImageFile(
      file,
      {
        maxSizeBytes: PROFILE_LIMITS.MAX_COVER_SIZE,
        label: t('coverPhotoLabel', { defaultValue: 'ảnh bìa' }),
      },
      t,
    )
    if (!validation.isValid) {
      pushToast(
        validation.error || t('errors.invalidImage', { defaultValue: 'Ảnh không hợp lệ!' }),
        'error',
      )
      return
    }

    try {
      setIsUploadingCover(true)
      const newUrl = await timelineApi.uploadCoverPhoto(file, currentUser.id)
      setCoverUrl(newUrl)
      pushToast(t('coverUpdated'), 'info')
    } catch (err) {
      pushToast(
        err instanceof Error
          ? err.message
          : t('coverUpdateFailed'),
        'error',
      )
    } finally {
      setIsUploadingCover(false)
    }
  }

  function handleAvatarSelect(file: File) {
    const validation = validateImageFile(
      file,
      {
        maxSizeBytes: PROFILE_LIMITS.MAX_AVATAR_SIZE,
        label: t('avatarPhotoLabel'),
      },
      t,
    )
    if (!validation.isValid) {
      pushToast(
        validation.error || t('errors.invalidImage'),
        'error',
      )
      return
    }

    if (file.type === 'image/gif') {
      setIsAvatarUploading(true)
      uploadAvatar(file)
        .then((res) => {
          onUserChange(res.user)
          pushToast(t('avatarUpdated'), 'info')
        })
        .catch((err) => {
          pushToast(err instanceof Error ? err.message : t('avatarUpdateFailed'), 'error')
        })
        .finally(() => setIsAvatarUploading(false))
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setCropImageSrc(reader.result?.toString() || null)
    }
    reader.readAsDataURL(file)
  }

  async function handleCroppedAvatar(croppedBlob: Blob) {
    setCropImageSrc(null)
    const file = new File([croppedBlob], 'avatar.jpg', { type: 'image/jpeg' })
    try {
      setIsAvatarUploading(true)
      const response = await uploadAvatar(file)
      onUserChange(response.user)
      pushToast(t('avatarUpdated'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('avatarUpdateFailed'), 'error')
    } finally {
      setIsAvatarUploading(false)
    }
  }

  async function handleCreatePost(payload: {
    content: string
    mediaUrls: string[]
    privacy: PostPrivacy
  }) {
    if (!currentUser) return
    try {
      const newPost = await timelineApi.createPost(currentUser, payload)
      setPosts((prev) => [newPost, ...prev])
      pushToast(t('postCreated'), 'info')
    } catch (err) {
      pushToast(
        err instanceof Error
          ? err.message
          : t('postCreateFailed'),
        'error',
      )
    }
  }

  async function handleDeletePost(postId: string) {
    if (!currentUser) return
    try {
      await timelineApi.deletePost(postId, currentUser.id)
      setPosts((prev) => prev.filter((p) => p.id !== postId))
      pushToast(t('postDeleted'), 'info')
    } catch (err) {
      console.error(err)
    }
  }

  async function handleUpdatePost(
    postId: string,
    updates: { content: string; privacy: PostPrivacy; mediaUrls: string[] },
  ) {
    if (!currentUser) return
    try {
      const updatedPost = await timelineApi.updatePost(postId, currentUser.id, updates)
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)))
      pushToast(t('postUpdated', { defaultValue: 'Đã cập nhật bài viết!' }), 'info')
    } catch (err) {
      pushToast(
        err instanceof Error
          ? err.message
          : t('postUpdateFailed', { defaultValue: 'Không thể cập nhật bài viết!' }),
        'error',
      )
      throw err
    }
  }

  async function handleToggleReaction(postId: string, type: PostReactionType) {
    if (!currentUser) return
    try {
      const updatedPost = await timelineApi.toggleReaction(postId, currentUser, type)
      setPosts((prev) => prev.map((p) => (p.id === postId ? updatedPost : p)))
    } catch (err) {
      console.error(err)
    }
  }

  async function handleAddComment(postId: string, content: string) {
    if (!currentUser) return
    try {
      const newComment = await timelineApi.addComment(postId, currentUser, content)
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p,
        ),
      )
    } catch (err) {
      console.error(err)
    }
  }

  async function handleToggleFollow() {
    if (!currentUser || !displayUser) return
    try {
      setIsFollowLoading(true)
      const res = await timelineApi.toggleFollowUser(displayUser.id, currentUser.id)
      setFollowStats(res.stats)
      if (res.isFollowing) {
        pushToast(
          t('followedSuccess', {
            name: displayUser.fullName,
            defaultValue: `Đã theo dõi ${displayUser.fullName}!`,
          }),
          'info',
        )
      } else {
        pushToast(
          t('unfollowedSuccess', {
            name: displayUser.fullName,
            defaultValue: `Đã bỏ theo dõi ${displayUser.fullName}!`,
          }),
          'info',
        )
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsFollowLoading(false)
    }
  }

  async function handleFriendAction() {
    if (!displayUser) return
    try {
      setIsFriendLoading(true)
      if (friendshipStatus === 'none') {
        await sendFriendRequest(displayUser.id)
        setFriendshipStatus('pending')
        pushToast(t('friendRequestSent'), 'info')
      } else if (friendshipStatus === 'pending') {
        await cancelFriendRequest(displayUser.id)
        setFriendshipStatus('none')
        pushToast(t('friendRequestCancelled'), 'info')
      }
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('friendActionError'), 'error')
    } finally {
      setIsFriendLoading(false)
    }
  }

  function handleCopyProfileLink() {
    if (!displayUser) return
    const link = `${window.location.origin}?profile=${displayUser.id}`
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(link)
        .then(() => {
          pushToast(t('copyLinkSuccess', { defaultValue: 'Đã sao chép liên kết trang cá nhân!' }), 'info')
        })
        .catch(() => {
          pushToast(t('copyLinkFailed', { defaultValue: 'Không thể sao chép liên kết!' }), 'error')
        })
    } else {
      pushToast(t('copyLinkSuccess', { defaultValue: 'Đã sao chép liên kết trang cá nhân!' }), 'info')
    }
  }

  async function handleBlockUser() {
    if (!targetUser || !currentUser) return
    const confirmMsg = t('blockConfirm', {
      defaultValue:
        'Bạn có chắc chắn muốn chặn người dùng này không? Họ sẽ không thể gửi tin nhắn hoặc xem bài viết của bạn.',
    })
    if (!window.confirm(confirmMsg)) return

    try {
      await blockContact(String(targetUser.id))
      setFriendshipStatus('blocked')
      pushToast(t('blockSuccess', { defaultValue: 'Đã chặn người dùng thành công.' }), 'info')
    } catch (err) {
      pushToast(
        err instanceof Error
          ? err.message
          : t('blockFailed', { defaultValue: 'Không thể chặn người dùng!' }),
        'error',
      )
    }
  }

  function handleReportSubmit(reason: string, notes: string) {
    console.info(`[ReportUser] target=${targetUser?.id}, reason=${reason}, notes=${notes}`)
    pushToast(
      t('reportSuccess', {
        defaultValue: 'Cảm ơn bạn, báo cáo đã được gửi tới đội ngũ quản trị viên.',
      }),
      'info',
    )
  }

  async function handleSaveProfile(payload: ProfilePayload) {
    try {
      setIsSavingProfile(true)
      const res = await updateProfile(payload)
      onUserChange(res.user)
      pushToast(t('profileSaved'), 'info')
    } catch (err) {
      pushToast(err instanceof Error ? err.message : t('profileSaveFailed'), 'error')
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (!displayUser) {
    return (
      <div className="public-profile-viewport">
        <div className="public-profile-shell" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <p>{t('loading', { defaultValue: 'Đang tải thông tin hồ sơ...' })}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="public-profile-viewport">
      <section className="public-profile-shell" aria-labelledby="profile-heading">
      {!isOwnProfile && onBackToMyProfile && (
        <div style={{ marginBottom: '14px' }}>
          <button
            className="profile-btn profile-btn--secondary"
            onClick={onBackToMyProfile}
            type="button"
          >
            <ArrowLeft size={15} />
            <span>{t('backToMyProfile', { defaultValue: 'Quay lại trang cá nhân của tôi' })}</span>
          </button>
        </div>
      )}

      <ProfileCover
        coverUrl={coverUrl}
        isOwnProfile={isOwnProfile}
        isUploading={isUploadingCover}
        onCoverChange={handleCoverChange}
      />

      <ProfileHeader
        friendshipStatus={friendshipStatus}
        isAvatarUploading={isAvatarUploading}
        isFollowLoading={isFollowLoading}
        isFollowing={followStats.isFollowing}
        isFriendLoading={isFriendLoading}
        isOwnProfile={isOwnProfile}
        onAvatarChange={handleAvatarSelect}
        onBlockUser={handleBlockUser}
        onCopyProfileLink={handleCopyProfileLink}
        onEditProfile={() => {
          setActiveTab('about')
          setIsEditingAbout(true)
        }}
        onFollowToggle={handleToggleFollow}
        onFriendAction={handleFriendAction}
        onReportUser={() => setIsReportModalOpen(true)}
        onSendMessage={() => onSendMessage?.(displayUser)}
        onStatClick={(tab) => setActiveTab(tab as TabType)}
        stats={{
          postsCount: posts.length,
          friendsCount: friends.length,
          followersCount: followStats.followersCount,
          followingCount: followStats.followingCount,
        }}
        user={displayUser}
      />

      <nav className="profile-nav-tabs" aria-label="Profile tabs">
        <button
          className={`profile-nav-tab${activeTab === 'timeline' ? ' profile-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('timeline')}
          type="button"
        >
          <FileText size={16} />
          <span>{t('tabTimeline', { defaultValue: 'Dòng thời gian' })}</span>
          <span className="profile-nav-tab-badge">{posts.length}</span>
        </button>

        <button
          className={`profile-nav-tab${activeTab === 'about' ? ' profile-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('about')}
          type="button"
        >
          <IdCard size={16} />
          <span>{t('tabAbout', { defaultValue: 'Giới thiệu' })}</span>
        </button>

        <button
          className={`profile-nav-tab${activeTab === 'friends' ? ' profile-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('friends')}
          type="button"
        >
          <Users size={16} />
          <span>{t('tabFriends', { defaultValue: 'Bạn bè' })}</span>
          <span className="profile-nav-tab-badge">{friends.length}</span>
        </button>

        <button
          className={`profile-nav-tab${activeTab === 'followers' ? ' profile-nav-tab--active' : ''}`}
          onClick={() => setActiveTab('followers')}
          type="button"
        >
          <Heart size={16} />
          <span>{t('tabFollowers', { defaultValue: 'Người theo dõi' })}</span>
          <span className="profile-nav-tab-badge">{followStats.followersCount}</span>
        </button>
      </nav>

      {activeTab === 'timeline' && (
        <TimelineTab
          currentUser={currentUser}
          isLoading={isPostsLoading}
          isOwnProfile={isOwnProfile}
          onAddComment={handleAddComment}
          onCreatePost={handleCreatePost}
          onDeletePost={handleDeletePost}
          onToggleReaction={handleToggleReaction}
          onUpdatePost={handleUpdatePost}
          posts={posts}
        />
      )}

      {activeTab === 'about' && (
        <AboutTab
          isEditing={isEditingAbout}
          isOwnProfile={isOwnProfile}
          isSaving={isSavingProfile}
          onSaveProfile={handleSaveProfile}
          onToggleEdit={setIsEditingAbout}
          user={displayUser}
        />
      )}

      {activeTab === 'friends' && (
        <FriendsTab
          friends={friends}
          isLoading={isFriendsLoading}
          onSendMessage={onSendMessage}
          onViewFriendProfile={onViewUserProfile}
        />
      )}

      {activeTab === 'followers' && (
        <FollowersTab
          followers={followers}
          following={following}
          isLoading={isFollowersLoading}
          onToggleFollow={async (user) => {
            if (!currentUser) return
            await timelineApi.toggleFollowUser(user.id, currentUser.id)
            loadFollowersAndFollowing()
          }}
          onViewUserProfile={onViewUserProfile}
        />
      )}

      {cropImageSrc && (
        <AvatarCropper
          imageSrc={cropImageSrc}
          onCancel={() => setCropImageSrc(null)}
          onCropped={handleCroppedAvatar}
        />
      )}

      {targetUser && (
        <ReportUserModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          onSubmit={handleReportSubmit}
          targetUser={targetUser}
        />
      )}
    </section>
  </div>
  )
}