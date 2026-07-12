import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 34：首页 Tab 渲染', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
  })

  test('孩子视角：顶部欢迎卡显示"加油"+积分数字', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    // 默认就在 home tab
    await expect(page.getByText(/加油！/)).toBeVisible({ timeout: 8000 })
    // 显示"已审核积分"标签
    await expect(page.getByText('已审核积分')).toBeVisible()
  })

  test('家长视角：顶部显示"<孩子名> 的任务"标题', async ({ page }) => {
    // 妈妈登录后默认看第一个孩子（小宇）的任务
    await expect(page.getByText(/的任务/)).toBeVisible({ timeout: 8000 })
  })

  test('今日数据小卡片：4 个统计数字（总任务/已审核/待审核/待打卡）都可见', async ({ page }) => {
    await expect(page.getByText('总任务')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('已审核', { exact: true })).toBeVisible()
    await expect(page.getByText('待审核', { exact: true })).toBeVisible()
    await expect(page.getByText('待打卡')).toBeVisible()
  })

  test('今日待办列表：显示活动标题和积分', async ({ page }) => {
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    // seed 的活动里至少有"起床洗漱"
    await expect(page.getByText('起床洗漱')).toBeVisible()
    // 显示积分（默认 2 分）
    await expect(page.getByText('2 分').first()).toBeVisible()
  })

  test('孩子点"打卡"按钮后，活动状态变为"待审核"', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await expect(page.getByText('起床洗漱')).toBeVisible({ timeout: 8000 })

    // 用 card-pressable 类定位活动卡片，再过滤含"起床洗漱"文案的那张
    const activityCard = page.locator('.card-pressable', { hasText: '起床洗漱' }).first()
    await activityCard.getByRole('button', { name: '打卡' }).click()

    // 状态应变为"待审核"（活动卡片内出现待审核 Badge）
    await expect(activityCard.getByText('待审核')).toBeVisible({ timeout: 5000 })
    // 该活动卡片应不再有"打卡"按钮
    await expect(activityCard.getByRole('button', { name: '打卡' })).toHaveCount(0)
  })

  test('家长视角下显示"代打卡"按钮（不是"打卡"）', async ({ page }) => {
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    // 家长视角下未完成活动的按钮文案是"代打卡"
    await expect(page.getByRole('button', { name: /代打卡/ }).first()).toBeVisible()
  })

  test('家长视角：显示"扣分检查"按钮', async ({ page }) => {
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /扣分检查/ })).toBeVisible()
  })

  test('孩子视角：不显示"扣分检查"按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    await expect(page.getByRole('button', { name: /扣分检查/ })).toHaveCount(0)
  })

  test('家长视角：显示"待审核打卡"面板（PendingVerificationPanel）', async ({ page }) => {
    await expect(page.getByText(/待审核打卡/)).toBeVisible({ timeout: 8000 })
  })

  test('孩子视角：不显示"待审核打卡"面板', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await expect(page.getByText(/待审核打卡 ·/)).toHaveCount(0)
  })

  test('家长视角：多个孩子时显示孩子切换胶囊按钮', async ({ page }) => {
    // seed 有 2 个孩子（小宇 + 小苒）
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    // 顶部应有两个孩子的胶囊按钮
    const pillBtns = page.locator('button:has(span:has-text("小宇")), button:has(span:has-text("小苒"))')
    await expect(pillBtns.first()).toBeVisible()
  })

  test('家长点"代打卡"后，活动状态变为"待审核"', async ({ page }) => {
    await expect(page.getByText('起床洗漱')).toBeVisible({ timeout: 8000 })
    const activityCard = page.locator('.card-pressable', { hasText: '起床洗漱' }).first()
    await activityCard.getByRole('button', { name: /代打卡/ }).click()
    // 应出现待审核标识
    await expect(activityCard.getByText('待审核')).toBeVisible({ timeout: 5000 })
  })

  test('积分里程碑区域：显示鼓励阈值列表', async ({ page }) => {
    await expect(page.getByText('积分里程碑')).toBeVisible({ timeout: 8000 })
    // seed 默认会有几个里程碑（如 10 分、50 分、100 分等）
    // 至少有一个里程碑条目
    const milestoneItems = page.locator('text=分').filter({ hasText: /\d+\s*分/ })
    await expect(milestoneItems.first()).toBeVisible()
  })

  test('孩子视角：今日待办区域不显示"可代打卡"徽章', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('可代打卡')).toHaveCount(0)
  })

  test('家长视角：今日待办区域显示"可代打卡"徽章', async ({ page }) => {
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('可代打卡')).toBeVisible()
  })
})
