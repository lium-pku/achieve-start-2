import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 48：用户主题色切换', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
  })

  test('切换成员后，app 主题色跟着改变', async ({ page }) => {
    await expect(page.getByText('时间小达人').first()).toBeVisible({ timeout: 10000 })

    // 妈妈主题色（pink）
    const primaryColorMom = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    })

    // 切换到小宇（orange）
    await switchMemberByUI(page, '小宇')
    await expect(page.getByText('今日待办')).toBeVisible({ timeout: 8000 })
    await page.waitForTimeout(800)

    const primaryColorChild = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    })

    // pink 和 orange 应不同
    expect(primaryColorMom).not.toBe(primaryColorChild)
  })

  test('家庭 Tab 显示配色按钮（Palette 图标）', async ({ page }) => {
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has(svg.lucide-palette)').first()).toBeVisible({ timeout: 5000 })
  })

  test('点击配色按钮，弹出主题选择对话框', async ({ page }) => {
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    await page.locator('button:has(svg.lucide-palette)').first().click()
    await expect(page.getByText('选择配色方案')).toBeVisible({ timeout: 3000 })
    // 6 套预设
    await expect(page.getByText('活力橙')).toBeVisible()
    await expect(page.getByText('甜美粉')).toBeVisible()
    await expect(page.getByText('清新绿')).toBeVisible()
    await expect(page.getByText('天空蓝')).toBeVisible()
    await expect(page.getByText('梦幻紫')).toBeVisible()
    await expect(page.getByText('热情红')).toBeVisible()
  })

  test('选择新主题并保存，app 配色立即变化', async ({ page }) => {
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })

    const beforeColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    })

    await page.locator('button:has(svg.lucide-palette)').first().click()
    await expect(page.getByText('选择配色方案')).toBeVisible({ timeout: 3000 })

    // 选"天空蓝"
    await page.getByText('天空蓝').click()
    await page.getByRole('button', { name: '应用配色' }).click()
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
    await page.waitForTimeout(1000)

    const afterColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    })
    expect(afterColor).not.toBe(beforeColor)
  })

  test('孩子视角：只能看到自己的配色按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 只有 1 个配色按钮（自己的）
    await expect(page.locator('button:has(svg.lucide-palette)')).toHaveCount(1)
  })

  test('家长视角：每个成员都有配色按钮', async ({ page }) => {
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 4 个成员 → 4 个配色按钮
    await expect(page.locator('button:has(svg.lucide-palette)')).toHaveCount(4)
  })

  test('成员对话框中主题色选择器显示 6 套预设', async ({ page }) => {
    await gotoTab(page, 'family')
    await page.getByRole('button', { name: /添加成员/ }).click()
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('主题色（影响整个 App 配色）')).toBeVisible()
    await expect(page.getByText('活力橙')).toBeVisible()
    await expect(page.getByText('热情红')).toBeVisible()
  })

  test('编辑成员时可重选主题色', async ({ page }) => {
    await gotoTab(page, 'family')
    await page.locator('button:has(svg.lucide-pencil)').first().click()
    await expect(page.getByText('编辑成员')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('主题色（影响整个 App 配色）')).toBeVisible()
  })
})
