import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-me-32chars-min'
)

export type Role = 'mom' | 'dad' | 'child'

export interface Ctx {
  userId: string
  familyId: string
  role: Role
  memberId: string | null
}

// 签发 JWT
export async function signJwt(payload: {
  sub: string
  familyId: string
  role: string
  memberId: string | null
}) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

// 验证 JWT
export async function verifyJwt(token: string) {
  const { payload } = await jwtVerify(token, SECRET)
  return payload as {
    sub: string
    familyId: string
    role: string
    memberId: string | null
  }
}

// 从请求头解析上下文（middleware 已注入）
export function getContext(req: Request): Ctx {
  const userId = req.headers.get('x-user-id')
  const familyId = req.headers.get('x-family-id')
  const role = req.headers.get('x-role') as Role
  const memberId = req.headers.get('x-member-id')
  if (!userId || !familyId || !role) {
    throw new Error('未授权')
  }
  return { userId, familyId, role, memberId }
}

// 家长权限校验，返回错误响应或 null
export function requireParent(ctx: Ctx): Response | null {
  if (ctx.role !== 'mom' && ctx.role !== 'dad') {
    return Response.json({ error: '需要家长权限' }, { status: 403 })
  }
  return null
}

// 校验 member 属于当前 family
export async function assertMemberInFamily(
  memberId: string,
  familyId: string
): Promise<void> {
  const m = await db.member.findUnique({
    where: { id: memberId },
    select: { familyId: true },
  })
  if (!m || m.familyId !== familyId) {
    throw new Error('成员不存在或无权访问')
  }
}
