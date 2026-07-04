import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signJwt } from '@/lib/auth'
import { ok, fail } from '@/lib/time-utils'

// 登录端点
// body: { code }
// mock 模式：code → openid 固定映射 `mock_openid_${code}`
// 首次登录自动创建 Family + 3 个默认 Member + User（默认 mom 角色）
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { code } = body
  if (!code) return fail('缺少 code')

  // mock openid
  const openid = `mock_openid_${code}`

  // 查 User
  let user = await db.user.findUnique({
    where: { openid },
    include: { family: true },
  })

  if (!user) {
    // 首次登录：创建 Family + 3 个默认 Member + User
    const family = await db.family.create({ data: { name: '我的家庭' } })
    const child = await db.member.create({
      data: { familyId: family.id, name: '小宇', role: 'child', avatar: '🧒', color: '#FF9A3C' },
    })
    const mom = await db.member.create({
      data: { familyId: family.id, name: '妈妈', role: 'mom', avatar: '👩', color: '#EC4899' },
    })
    const dad = await db.member.create({
      data: { familyId: family.id, name: '爸爸', role: 'dad', avatar: '👨', color: '#10B981' },
    })

    // 根据 code 推断角色
    let role = 'mom'
    let memberId = mom.id
    let nickname = '妈妈'
    if (code.startsWith('dad')) {
      role = 'dad'
      memberId = dad.id
      nickname = '爸爸'
    } else if (code.startsWith('child')) {
      role = 'child'
      memberId = child.id
      nickname = '小宇'
    }

    user = await db.user.create({
      data: { familyId: family.id, openid, role, memberId, nickname },
      include: { family: true },
    })
  }

  const token = await signJwt({
    sub: user.id,
    familyId: user.familyId,
    role: user.role,
    memberId: user.memberId,
  })

  return ok({
    token,
    user: {
      id: user.id,
      familyId: user.familyId,
      role: user.role,
      memberId: user.memberId,
      nickname: user.nickname,
    },
  })
}
