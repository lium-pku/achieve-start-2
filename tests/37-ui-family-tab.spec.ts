import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 37：家庭 Tab 渲染', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'family')
  })

  test('显示 4 个成员卡片', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 4 个成员：妈妈/爸爸/小宇/小苒
    await expect(page.getByText('妈妈').first()).toBeVisible()
    await expect(page.getByText('爸爸').first()).toBeVisible()
    await expect(page.getByText('小宇').first()).toBeVisible()
    await expect(page.getByText('小苒').first()).toBeVisible()
  })

  test('当前登录成员的卡片有"当前"徽章', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 妈妈登录，妈妈卡片应有"当前"徽章
    const momCard = page.locator('div', { hasText: '妈妈' }).filter({ hasText: '当前' })
    await expect(momCard.first()).toBeVisible()
  })

  test('成员卡片显示积分', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 至少有"X 分"格式的文字
    await expect(page.getByText(/\d+ 分/).first()).toBeVisible()
  })

  test('家长视角：每个成员卡片显示"编辑"按钮', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 编辑按钮（Pencil icon）
    const editBtns = page.locator('button:has(svg.lucide-pencil)')
    await expect(editBtns.first()).toBeVisible()
  })

  test('孩子视角：成员卡片不显示编辑按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'family')
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    await expect(page.locator('button:has(svg.lucide-pencil)')).toHaveCount(0)
  })

  test('点击成员卡片切换当前成员，"当前"徽章应转移', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 初始"当前"在妈妈
    await expect(page.locator('div', { hasText: '妈妈' }).filter({ hasText: '当前' }).first()).toBeVisible()

    // 点爸爸卡片（避免点到编辑按钮）
    const dadCard = page.locator('div.card-pressable', { hasText: '爸爸' }).filter({ hasText: '爸爸' }).first()
    await dadCard.click()

    // 应该有 toast 提示
    await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
    // 现在爸爸卡片应有"当前"徽章
    await expect(page.locator('div', { hasText: '爸爸' }).filter({ hasText: '当前' }).first()).toBeVisible({ timeout: 5000 })
  })

  test('积分流水区域可见', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // 应有"X 的积分流水"标题
    await expect(page.getByText(/的积分流水/)).toBeVisible()
  })

  test('积分流水显示交易类型标签（完成/奖励/扣分等）', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    // seed 数据里通常会有"完成"类型的流水
    // 流水类型标签：完成 / 奖励 / 扣分 / 兑换 / 调整
    // 至少有其中一个
    const labels = ['完成', '奖励', '扣分', '兑换', '调整']
    let found = false
    for (const label of labels) {
      const cnt = await page.getByText(label, { exact: true }).count()
      if (cnt > 0) {
        found = true
        break
      }
    }
    expect(found || (await page.getByText('还没有积分记录').count()) > 0).toBeTruthy()
  })

  test('使用说明卡片可见', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('使用说明')).toBeVisible()
    // 应该有"爸爸妈妈角色可以新建/编辑/删除活动与奖励"等说明文字
    await expect(page.getByText(/爸爸妈妈角色可以新建/)).toBeVisible()
  })

  test('家长点"添加成员"按钮，弹出对话框', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    await page.getByRole('button', { name: /添加成员/ }).click()
    await expect(page.getByText('添加成员').or(page.getByText('编辑成员'))).toBeVisible({ timeout: 3000 })
  })

  test('点击编辑按钮，弹出"编辑成员"对话框', async ({ page }) => {
    await expect(page.getByText('家庭').first()).toBeVisible({ timeout: 5000 })
    await page.locator('button:has(svg.lucide-pencil)').first().click()
    await expect(page.getByText('编辑成员')).toBeVisible({ timeout: 3000 })
  })
})
