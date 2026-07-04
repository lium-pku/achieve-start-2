import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  // 确认 activity 属于当前 family
  const existing = await db.activity.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('活动不存在或无权访问', 404)

  const body = await req.json()
  const activity = await db.activity.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.scheduledTime !== undefined && { scheduledTime: body.scheduledTime }),
      ...(body.deadline !== undefined && { deadline: body.deadline }),
      ...(body.points !== undefined && { points: Number(body.points) }),
      ...(body.onTimeBonus !== undefined && { onTimeBonus: Number(body.onTimeBonus) }),
      ...(body.dayOfWeek !== undefined && { dayOfWeek: body.dayOfWeek }),
      ...(body.dayOfMonth !== undefined && { dayOfMonth: body.dayOfMonth }),
      ...(body.active !== undefined && { active: body.active }),
      ...(body.assignedToId !== undefined && { assignedToId: body.assignedToId }),
    },
  })
  return ok(activity)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(_req)
  const err = requireParent(ctx)
  if (err) return err

  const existing = await db.activity.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('活动不存在或无权访问', 404)

  // 软删除
  await db.activity.update({ where: { id }, data: { active: false } })
  return ok({ deleted: true })
}
