import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 42：活动详情对话框', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'schedule')
    // 默认网格视图，点击第一个活动卡片打开详情
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    await page.getByText('起床洗漱').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
  })

  test('对话框显示活动标题', async ({ page }) => {
    await expect(page.getByText('起床洗漱').first()).toBeVisible()
  })

  test('显示时间信息（开始时间 / 截止时间）', async ({ page }) => {
    // 详情对话框中应有"开始时间"或"截止"等字样
    await expect(page.getByText(/时间|截止|开始/).first()).toBeVisible()
  })

  test('显示积分信息（基础分 + 按时加分）', async ({ page }) => {
    await expect(page.getByText(/分/).first()).toBeVisible()
  })

  test('未打卡时显示"待完成"状态徽章', async ({ page }) => {
    // seed 数据默认无打卡，应显示"待完成"或"已超时"
    await expect(page.getByText(/待完成|已超时/).first()).toBeVisible()
  })

  test('家长视角：显示"编辑"按钮', async ({ page }) => {
    await expect(page.getByRole('button', { name: /编辑/ })).toBeVisible()
  })

  test('孩子视角：不显示"编辑"按钮', async ({ page }) => {
    // 先关闭当前对话框
    await page.keyboard.press('Escape')
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    await page.getByText('起床洗漱').first().click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await expect(page.getByRole('button', { name: /编辑/ })).toHaveCount(0)
  })

  test('点"编辑"按钮，切换到编辑对话框', async ({ page }) => {
    await page.getByRole('button', { name: /编辑/ }).click()
    // 应出现"编辑活动"对话框
    await expect(page.getByText('编辑活动')).toBeVisible({ timeout: 3000 })
  })

  test('点关闭按钮或 Esc 关闭对话框', async ({ page }) => {
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 3000 })
  })

  test('显示周期类型标签（日度/周度/月度/临时）', async ({ page }) => {
    // seed 活动有日度活动，详情应显示"日度"
    await expect(page.getByText(/日度|周度|月度|临时/).first()).toBeVisible()
  })
})
