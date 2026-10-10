import type { AdminUserRole, AdminUserStatus, MessageReportStatus } from '../../../services/api/adminApi';

export const USER_ROLES: Array<AdminUserRole | 'all'> = ['all', 'user', 'agent', 'owner'];
export const USER_STATUSES: Array<AdminUserStatus | 'all'> = ['all', 'active', 'inactive', 'suspended'];
export const USER_GENDERS = ['all', 'male', 'female', 'other', 'prefer_not_to_say', 'unknown'] as const;
export type UserGenderFilter = typeof USER_GENDERS[number];

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

export function formatLastLogin(value: string | null, t: any) {
  if (!value) {
    return t('notLoggedIn')
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return t('unknownTime')
  }

  const hh = date.getHours().toString().padStart(2, '0')
  const mm = date.getMinutes().toString().padStart(2, '0')
  const ss = date.getSeconds().toString().padStart(2, '0')
  const dd = date.getDate().toString().padStart(2, '0')
  const MM = (date.getMonth() + 1).toString().padStart(2, '0')
  const yyyy = date.getFullYear()

  return `${hh}:${mm}:${ss} | ${dd}/${MM}/${yyyy}`
}

export function formatReportTime(value: string, t: any) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return t('unknownTime')
  }

  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export function getReportStatusLabel(status: MessageReportStatus, t: any) {
  if (status === 'reviewed') {
    return t('statusReviewed')
  }

  if (status === 'dismissed') {
    return t('statusDismissed')
  }

  return t('statusPending')
}

export function getStatusLabel(status: AdminUserStatus, t: any) {
  if (status === 'suspended') {
    return t('statusSuspended')
  }

  return t('statusNormal')
}

export function getGenderLabel(gender: string | null | undefined, t: any) {
  if (gender === 'male') return t('genderMale')
  if (gender === 'female') return t('genderFemale')
  if (gender === 'other') return t('genderOther')
  if (gender === 'prefer_not_to_say') return t('genderHidden')
  return t('genderUnknown')
}

export function getRoleLabel(role: AdminUserRole | 'all', t: any) {
  if (role === 'all') return t('filterAllRoles')
  return formatChartLabel(role, t)
}

export function getUserStatusFilterLabel(status: AdminUserStatus | 'all', t: any) {
  if (status === 'all') return t('filterAllAccounts')
  if (status === 'suspended') return t('filterLockedAccounts')
  if (status === 'inactive') return t('filterOfflineAccounts')
  return t('filterUnlockedAccounts')
}

export function getGenderFilterLabel(gender: UserGenderFilter, t: any) {
  if (gender === 'all') return t('filterAllGenders')
  if (gender === 'unknown') return t('genderUnknown')
  return getGenderLabel(gender, t)
}


export function formatChartLabel(label: string, t: any) {
  const labels: Record<string, string> = {
    agent: t('labelAgent'),
    direct: t('labelDirect'),
    dismissed: t('labelDismissed'),
    group: t('labelGroup'),
    owner: t('labelOwner'),
    pending: t('labelPending'),
    reviewed: t('labelReviewed'),
    support: t('labelSupport'),
    user: t('labelUser'),
  }

  return labels[label] || label
}
