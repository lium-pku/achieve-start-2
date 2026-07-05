import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, isActiveOnDate, isAssignedTo } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

// 获取活动列表
// GET /api/activities?today=1&assignedToId=xxx  (查某孩子今日活动，含公共活动)
// GET /api/activities?date=2026-07-05&assignedToId=xxx
// GET /api/activities?scheduleType=daily
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const scheduleType = searchParams.get('scheduleType')
  const assignedToId = searchParams.get('assignedToId')
  const onlyToday = searchParams.get('today') === '1'
  const dateStr = searchParams.get('date')

  let activities = await db.activity.findMany({
    where: {
      familyId: ctx.familyId,
      ...(scheduleType && { scheduleType }),
      active: true,
    },
    include: {
      createdBy: true,
      assignedTo: true,
    },
    orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'asc' }],
  })

  // 按指定日期过滤
  if (dateStr) {
    const target = new Date(dateStr)
    target.setHours(0, 0, 0, 0)
    activities = activities.filter((a) => isActiveOnDate(a, target))
  } else if (onlyToday) {
    activities = activities.filter((a) => isActiveOnDate(a))
  }

  // 按分配的孩子过滤（含公共活动）
  if (assignedToId) {
    activities = activities.filter((a) => isAssignedTo(a, assignedToId))
  }

  return ok(activities)
}

// 新增活动（家长才能创建）
export async function POST(req: Request) {
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json()
  const {
    title,
    description,
    scheduleType,
    dayOfWeek,
    dayOfMonth,
    specificDate,
    scheduledTime,
    points,
    onTimeBonus,
    deadline,
    endDate,
    assignedToIds, // 数组：['id1','id2'] 或 null（公共活动）
  } = body

  if (!title || !scheduleType) return fail('缺少 title / scheduleType')
  if (!['daily', 'weekly', 'monthly', 'once'].includes(scheduleType)) {
    return fail('scheduleType 必须为 daily/weekly/monthly/once')
  }
  if (scheduleType === 'weekly' && (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)) {
    return fail('周度活动需指定 dayOfWeek (1-7)')
  }
  if (scheduleType === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
    return fail('月度活动需指定 dayOfMonth (1-31)')
  }
  if (scheduleType === 'once' && !specificDate) {
    return fail('临时活动需指定具体日期 specificDate')
  }

  // 校验 assignedToIds 中的每个孩子都属于当前 family
  let assignedToIdsStr: string | null = null
  let primaryAssignedToId: string | null = null
  if (Array.isArray(assignedToIds) && assignedToIds.length > 0) {
    for (const mid of assignedToIds) {
      const m = await db.member.findFirst({
        where: { id: mid, familyId: ctx.familyId, role: 'child' },
      })
      if (!m) return fail(`孩子 ${mid} 不存在或无权访问`)
    }
    assignedToIdsStr = assignedToIds.join(',')
    primaryAssignedToId = assignedToIds[0] // 第一个作为兼容字段
  }
  // assignedToIds 为空数组或 null = 公共活动（所有孩子）

  const activity = await db.activity.create({
    data: {
      familyId: ctx.familyId,
      title,
      description: description || null,
      scheduleType,
      dayOfWeek: dayOfWeek ?? null,
      dayOfMonth: dayOfMonth ?? null,
      specificDate: specificDate ? new Date(specificDate) : null,
      scheduledTime: scheduledTime || null,
      points: Number(points) || 1,
      onTimeBonus: Number(onTimeBonus) || 0,
      deadline: deadline || null,
      endDate: endDate ? new Date(endDate) : null,
      createdById: ctx.memberId || '',
      assignedToId: primaryAssignedToId,
      assignedToIds: assignedToIdsStr,
    },
  })
  return NextResponse.json(activity, { status: 201 })
}
