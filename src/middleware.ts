import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJwt } from '@/lib/auth'

const PUBLIC_PATHS = ['/api/auth/login', '/api/health']

// CORS 预检请求处理
function handleCors(req: NextRequest) {
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  })
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers })
  }
  return headers
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // 只拦截 /api/*
  if (!pathname.startsWith('/api/')) return NextResponse.next()

  // CORS 预检
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  // 给所有 API 响应加 CORS header
  const corsHeaders = handleCors(req)

  // 公开端点
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    const res = NextResponse.next()
    res.headers.set('Access-Control-Allow-Origin', '*')
    return res
  }

  // 解析 token
  const auth = req.headers.get('authorization') || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    return NextResponse.json({ error: '未登录' }, {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }

  try {
    const payload = await verifyJwt(token)
    const headers = new Headers(req.headers)
    headers.set('x-user-id', payload.sub)
    headers.set('x-family-id', payload.familyId)
    headers.set('x-role', payload.role)
    if (payload.memberId) {
      headers.set('x-member-id', payload.memberId)
    }
    headers.set('Access-Control-Allow-Origin', '*')
    return NextResponse.next({ request: { headers } })
  } catch {
    return NextResponse.json({ error: 'token 无效' }, {
      status: 401,
      headers: { 'Access-Control-Allow-Origin': '*' },
    })
  }
}

export const config = { matcher: ['/api/:path*'] }
