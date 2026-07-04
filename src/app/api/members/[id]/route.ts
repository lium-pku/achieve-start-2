import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  // 确认 member 属于当前 family
  const existing = await db.member.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('成员不存在或无权访问', 404)

  const body = await req.json()

  // 如果是改 totalPoints，写一条 adjust 流水记录差额
  if (body.totalPoints !== undefined) {
    const beforePoints = existing.totalPoints
    const delta = body.totalPoints - beforePoints
    if (delta !== 0) {
      await db.pointTransaction.create({
        data: {
          familyId: ctx.familyId,
          memberId: id,
          amount: delta,
          type: 'adjust',
          reason: body.reason || `手动调整积分 ${beforePoints} → ${body.totalPoints}`,
        },
      })
    }
  }

  const member = await db.member.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.avatar !== undefined && { avatar: body.avatar }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.totalPoints !== undefined && { totalPoints: body.totalPoints }),
    },
  })
  return ok(member)
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(_req)
  const err = requireParent(ctx)
  if (err) return err

  const existing = await db.member.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('成员不存在或无权访问', 404)

  await db.member.delete({ where: { id } })
  return ok({ deleted: true })
}
