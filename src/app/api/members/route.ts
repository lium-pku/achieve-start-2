import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'
import { getContext, requireParent } from '@/lib/auth'

// 获取当前家庭的成员
export async function GET(req: Request) {
  const ctx = getContext(req)
  const members = await db.member.findMany({
    where: { familyId: ctx.familyId },
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  return ok(members)
}

// 新增成员（仅家长）
export async function POST(req: Request) {
  const ctx = getContext(req)
  const err = requireParent(ctx)
  if (err) return err

  const body = await req.json()
  const { name, role, avatar, color, theme } = body
  if (!name || !role) return fail('缺少 name 或 role')
  if (!['child', 'mom', 'dad'].includes(role)) return fail('role 必须为 child/mom/dad')

  const member = await db.member.create({
    data: {
      familyId: ctx.familyId,
      name,
      role,
      avatar: avatar || (role === 'child' ? '🧒' : role === 'mom' ? '👩' : '👨'),
      color: color || (role === 'child' ? '#FF9A3C' : role === 'mom' ? '#EC4899' : '#10B981'),
      theme: theme || 'orange',
    },
  })
  return NextResponse.json(member, { status: 201 })
}
