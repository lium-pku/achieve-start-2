import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, isActiveToday } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

// 获取活动列表（可按 scheduleType 过滤）
export async function GET(req: Request) {
  const ctx = getContext(req)
  const { searchParams } = new URL(req.url)
  const scheduleType = searchParams.get('scheduleType')
  const assignedToId = searchParams.get('assignedToId')
  const onlyToday = searchParams.get('today') === '1'

  let activities = await db.activity.findMany({
    where: {
      familyId: ctx.familyId,
      ...(scheduleType && { scheduleType }),
      ...(assignedToId && { assignedToId }),
      active: true,
    },
    include: {
      createdBy: true,
      assignedTo: true,
    },
    orderBy: [{ scheduledTime: 'asc' }, { createdAt: 'asc' }],
  })

  if (onlyToday) {
    activities = activities.filter((a) => isActiveToday(a))
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
    scheduledTime,
    points,
    onTimeBonus,
    deadline,
    assignedToId,
  } = body

  if (!title || !scheduleType) return fail('缺少 title / scheduleType')
  if (!['daily', 'weekly', 'monthly'].includes(scheduleType)) {
    return fail('scheduleType 必须为 daily/weekly/monthly')
  }
  if (scheduleType === 'weekly' && (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)) {
    return fail('周度活动需指定 dayOfWeek (1-7)')
  }
  if (scheduleType === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
    return fail('月度活动需指定 dayOfMonth (1-31)')
  }

  // 校验 assignedToId 属于当前 family
  if (assignedToId) {
    const m = await db.member.findFirst({
      where: { id: assignedToId, familyId: ctx.familyId },
    })
    if (!m) return fail('分配的孩子不存在或无权访问')
  }

  const activity = await db.activity.create({
    data: {
      familyId: ctx.familyId,
      title,
      description: description || null,
      scheduleType,
      dayOfWeek: dayOfWeek ?? null,
      dayOfMonth: dayOfMonth ?? null,
      scheduledTime: scheduledTime || null,
      points: Number(points) || 1,
      onTimeBonus: Number(onTimeBonus) || 0,
      deadline: deadline || null,
      createdById: ctx.memberId || '',
      assignedToId: assignedToId || null,
    },
  })
  return NextResponse.json(activity, { status: 201 })
}
