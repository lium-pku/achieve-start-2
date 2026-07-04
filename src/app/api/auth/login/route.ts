import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signJwt } from '@/lib/auth'
import { ok, fail } from '@/lib/time-utils'

// 登录端点
// body: { code }
// mock 模式：code → openid 固定映射 `mock_openid_${code}`
// 同一"家庭前缀"的 code 归同一家庭：
//   test-mom / test-dad / test-child → 同一家庭（前缀 test）
//   family-b-mom / family-b-dad → 另一家庭（前缀 family-b）
// 首次某家庭前缀登录时创建 Family + 3 个默认 Member
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const { code } = body
  if (!code) return fail('缺少 code')

  // mock openid
  const openid = `mock_openid_${code}`

  // 解析家庭前缀：去掉 -mom/-dad/-child 后缀
  const familyPrefix = code.replace(/-(mom|dad|child)$/, '')

  // 查 User
  let user = await db.user.findUnique({
    where: { openid },
    include: { family: true },
  })

  if (!user) {
    // 查该家庭前缀是否已有 Family（通过查同前缀的其他 User）
    // 简化：用 familyPrefix 作为 family.name 查找
    let family = await db.family.findFirst({
      where: { name: familyPrefix },
    })

    if (!family) {
      // 首次该前缀登录，创建 Family + 3 个默认 Member
      family = await db.family.create({ data: { name: familyPrefix } })
      await db.member.create({
        data: { familyId: family.id, name: '小宇', role: 'child', avatar: '🧒', color: '#FF9A3C' },
      })
      await db.member.create({
        data: { familyId: family.id, name: '妈妈', role: 'mom', avatar: '👩', color: '#EC4899' },
      })
      await db.member.create({
        data: { familyId: family.id, name: '爸爸', role: 'dad', avatar: '👨', color: '#10B981' },
      })
    }

    // 查该家庭对应角色的 Member
    let role = 'mom'
    let nickname = '妈妈'
    if (code.endsWith('dad')) {
      role = 'dad'
      nickname = '爸爸'
    } else if (code.endsWith('child')) {
      role = 'child'
      nickname = '小宇'
    }

    const member = await db.member.findFirst({
      where: { familyId: family.id, role },
    })

    user = await db.user.create({
      data: {
        familyId: family.id,
        openid,
        role,
        memberId: member?.id || null,
        nickname,
      },
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
