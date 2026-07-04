import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'

const PUBLIC_PATHS = ['/api/auth/login', '/api/health']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  // 只拦截 /api/*
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // 公开端点
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next()
  }

  // 解析 token
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 })
  }

  try {
    const payload = await verifyJwt(token)
    // 通过 header 转发到 route handler
    const headers = new Headers(req.headers)
    headers.set('x-user-id', payload.sub)
    headers.set('x-family-id', payload.familyId)
    headers.set('x-role', payload.role)
    if (payload.memberId) {
      headers.set('x-member-id', payload.memberId)
    }
    return NextResponse.next({ request: { headers } })
  } catch {
    return NextResponse.json({ error: 'token 无效' }, { status: 401 })
  }
}

export const config = { matcher: ['/api/:path*'] }
