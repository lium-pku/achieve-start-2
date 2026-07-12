import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 33：AppShell 导航与角色权限', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
  })

  test('5 个底部 Tab 都可点击切换，高亮当前 Tab', async ({ page }) => {
    // 默认在 home tab
    await expect(page.locator('nav button', { hasText: '首页' })).toHaveClass(/text-primary/)

    // 切到日程
    await gotoTab(page, 'schedule')
    await expect(page.getByText('日程管理')).toBeVisible()
    await expect(page.locator('nav button', { hasText: '日程' })).toHaveClass(/text-primary/)

    // 切到奖励
    await gotoTab(page, 'rewards')
    await expect(page.getByText('积分里程碑')).toBeVisible()
    await expect(page.locator('nav button', { hasText: '奖励' })).toHaveClass(/text-primary/)

    // 切到规划
    await gotoTab(page, 'planning')
    await expect(page.getByText('规划').first()).toBeVisible()
    await expect(page.locator('nav button', { hasText: '规划' })).toHaveClass(/text-primary/)

    // 切到家庭
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible()
    await expect(page.locator('nav button', { hasText: '家庭' })).toHaveClass(/text-primary/)
  })

  test('顶部 MemberSwitcher 下拉菜单显示全部 4 个成员', async ({ page }) => {
    await page.locator('header button:has(svg.lucide-chevron-down)').click()
    // 应有"切换角色"标签
    await expect(page.getByText('切换角色')).toBeVisible()
    // 4 个成员（妈妈/爸爸/小宇/小苒）
    await expect(page.locator('[role="menuitem"]', { hasText: '妈妈' })).toBeVisible()
    await expect(page.locator('[role="menuitem"]', { hasText: '爸爸' })).toBeVisible()
    await expect(page.locator('[role="menuitem"]', { hasText: '小宇' })).toBeVisible()
    await expect(page.locator('[role="menuitem"]', { hasText: '小苒' })).toBeVisible()
  })

  test('通过 MemberSwitcher 切换成员，顶部头像/名字更新', async ({ page }) => {
    // 切换前是妈妈
    await expect(page.locator('header button:has(svg.lucide-chevron-down)')).toContainText('妈妈')

    // 切到爸爸
    await switchMemberByUI(page, '爸爸')
    await expect(page.locator('header button:has(svg.lucide-chevron-down)')).toContainText('爸爸')
  })

  test('家长视角：日程 Tab 显示"新建"按钮和"扣分检查"按钮', async ({ page }) => {
    await gotoTab(page, 'schedule')
    await expect(page.getByRole('button', { name: /新建/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /扣分检查/ })).toBeVisible()
  })

  test('孩子视角：日程 Tab 不显示"新建"和"扣分检查"，只显示提示卡片', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    // 不应有"新建"按钮
    await expect(page.getByRole('button', { name: /新建/ })).toHaveCount(0)
    // 不应有"扣分检查"
    await expect(page.getByRole('button', { name: /扣分检查/ })).toHaveCount(0)
    // 应有"只有爸爸妈妈可以增删活动"的提示
    await expect(page.getByText(/只有爸爸妈妈可以增删活动/)).toBeVisible()
  })

  test('家长视角：奖励 Tab 不显示"立即兑换"按钮（家长不能兑换）', async ({ page }) => {
    await gotoTab(page, 'rewards')
    // 默认在"兑换商店"tab
    // 家长看到的奖励卡片里不应有"立即兑换"按钮
    await expect(page.getByRole('button', { name: '立即兑换' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: '积分不足' })).toHaveCount(0)
  })

  test('孩子视角：奖励 Tab 显示"立即兑换"或"积分不足"按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'rewards')
    // 应有"立即兑换"或"积分不足"按钮之一
    const redeemBtns = page.getByRole('button', { name: /立即兑换|积分不足/ })
    await expect(redeemBtns.first()).toBeVisible({ timeout: 5000 })
  })

  test('家长视角：家庭 Tab 显示"添加成员"按钮', async ({ page }) => {
    await gotoTab(page, 'family')
    await expect(page.getByRole('button', { name: /添加成员/ })).toBeVisible()
  })

  test('孩子视角：家庭 Tab 不显示"添加成员"按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'family')
    await expect(page.getByRole('button', { name: /添加成员/ })).toHaveCount(0)
  })

  test('未登录访问主页自动回到登录页', async ({ page }) => {
    // 清空 localStorage 后访问
    await page.evaluate(() => localStorage.removeItem('kids-time-store'))
    await page.goto('http://localhost:3000')
    // 应看到登录页的快速登录区域
    await expect(page.getByText('快速登录（测试）')).toBeVisible()
  })
})
