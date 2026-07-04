const BASE_URL = 'http://localhost:3000'

// 通用 API 调用（不依赖 Playwright page）
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`)
  }
  return data as T
}

export interface Member {
  id: string
  name: string
  role: 'child' | 'mom' | 'dad'
  avatar: string
  color: string
  totalPoints: number
}

export async function getMembers(): Promise<Member[]> {
  return api<Member[]>('/api/members')
}

export async function findMemberByRole(role: Member['role']): Promise<Member> {
  const members = await getMembers()
  const m = members.find((m) => m.role === role)
  if (!m) throw new Error(`找不到 ${role} 角色的成员`)
  return m
}

export async function setMemberPoints(memberId: string, points: number): Promise<void> {
  await api(`/api/members/${memberId}`, {
    method: 'PATCH',
    body: { totalPoints: points },
  })
}

export async function getTodayActivities(assignedToId?: string) {
  const url = assignedToId
    ? `/api/activities?today=1&assignedToId=${assignedToId}`
    : '/api/activities?today=1'
  return api<any[]>(url)
}

export async function checkIn(
  activityId: string,
  memberId: string,
  operatorId?: string
) {
  return api('/api/activities/complete', {
    method: 'POST',
    body: { activityId, memberId, operatorId },
  })
}

export async function verify(
  logIds: string[],
  action: 'approve' | 'reject',
  verifiedById: string
) {
  return api('/api/activities/verify', {
    method: 'POST',
    body: { logIds, action, verifiedById },
  })
}

export async function getPending() {
  return api<any[]>('/api/activities/pending')
}

export async function getActivityLogs(memberId: string, days = 3) {
  return api<any[]>(`/api/activities/logs?memberId=${memberId}&days=${days}`)
}

export async function checkPenalty(memberId?: string) {
  return api('/api/activities/check-penalty', {
    method: 'POST',
    body: memberId ? { memberId } : {},
  })
}

export async function redeem(rewardId: string, memberId: string) {
  return api('/api/redemptions', {
    method: 'POST',
    body: { rewardId, memberId },
  })
}

export async function getRedemptions(status?: string) {
  const url = status ? `/api/redemptions?status=${status}` : '/api/redemptions'
  return api<any[]>(url)
}

export async function resolveRedemption(
  redemptionId: string,
  status: 'approved' | 'rejected' | 'fulfilled',
  resolvedById: string
) {
  return api(`/api/redemptions/${redemptionId}`, {
    method: 'PATCH',
    body: { status, resolvedById },
  })
}

export async function getRewards() {
  return api<any[]>('/api/rewards')
}

export async function updateActivityTime(
  activityId: string,
  scheduledTime: string,
  deadline: string
) {
  return api(`/api/activities/${activityId}`, {
    method: 'PATCH',
    body: { scheduledTime, deadline },
  })
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// 测试专用：重置所有数据（清空打卡记录/积分流水/兑换记录，重置积分）
export async function resetAll(): Promise<void> {
  await api('/api/test/reset', { method: 'POST' })
}
