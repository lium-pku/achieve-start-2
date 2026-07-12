import { Page, expect } from '@playwright/test'

/**
 * UI 测试专用 helpers
 *
 * 这些 helper 与 tests/helpers.ts（API 测试）分开，因为：
 * 1. UI 测试需要 Page 上下文，API 测试只需要 fetch
 * 2. UI 测试关心"用户看到什么、能点什么"，API 测试关心"接口返回什么"
 * 3. 任何"只测 API、不测 UI"的疏漏都是测试覆盖缺口（参见 CLAUDE.md）
 */

const BASE_URL = 'http://localhost:3000'

// === 登录态管理（UI 层）===

/**
 * 通过 UI 点击快速登录按钮登录（测试登录流程本身时使用）
 */
export async function uiLoginByClick(page: Page, code: 'test-mom' | 'test-dad' | 'test-child') {
  await page.goto(BASE_URL)
  // 等待登录卡片出现
  const quickBtn = page.locator('button', { hasText: code === 'test-mom' ? '妈妈' : code === 'test-dad' ? '爸爸' : '孩子' })
  await quickBtn.first().click()
  // 等待主界面出现（顶部"时间小达人"标题）
  await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
}

/**
 * 通过 localStorage 注入登录态（快速登录，UI 测试通用入口）
 *
 * 走真实 /api/auth/login 接口拿 token，再写入 zustand persist 的 localStorage，
 * 这样能跳过登录页的渲染过程，但 token 与真实登录完全一致。
 *
 * 注意：不能用 page.addInitScript 注入，否则后续 goto 都会被强制重新注入，
 * 导致"未登录"测试无法回到登录页。这里用 goto + evaluate + reload 的方式。
 */
export async function uiLoginFast(page: Page, code: 'test-mom' | 'test-dad' | 'test-child') {
  // 1. 通过 API 拿到真实 token + user
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `登录失败 (${res.status})`)

  // 2. 先打开页面（可能是登录页或上一次的页面），再写 localStorage
  await page.goto(BASE_URL)
  await page.evaluate((storePayload: string) => {
    try {
      localStorage.setItem('kids-time-store', storePayload)
    } catch (e) {
      console.error('注入登录态失败', e)
    }
  }, JSON.stringify({
    state: {
      currentMemberId: data.user.memberId,
      initialized: false,
      token: data.token,
      user: data.user,
    },
    version: 0,
  }))

  // 3. reload 让 zustand 重新读 localStorage
  await page.reload()
  // 等待主界面 ready
  await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
  // 等 loading 结束
  await expect(page.getByText('加载中...', { exact: true })).toHaveCount(0, { timeout: 10000 })
}

/**
 * 切换身份（同一家庭内）：先 logout 再 login
 * 用于 UI 测试中"以另一个角色重新登录"的场景
 */
export async function uiSwitchUser(page: Page, code: 'test-mom' | 'test-dad' | 'test-child') {
  await page.evaluate(() => localStorage.removeItem('kids-time-store'))
  await uiLoginFast(page, code)
}

// === Tab 导航 ===

export type TabKey = 'home' | 'schedule' | 'rewards' | 'planning' | 'family'

const TAB_LABELS: Record<TabKey, string> = {
  home: '首页',
  schedule: '日程',
  rewards: '奖励',
  planning: '规划',
  family: '家庭',
}

/** 点击底部导航切换 Tab */
export async function gotoTab(page: Page, tab: TabKey) {
  // 底部导航的按钮文字是 TAB_LABELS[tab]
  const navBtn = page.locator('nav button', { hasText: TAB_LABELS[tab] })
  await navBtn.click()
  // 等 loading 结束
  await expect(page.getByText('加载中...', { exact: true })).toHaveCount(0, { timeout: 10000 })
}

// === 成员切换（顶部 MemberSwitcher）===

/** 通过顶部 MemberSwitcher 切换当前成员 */
export async function switchMemberByUI(page: Page, memberName: string) {
  // 点击顶部的切换按钮（带 ChevronDown 的圆角按钮）
  await page.locator('header button:has(svg.lucide-chevron-down)').click()
  // 在下拉菜单中点对应成员
  await page.locator('[role="menuitem"]', { hasText: memberName }).click()
}

// === 数据准备 ===

/**
 * 重置 + seed（走 API，避免 UI 测试也依赖 seed 页面）
 */
export async function uiResetAndSeed(page: Page, loginCode: 'test-mom' | 'test-dad' | 'test-child' = 'test-mom') {
  // 1. 用 API 登录拿 token
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: loginCode }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `登录失败 (${res.status})`)

  // 2. seed
  const seedRes = await fetch(`${BASE_URL}/api/test/seed`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.token}`,
    },
  })
  if (!seedRes.ok) {
    const err = await seedRes.json().catch(() => ({}))
    throw new Error(err.error || `seed 失败 (${seedRes.status})`)
  }

  // 3. seed 重建了 Member，需要重新登录拿新 token（memberId 变了）
  const reRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: loginCode }),
  })
  const reData = await reRes.json()
  if (!reRes.ok) throw new Error(reData.error || `重新登录失败 (${reRes.status})`)

  // 4. 把新 token 写入 localStorage
  //    需要先 navigate 到 origin，否则 about:blank 上 localStorage 不可用
  await page.goto(BASE_URL)
  await page.evaluate((storePayload: string) => {
    localStorage.setItem('kids-time-store', storePayload)
  }, JSON.stringify({
    state: {
      currentMemberId: reData.user.memberId,
      initialized: false,
      token: reData.token,
      user: reData.user,
    },
    version: 0,
  }))

  // 5. reload 让 zustand 重新读 localStorage
  await page.reload()
  // 等待主界面 ready（如果未登录则会显示登录页）
  await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })

  return reData
}

// === 工具 ===

export async function uiSleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms))
}

/**
 * 断言某个按钮/元素是否对当前角色可见
 * 用于"家长专属按钮"等权限相关 UI 校验
 */
export async function expectVisibleForRole(
  page: Page,
  selector: string,
  visible: boolean
) {
  const loc = page.locator(selector).first()
  if (visible) {
    await expect(loc).toBeVisible({ timeout: 3000 })
  } else {
    // 不强求立即消失，给 React 一点时间
    await expect(loc).toHaveCount(0, { timeout: 3000 })
  }
}
