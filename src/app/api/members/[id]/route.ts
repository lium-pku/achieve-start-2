import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()

  // 如果是改 totalPoints，写一条 adjust 流水记录差额
  if (body.totalPoints !== undefined) {
    const before = await db.member.findUnique({ where: { id } })
    const beforePoints = before?.totalPoints ?? 0
    const delta = body.totalPoints - beforePoints
    if (delta !== 0) {
      await db.pointTransaction.create({
        data: {
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
  await db.member.delete({ where: { id } })
  return ok({ deleted: true })
}
