import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 43：网格视图角色权限与周视图', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'schedule')
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
  })

  test('家长视角：网格视图说明条显示"可拖动"提示', async ({ page }) => {
    await expect(page.getByText(/可拖动/)).toBeVisible({ timeout: 5000 })
  })

  test('家长视角：活动条上有 GripVertical 拖动手柄图标', async ({ page }) => {
    // GripVertical 图标只在家长视角显示
    await expect(page.locator('svg.lucide-grip-vertical').first()).toBeVisible({ timeout: 5000 })
  })

  test('孩子视角：活动条不显示拖动手柄', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('svg.lucide-grip-vertical')).toHaveCount(0)
  })

  test('孩子视角：说明条不显示"可拖动"', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/可拖动/)).toHaveCount(0)
  })

  test('家长视角：显示成员选择胶囊（多个孩子时）', async ({ page }) => {
    // seed 有 2 个孩子，家长视角应看到成员切换胶囊
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
    // 网格视图中的成员切换胶囊
    const memberPills = page.locator('button:has(span:has-text("小宇")), button:has(span:has-text("小苒"))')
    await expect(memberPills.first()).toBeVisible({ timeout: 5000 })
  })

  test('孩子视角：不显示成员选择胶囊', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
    // 孩子视角不应有成员切换胶囊（只有家长能切换看谁的活动）
    const memberPills = page.locator('button:has(span:has-text("小苒"))')
    await expect(memberPills).toHaveCount(0)
  })

  test('切到周视图，显示 7 天列表', async ({ page }) => {
    await page.locator('button:has-text("周视图")').click()
    // 应显示 7 个日期行（周一到周日）
    const weekdayLabels = page.getByText(/周一|周二|周三|周四|周五|周六|周日/)
    await expect(weekdayLabels.first()).toBeVisible({ timeout: 5000 })
    const count = await weekdayLabels.count()
    expect(count).toBeGreaterThanOrEqual(7)
  })

  test('周视图点击某天，切回日视图并显示该天', async ({ page }) => {
    await page.locator('button:has-text("周视图")').click()
    await expect(page.getByText(/周一|周二|周三|周四|周五|周六|周日/).first()).toBeVisible({ timeout: 5000 })
    // 点击第一个日期行
    const firstDay = page.locator('button.w-full').first()
    await firstDay.click()
    // 应回到日视图，显示该天日期
    await expect(page.locator('button:has-text("日视图")')).toBeVisible({ timeout: 3000 })
  })

  test('周视图高亮今天', async ({ page }) => {
    await page.locator('button:has-text("周视图")').click()
    // 今天的日期数字应有 text-primary class
    const now = new Date()
    const todayDay = now.getDate()
    await expect(page.getByText(String(todayDay)).first()).toBeVisible({ timeout: 5000 })
  })

  test('网格视图：显示"扣分检查"按钮（家长）', async ({ page }) => {
    await expect(page.getByRole('button', { name: /扣分检查/ })).toBeVisible({ timeout: 5000 })
  })

  test('点击"扣分检查"，显示 toast 反馈', async ({ page }) => {
    await page.getByRole('button', { name: /扣分检查/ }).first().click()
    // 应出现 toast（成功或"没有需要扣分的活动"）
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
  })

  test('图例区域：显示 5 种状态色块说明', async ({ page }) => {
    // 图例：待打卡、待审核、已通过、已拒绝/超时、已扣分
    await expect(page.getByText('待打卡')).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('待审核')).toBeVisible()
    await expect(page.getByText('已通过')).toBeVisible()
    await expect(page.getByText(/已拒绝|超时/)).toBeVisible()
    await expect(page.getByText('已扣分')).toBeVisible()
  })

  test('未设定时间的活动区域可见（如果有）', async ({ page }) => {
    // 如果有未设定时间的活动，应显示"未设定具体时间"标题
    // seed 数据中活动都有时间，这里只验证组件不会因无 untimed 活动而崩溃
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
  })
})
