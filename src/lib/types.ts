// 前端类型定义（与后端 Prisma 模型对应）
export type Role = 'child' | 'mom' | 'dad'
export type ScheduleType = 'daily' | 'weekly' | 'monthly'

export interface Member {
  id: string
  name: string
  role: Role
  avatar: string
  color: string
  totalPoints: number
}

export interface Activity {
  id: string
  title: string
  description: string | null
  scheduleType: ScheduleType
  dayOfWeek: number | null
  dayOfMonth: number | null
  scheduledTime: string | null
  points: number
  onTimeBonus: number
  deadline: string | null
  active: boolean
  startDate: string
  createdById: string
  assignedToId: string | null
  createdAt: string
  updatedAt: string
  createdBy?: Member
  assignedTo?: Member | null
}

export interface ActivityLog {
  id: string
  activityId: string
  memberId: string
  occurrenceDate: string
  status: 'pending_verification' | 'completed' | 'rejected' | 'missed'
  onTime: boolean
  pointsAwarded: number
  bonusAwarded: number
  completedAt: string | null
  operatorId: string | null
  verifiedAt: string | null
  verifiedById: string | null
}

export interface ActivityWithLog extends Activity {
  log?: ActivityLog | null
}

export interface PointTransaction {
  id: string
  memberId: string
  amount: number
  type: 'earn' | 'bonus' | 'penalty' | 'redeem' | 'adjust'
  reason: string
  activityId: string | null
  createdAt: string
}

export interface Encouragement {
  id: string
  threshold: number
  title: string
  message: string
  icon: string
}

export interface Reward {
  id: string
  title: string
  description: string | null
  icon: string
  pointsCost: number
  active: boolean
  createdById: string
  createdBy?: Member
}

export interface RewardRedemption {
  id: string
  rewardId: string
  memberId: string
  status: 'pending' | 'approved' | 'rejected' | 'fulfilled'
  pointsSpent: number
  note: string | null
  createdAt: string
  resolvedAt: string | null
  reward: Reward
  member: Member
}

// 简单 API 客户端（自动从 localStorage 读 token）
export async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  // 从 localStorage 读 token
  let token: string | null = null
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('kids-time-store')
      if (raw) token = JSON.parse(raw)?.state?.token ?? null
    } catch {}
  }

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (res.status === 401) {
    // token 失效，清空登录态
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('kids-time-store')
        window.location.reload()
      } catch {}
    }
    throw new Error('未登录')
  }

  const data = await res.json()
  if (!res.ok) {
    throw new Error(data.error || `请求失败 (${res.status})`)
  }
  return data as T
}

// 角色相关辅助
export const ROLE_LABEL: Record<Role, string> = {
  child: '孩子',
  mom: '妈妈',
  dad: '爸爸',
}

export const ROLE_COLOR: Record<Role, string> = {
  child: '#FF9A3C',
  mom: '#EC4899',
  dad: '#10B981',
}

export const SCHEDULE_LABEL: Record<ScheduleType, string> = {
  daily: '日度',
  weekly: '周度',
  monthly: '月度',
}

export const WEEKDAY_LABEL = ['', '周一', '周二', '周三', '周四', '周五', '周六', '周日']

export function formatDateCN(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
