const BASE_URL = 'http://localhost:3000'

// === 登录态管理 ===
let _token: string | null = null
let _user: any = null

export async function login(code = 'test-mom'): Promise<{ token: string; user: any }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `登录失败 (${res.status})`)
  _token = data.token
  _user = data.user
  return data
}

export function getToken(): string | null {
  return _token
}

export function getCurrentUser() {
  return _user
}

// 切换身份（同一家庭内）
export async function switchRole(code: 'test-mom' | 'test-dad' | 'test-child') {
  return login(code)
}

// === 通用 API 调用（自动带 token）===
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  if (!_token) await login('test-mom') // 兜底自动登录
  const res = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${_token}`,
    },
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
  familyId?: string
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

// 测试专用：重置并写入固定初始数据
// 使用当前 token 的 familyId
// seed 会删除并重建 Member，所以需要重新登录获取新 token
export async function resetAndSeed(): Promise<void> {
  if (!_token) await login('test-mom')
  await api('/api/test/seed', { method: 'POST' })
  // seed 重建了 Member，需要重新登录获取新 token（memberId 变了）
  const currentUser = _user
  if (currentUser) {
    // 用相同 code 重新登录
    const code = _user?.role === 'mom' ? 'test-mom' : _user?.role === 'dad' ? 'test-dad' : 'test-child'
    await login(code)
  }
}

// === 成员 CRUD ===
export async function createMember(data: {
  name: string
  role: Member['role']
  avatar?: string
  color?: string
}): Promise<Member> {
  return api<Member>('/api/members', { method: 'POST', body: data })
}

export async function deleteMember(memberId: string): Promise<void> {
  await api(`/api/members/${memberId}`, { method: 'DELETE' })
}

export async function updateMember(
  memberId: string,
  data: { name?: string; avatar?: string; color?: string; totalPoints?: number }
): Promise<Member> {
  return api(`/api/members/${memberId}`, { method: 'PATCH', body: data })
}

// === 活动 CRUD ===
export async function createActivity(activity: {
  title: string
  scheduleType: 'daily' | 'weekly' | 'monthly' | 'once'
  createdById: string
  assignedToId?: string
  assignedToIds?: string[] | null
  scheduledTime?: string
  deadline?: string
  endDate?: string
  points?: number
  onTimeBonus?: number
  dayOfWeek?: number
  dayOfMonth?: number
  specificDate?: string
  description?: string
}): Promise<any> {
  return api('/api/activities', { method: 'POST', body: activity })
}

export async function updateActivity(activityId: string, data: any): Promise<any> {
  return api(`/api/activities/${activityId}`, { method: 'PATCH', body: data })
}

export async function deleteActivity(activityId: string): Promise<void> {
  await api(`/api/activities/${activityId}`, { method: 'DELETE' })
}

// === 鼓励阈值 ===
export async function getEncouragements(): Promise<any[]> {
  return api('/api/encouragements')
}

export async function createEncouragement(data: {
  threshold: number
  title: string
  message: string
  icon?: string
}): Promise<any> {
  return api('/api/encouragements', { method: 'POST', body: data })
}

// === 奖励 CRUD ===
export async function createReward(data: {
  title: string
  pointsCost: number
  createdById: string
  icon?: string
  description?: string
}): Promise<any> {
  return api('/api/rewards', { method: 'POST', body: data })
}

export async function updateReward(rewardId: string, data: any): Promise<any> {
  return api(`/api/rewards/${rewardId}`, { method: 'PATCH', body: data })
}

export async function deleteReward(rewardId: string): Promise<void> {
  await api(`/api/rewards/${rewardId}`, { method: 'DELETE' })
}

// === 积分流水 ===
export async function getPointTransactions(memberId: string): Promise<any[]> {
  return api(`/api/points/${memberId}`)
}

// === 目标 ===
export async function getGoals(memberId?: string): Promise<any[]> {
  const url = memberId ? `/api/goals?memberId=${memberId}` : '/api/goals'
  return api<any[]>(url)
}

export async function createGoal(data: {
  title: string
  memberId: string
  description?: string
  deadline?: string
  status?: string
}): Promise<any> {
  return api('/api/goals', { method: 'POST', body: data })
}

export async function updateGoal(goalId: string, data: any): Promise<any> {
  return api(`/api/goals/${goalId}`, { method: 'PATCH', body: data })
}

export async function deleteGoal(goalId: string): Promise<void> {
  await api(`/api/goals/${goalId}`, { method: 'DELETE' })
}

// === 点评 ===
export async function getReviews(periodType?: string): Promise<any[]> {
  const url = periodType ? `/api/reviews?periodType=${periodType}` : '/api/reviews'
  return api<any[]>(url)
}

export async function createReview(data: {
  periodType: 'weekly' | 'monthly'
  periodStart: string
  periodEnd: string
  authorId: string
  content: string
}): Promise<any> {
  return api('/api/reviews', { method: 'POST', body: data })
}

export async function deleteReview(reviewId: string): Promise<void> {
  await api(`/api/reviews/${reviewId}`, { method: 'DELETE' })
}

// === 统计 ===
export async function getStats(
  memberId: string,
  period: 'weekly' | 'monthly',
  offset = 0
): Promise<any> {
  return api(`/api/stats?memberId=${memberId}&period=${period}&offset=${offset}`)
}
