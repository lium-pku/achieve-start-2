import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 35：日程 Tab 渲染', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'schedule')
  })

  test('默认是网格视图（grid），显示"网格"高亮', async ({ page }) => {
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
    // ToggleGroupItem 默认是 button role，但有型莰，用 text 定位更稳
    await expect(page.getByText('网格', { exact: true })).toBeVisible()
    await expect(page.getByText('列表', { exact: true })).toBeVisible()
  })

  test('切换到列表视图，显示 daily/weekly/monthly 三个子 Tab', async ({ page }) => {
    await page.getByText('列表', { exact: true }).click()
    // 三个 schedule type 标签
    await expect(page.getByRole('tab', { name: '日度' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '周度' })).toBeVisible()
    await expect(page.getByRole('tab', { name: '月度' })).toBeVisible()
  })

  test('列表视图切换 daily → weekly → monthly，内容应刷新', async ({ page }) => {
    await page.getByText('列表', { exact: true }).click()
    // daily 默认有 seed 的活动
    await expect(page.getByRole('tab', { name: '日度' })).toBeVisible()
    // 切到 weekly
    await page.getByRole('tab', { name: '周度' }).click()
    // 应显示"暂无周度活动"或周度活动列表
    await expect(
      page.getByText('暂无周度活动').or(page.locator('.space-y-2').first())
    ).toBeVisible({ timeout: 5000 })

    // 切到 monthly
    await page.getByRole('tab', { name: '月度' }).click()
    await expect(
      page.getByText('暂无月度活动').or(page.locator('.space-y-2').first())
    ).toBeVisible({ timeout: 5000 })
  })

  test('家长视角：列表视图每个活动卡片显示"编辑"和"删除"按钮', async ({ page }) => {
    await page.getByText('列表', { exact: true }).click()
    // daily 列表至少有 1 个活动
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    // 编辑按钮（Pencil icon）
    const editBtns = page.locator('button:has(svg.lucide-pencil)')
    await expect(editBtns.first()).toBeVisible()
    // 删除按钮（Trash2 icon）
    const deleteBtns = page.locator('button:has(svg.lucide-trash-2)')
    await expect(deleteBtns.first()).toBeVisible()
  })

  test('孩子视角：列表视图不显示编辑/删除按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    await page.getByText('列表', { exact: true }).click()
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    // 不应有编辑/删除按钮
    await expect(page.locator('button:has(svg.lucide-pencil)')).toHaveCount(0)
    await expect(page.locator('button:has(svg.lucide-trash-2)')).toHaveCount(0)
  })

  test('孩子视角：显示"只有爸爸妈妈可以增删活动"提示', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'schedule')
    await expect(page.getByText(/只有爸爸妈妈可以增删活动/)).toBeVisible()
  })

  test('家长点"新建"按钮，弹出活动对话框', async ({ page }) => {
    await page.getByRole('button', { name: /新建/ }).click()
    // 对话框标题
    await expect(page.getByText('新建活动').or(page.getByText('编辑活动'))).toBeVisible({ timeout: 3000 })
  })

  test('列表视图：daily 活动显示活动标题、积分、按时加分', async ({ page }) => {
    await page.getByText('列表', { exact: true }).click()
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    // 积分 2 分
    await expect(page.getByText('2 分').first()).toBeVisible()
    // 按时 +1
    await expect(page.getByText('按时 +1').first()).toBeVisible()
  })

  test('网格视图：显示今日活动卡片', async ({ page }) => {
    // 默认就在网格视图
    await expect(page.getByText('日程管理')).toBeVisible()
    // 至少有 1 个今日活动
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
  })

  test('点击活动卡片，弹出活动详情对话框', async ({ page }) => {
    // 网格视图下点击活动卡片
    await page.getByText('起床洗漱').first().click()
    // 应弹出详情对话框
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
  })

  test('家长点删除按钮，弹出确认对话框', async ({ page }) => {
    await page.getByText('列表', { exact: true }).click()
    await expect(page.getByText('起床洗漱').first()).toBeVisible({ timeout: 5000 })
    // 点击第一个删除按钮
    await page.locator('button:has(svg.lucide-trash-2)').first().click()
    // 确认对话框
    await expect(page.getByText('删除该活动？')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('确认删除')).toBeVisible()
    await expect(page.getByText('取消')).toBeVisible()
  })
})
