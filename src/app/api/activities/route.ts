import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail, isActiveToday } from '@/lib/time-utils'

// 获取活动列表（可按 scheduleType 过滤）
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const scheduleType = searchParams.get('scheduleType')
  const assignedToId = searchParams.get('assignedToId')
  const onlyToday = searchParams.get('today') === '1'

  let activities = await db.activity.findMany({
    where: {
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
    activities = activities.filter(a => isActiveToday(a))
  }

  return ok(activities)
}

// 新增活动（家长才能创建）
export async function POST(req: Request) {
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
    createdById,
    assignedToId,
  } = body

  if (!title || !scheduleType || !createdById) {
    return fail('缺少 title / scheduleType / createdById')
  }
  if (!['daily', 'weekly', 'monthly'].includes(scheduleType)) {
    return fail('scheduleType 必须为 daily/weekly/monthly')
  }
  if (scheduleType === 'weekly' && (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7)) {
    return fail('周度活动需指定 dayOfWeek (1-7)')
  }
  if (scheduleType === 'monthly' && (!dayOfMonth || dayOfMonth < 1 || dayOfMonth > 31)) {
    return fail('月度活动需指定 dayOfMonth (1-31)')
  }

  const activity = await db.activity.create({
    data: {
      title,
      description: description || null,
      scheduleType,
      dayOfWeek: dayOfWeek ?? null,
      dayOfMonth: dayOfMonth ?? null,
      scheduledTime: scheduledTime || null,
      points: Number(points) || 1,
      onTimeBonus: Number(onTimeBonus) || 0,
      deadline: deadline || null,
      createdById,
      assignedToId: assignedToId || null,
    },
  })
  return NextResponse.json(activity, { status: 201 })
}
