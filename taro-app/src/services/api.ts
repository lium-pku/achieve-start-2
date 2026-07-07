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
