import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
  // 软删除：将 active 设为 false
  await db.activity.update({ where: { id }, data: { active: false } })
  return ok({ deleted: true })
}
