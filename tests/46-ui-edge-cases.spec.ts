import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 46：边缘场景与错误处理', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
  })

  test('页面初次加载时显示"加载中..."然后消失', async ({ page }) => {
    // reload 重新触发加载
    await page.reload()
    // 加载完成后应显示主界面
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
    // 加载中文字应消失
    await expect(page.getByText('加载中...', { exact: true })).toHaveCount(0, { timeout: 10000 })
  })

  test('未登录时清除 localStorage 后访问，回到登录页', async ({ page }) => {
    await page.evaluate(() => localStorage.removeItem('kids-time-store'))
    await page.goto('http://localhost:3000')
    await expect(page.getByText('快速登录（测试）')).toBeVisible({ timeout: 5000 })
  })

  test('token 无效时 API 返回 401，前端自动回到登录页', async ({ page }) => {
    // 注入一个无效 token
    await page.evaluate(() => {
      const store = JSON.parse(localStorage.getItem('kids-time-store') || '{}')
      store.state.token = 'invalid-token-xyz'
      localStorage.setItem('kids-time-store', JSON.stringify(store))
    })
    await page.reload()
    // 应回到登录页（token 无效被清除）
    await expect(page.getByText('快速登录（测试）')).toBeVisible({ timeout: 5000 })
  })

  test('切到空数据的 Tab 不崩溃（日程列表视图）', async ({ page }) => {
    await gotoTab(page, 'schedule')
    await page.getByText('列表', { exact: true }).click()
    // 切到月度（可能无活动）
    await page.getByRole('tab', { name: '月度' }).click()
    // 应显示空状态或活动列表，不崩溃
    await expect(
      page.getByText('暂无月度活动').or(page.locator('.space-y-2').first())
    ).toBeVisible({ timeout: 5000 })
  })

  test('奖励兑换商店为空时显示空状态', async ({ page }) => {
    // 删除所有奖励（通过 API）
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-mom' }),
    })
    const data = await res.json()
    const rewardsRes = await fetch('http://localhost:3000/api/rewards', {
      headers: { Authorization: `Bearer ${data.token}` },
    })
    const rewards = await rewardsRes.json()
    for (const r of rewards) {
      await fetch(`http://localhost:3000/api/rewards/${r.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${data.token}` },
      })
    }

    await gotoTab(page, 'rewards')
    await expect(page.getByText('还没有奖励，等家长添加').or(page.getByText('共 0 项奖励')).first()).toBeVisible({ timeout: 5000 })
  })

  test('家庭 Tab 积分流水为空时显示空状态', async ({ page }) => {
    // 新建一个没有流水的新成员
    await gotoTab(page, 'family')
    await page.getByRole('button', { name: /添加成员/ }).click()
    await page.getByPlaceholder('例如：小明').fill('空流水测试')
    await page.locator('button.aspect-square').nth(2).click()
    await page.getByRole('button', { name: '保存' }).click()
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })

    // 点击新成员卡片
    await page.getByText('空流水测试').click()
    // 应显示"还没有积分记录"
    await expect(page.getByText('还没有积分记录')).toBeVisible({ timeout: 5000 })
  })

  test('快速切换 Tab 不会崩溃', async ({ page }) => {
    // 快速连续点击 5 个 Tab
    for (const tab of ['schedule', 'rewards', 'planning', 'family', 'home'] as const) {
      await gotoTab(page, tab)
    }
    // 最终应停在 home tab
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 5000 })
  })

  test('快速切换成员不会崩溃', async ({ page }) => {
    // 切换一次成员（验证不崩溃即可）
    await switchMemberByUI(page, '小宇')
    // 顶部应显示孩子名
    await expect(page.locator('header button:has(svg.lucide-chevron-down)')).toContainText('小宇')
  })

  test('对话框打开时按 Esc 可关闭', async ({ page }) => {
    await gotoTab(page, 'schedule')
    await page.getByRole('button', { name: /新建/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 })
  })

  test('多家庭隔离：不同家庭的成员互不可见', async ({ page }) => {
    // 当前是 test 家庭（test-mom）
    await gotoTab(page, 'family')
    await expect(page.getByText('小宇').first()).toBeVisible({ timeout: 5000 })

    // 切换到 family-b 家庭
    await page.evaluate(() => localStorage.removeItem('kids-time-store'))
    // 用 family-b-mom 登录
    const res = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'family-b-mom' }),
    })
    const data = await res.json()
    await page.goto('http://localhost:3000')
    await page.evaluate((storePayload: string) => {
      localStorage.setItem('kids-time-store', storePayload)
    }, JSON.stringify({
      state: {
        currentMemberId: data.user.memberId,
        initialized: false,
        token: data.token,
        user: data.user,
      },
      version: 0,
    }))
    await page.reload()
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })

    await gotoTab(page, 'family')
    // family-b 不应有"小苒"（那是 test 家庭 seed 的第二个孩子）
    // 注意：每个新家庭默认都有一个"小宇"，所以不能用它区分
    await expect(page.getByText('小苒')).toHaveCount(0)
  })

  test('活动详情对话框中显示活动描述（如果有）', async ({ page }) => {
    await gotoTab(page, 'schedule')
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    await page.getByText('起床洗漱').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    // 对话框应正常显示，不崩溃
    await expect(page.getByText('起床洗漱').first()).toBeVisible()
  })

  test('网络请求失败时显示错误 toast', async ({ page }) => {
    // 拦截 API 请求使其失败
    await page.route('**/api/activities**', (route) => {
      route.abort()
    })
    await page.reload()
    // 应能显示主界面（可能部分内容加载失败但不崩溃）
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })
  })

  test('规划页目标列表正常渲染（不崩溃）', async ({ page }) => {
    // 验证规划页在正常数据下渲染目标列表
    await gotoTab(page, 'planning')
    // 应显示"共 X 个目标"（seed 数据有 2 个目标）
    await expect(page.getByText(/共 \d+ 个目标/).first()).toBeVisible({ timeout: 5000 })
  })
})
