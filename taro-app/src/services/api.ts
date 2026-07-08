import Taro from '@tarojs/taro'

const BASE_URL = 'http://localhost:3000'

// Token 管理
let _token: string | null = null

export function getToken(): string | null {
  if (!_token) {
    try {
      _token = Taro.getStorageSync('token') || null
    } catch {}
  }
  return _token
}

export function setToken(token: string) {
  _token = token
  try {
    Taro.setStorageSync('token', token)
  } catch {}
}

export function clearToken() {
  _token = null
  try {
    Taro.removeStorageSync('token')
  } catch {}
}

export interface AuthUser {
  id: string
  familyId: string
  role: 'mom' | 'dad' | 'child'
  memberId: string | null
  nickname?: string
}

let _user: AuthUser | null = null

export function getUser(): AuthUser | null {
  if (!_user) {
    try {
      const raw = Taro.getStorageSync('user')
      if (raw) _user = JSON.parse(raw)
    } catch {}
  }
  return _user
}

export function setUser(user: AuthUser) {
  _user = user
  try {
    Taro.setStorageSync('user', JSON.stringify(user))
  } catch {}
}

export function clearUser() {
  _user = null
  try {
    Taro.removeStorageSync('user')
  } catch {}
}

// 通用 API 调用
export async function api<T = any>(
  path: string,
  options: { method?: string; body?: any } = {}
): Promise<T> {
  const token = getToken()
  const res = await Taro.request({
    url: `${BASE_URL}${path}`,
    method: (options.method || 'GET') as any,
    data: options.body,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (res.statusCode === 401) {
    clearToken()
    clearUser()
    Taro.reLaunch({ url: '/pages/login/index' })
    throw new Error('未登录')
  }

  const data = res.data
  if (res.statusCode >= 400) {
    throw new Error((data as any)?.error || `请求失败 (${res.statusCode})`)
  }
  return data as T
}

// 登录
export async function login(code: string): Promise<{ token: string; user: AuthUser }> {
  const res = await api<{ token: string; user: AuthUser }>('/api/auth/login', {
    method: 'POST',
    body: { code },
  })
  setToken(res.token)
  setUser(res.user)
  return res
}

// 获取成员
export async function getMembers() {
  return api<any[]>('/api/members')
}

// 获取今日活动
export async function getTodayActivities(assignedToId?: string) {
  const url = assignedToId
    ? `/api/activities?today=1&assignedToId=${assignedToId}`
    : '/api/activities?today=1'
  return api<any[]>(url)
}

// 打卡
export async function checkIn(activityId: string, memberId: string, operatorId?: string) {
  return api('/api/activities/complete', {
    method: 'POST',
    body: { activityId, memberId, operatorId },
  })
}

// 获取待审核
export async function getPending() {
  return api<any[]>('/api/activities/pending')
}

// 批量审核
export async function verify(logIds: string[], action: 'approve' | 'reject', verifiedById: string) {
  return api('/api/activities/verify', {
    method: 'POST',
    body: { logIds, action, verifiedById },
  })
}

// === 日程相关 ===

// 获取活动列表（可按 scheduleType / date / assignedToId 过滤）
export async function getActivities(params: {
  scheduleType?: string
  assignedToId?: string
  today?: boolean
  date?: string
}) {
  const qs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${k === 'today' ? 'today=1' : `${k}=${v}`}`)
    .join('&')
  return api<any[]>(`/api/activities${qs ? '?' + qs : ''}`)
}

// 获取活动日志
export async function getActivityLogs(memberId: string, days = 3) {
  return api<any[]>(`/api/activities/logs?memberId=${memberId}&days=${days}`)
}

// 创建活动
export async function createActivity(activity: any) {
  return api('/api/activities', { method: 'POST', body: activity })
}

// 更新活动
export async function updateActivity(activityId: string, data: any) {
  return api(`/api/activities/${activityId}`, { method: 'PATCH', body: data })
}

// 删除活动
export async function deleteActivity(activityId: string) {
  return api(`/api/activities/${activityId}`, { method: 'DELETE' })
}

// 获取鼓励阈值
export async function getEncouragements() {
  return api<any[]>('/api/encouragements')
}

// 获取奖励
export async function getRewards() {
  return api<any[]>('/api/rewards')
}

// 获取目标
export async function getGoals(memberId?: string) {
  const url = memberId ? `/api/goals?memberId=${memberId}` : '/api/goals'
  return api<any[]>(url)
}

// 创建目标
export async function createGoal(data: any) {
  return api('/api/goals', { method: 'POST', body: data })
}

// 更新目标
export async function updateGoal(goalId: string, data: any) {
  return api(`/api/goals/${goalId}`, { method: 'PATCH', body: data })
}

// 删除目标
export async function deleteGoal(goalId: string) {
  return api(`/api/goals/${goalId}`, { method: 'DELETE' })
}

// 获取点评
export async function getReviews(periodType?: string) {
  const url = periodType ? `/api/reviews?periodType=${periodType}` : '/api/reviews'
  return api<any[]>(url)
}

// 创建点评
export async function createReview(data: any) {
  return api('/api/reviews', { method: 'POST', body: data })
}

// 获取统计
export async function getStats(memberId: string, period: 'weekly' | 'monthly', offset = 0) {
  return api<any>(`/api/stats?memberId=${memberId}&period=${period}&offset=${offset}`)
}

// 获取积分流水
export async function getPointTransactions(memberId: string) {
  return api<any[]>(`/api/points/${memberId}`)
}

// 兑换奖励
export async function redeem(rewardId: string, memberId: string) {
  return api('/api/redemptions', { method: 'POST', body: { rewardId, memberId } })
}

// 获取兑换记录
export async function getRedemptions(status?: string) {
  const url = status ? `/api/redemptions?status=${status}` : '/api/redemptions'
  return api<any[]>(url)
}

// 审核兑换
export async function resolveRedemption(redemptionId: string, status: string, resolvedById: string) {
  return api(`/api/redemptions/${redemptionId}`, {
    method: 'PATCH',
    body: { status, resolvedById },
  })
}

// 设置成员积分
export async function setMemberPoints(memberId: string, points: number) {
  return api(`/api/members/${memberId}`, { method: 'PATCH', body: { totalPoints: points } })
}
