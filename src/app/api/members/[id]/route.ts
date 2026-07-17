import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = getContext(req)

  // 确认 member 属于当前 family
  const existing = await db.member.findFirst({
    where: { id, familyId: ctx.familyId },
  })
  if (!existing) return fail('成员不存在或无权访问', 404)

  const body = await req.json()

  // 权限判断：
  // - 改 totalPoints / name / avatar / color → 仅家长（requireParent）
  // - 改 theme（自己的配色）→ 家长或自己（孩子可以改自己的主题）
  const isThemeOnlyUpdate =
    body.theme !== undefined &&
    body.name === undefined &&
    body.avatar === undefined &&
    body.color === undefined &&
    body.totalPoints === undefined

  if (!isThemeOnlyUpdate) {
    const err = requireParent(ctx)
    if (err) return err
  } else {
    // theme-only 更新：家长可改任意成员，孩子只能改自己
    const isParent = ctx.role === 'mom' || ctx.role === 'dad'
    const isSelf = ctx.memberId === id
    if (!isParent && !isSelf) {
      return fail('只能修改自己的配色方案', 403)
    }
  }

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
      ...(body.theme !== undefined && { theme: body.theme }),
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
