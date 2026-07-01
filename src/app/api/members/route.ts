import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ok, fail } from '@/lib/time-utils'

// 获取全部成员
export async function GET() {
  const members = await db.member.findMany({
    orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
  })
  return ok(members)
}

// 新增成员
export async function POST(req: Request) {
  const body = await req.json()
  const { name, role, avatar, color } = body
  if (!name || !role) return fail('缺少 name 或 role')
  if (!['child', 'mom', 'dad'].includes(role)) return fail('role 必须为 child/mom/dad')

  const member = await db.member.create({
    data: {
      name,
      role,
      avatar: avatar || (role === 'child' ? '🧒' : role === 'mom' ? '👩' : '👨'),
      color: color || (role === 'child' ? '#FF9A3C' : role === 'mom' ? '#EC4899' : '#10B981'),
    },
  })
  return NextResponse.json(member, { status: 201 })
}
