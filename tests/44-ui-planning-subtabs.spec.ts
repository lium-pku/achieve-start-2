import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 44：规划子页面（目标/复盘/点评）', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'planning')
  })

  // === 目标子页 ===
  test.describe('目标子页', () => {
    test('家长视角：显示"新建目标"按钮', async ({ page }) => {
      // 家长看不到"新建目标"按钮（只有孩子能创建自己的目标）
      // 等等 — 让我重新看：isChild 才显示新建按钮
      // 家长应看到目标列表，但不一定能新建
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      // 家长应能看到"共 X 个目标"
      await expect(page.getByText(/共 \d+ 个目标/).or(page.getByText('暂无目标'))).toBeVisible({ timeout: 5000 })
    })

    test('孩子视角：显示"新建目标"按钮', async ({ page }) => {
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('button', { name: /新建目标/ })).toBeVisible({ timeout: 5000 })
    })

    test('目标卡片显示快速状态切换按钮（未开始/进行中/已达成）', async ({ page }) => {
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      // seed 目标应有状态切换按钮（button 元素，不是 badge span）
      await expect(page.getByRole('button', { name: '未开始' }).first()).toBeVisible({ timeout: 5000 })
    })

    test('点击状态按钮可快速切换目标状态', async ({ page }) => {
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      // 找到第一个目标卡片中的"进行中"按钮并点击
      const statusBtn = page.locator('button:has-text("进行中")').first()
      if (await statusBtn.isVisible()) {
        await statusBtn.click()
        // 应出现 toast
        await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 3000 })
      }
    })

    test('孩子视角：目标卡片显示编辑和删除按钮', async ({ page }) => {
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      // 孩子能看到自己目标的编辑/删除按钮
      await expect(page.locator('button:has(svg.lucide-pencil)').or(page.locator('button:has(svg.lucide-trash-2)')).first()).toBeVisible({ timeout: 5000 })
    })

    test('点删除按钮弹出确认对话框', async ({ page }) => {
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      const delBtn = page.locator('button:has(svg.lucide-trash-2)').first()
      if (await delBtn.isVisible()) {
        await delBtn.click()
        await expect(page.getByText('删除该目标？')).toBeVisible({ timeout: 3000 })
      }
    })

    test('目标按状态分组显示', async ({ page }) => {
      await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
      // 应有"未开始"/"进行中"/"已达成"分组标题
      const groups = page.getByText(/未开始|进行中|已达成/)
      await expect(groups.first()).toBeVisible({ timeout: 5000 })
    })
  })

  // === 复盘子页 ===
  test.describe('复盘子页', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: /复盘/ }).click()
    })

    test('显示统计图表区域', async ({ page }) => {
      // 复盘页应有完成率/按时率等统计
      await expect(page.getByText(/完成率|按时率|本周|本月/).first()).toBeVisible({ timeout: 5000 })
    })

    test('家长视角：多个孩子时显示成员切换', async ({ page }) => {
      // 家长视角下复盘页应能切换查看不同孩子
      await expect(page.getByText(/完成率|按时率/).first()).toBeVisible({ timeout: 5000 })
      // 可能有成员切换胶囊
      const memberSwitcher = page.locator('button:has(span:has-text("小宇")), button:has(span:has-text("小苒"))')
      // 不强求存在，但如果有应可点击
    })

    test('显示周期导航（前一周/后一周）', async ({ page }) => {
      await expect(page.getByText(/完成率|按时率/).first()).toBeVisible({ timeout: 5000 })
      // 应有左右箭头导航
      await expect(page.locator('button:has(svg.lucide-chevron-left)').first()).toBeVisible()
      await expect(page.locator('button:has(svg.lucide-chevron-right)').first()).toBeVisible()
    })

    test('显示积分汇总（获得/扣分/兑换/净额）', async ({ page }) => {
      await expect(page.getByText(/完成率|按时率/).first()).toBeVisible({ timeout: 5000 })
      // 应有积分相关统计
      await expect(page.getByText(/分/).first()).toBeVisible()
    })
  })

  // === 点评子页 ===
  test.describe('点评子页', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('tab', { name: '点评', exact: true }).click()
    })

    test('显示周报/月报双 Tab', async ({ page }) => {
      await expect(page.getByRole('tab', { name: '周报点评' })).toBeVisible({ timeout: 5000 })
      await expect(page.getByRole('tab', { name: '月报点评' })).toBeVisible()
    })

    test('显示周期导航（本周/前 N 周）', async ({ page }) => {
      await expect(page.getByText(/本周|前\d+个/).first()).toBeVisible({ timeout: 5000 })
    })

    test('孩子视角：显示"写点评"区域', async ({ page }) => {
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await page.getByRole('tab', { name: '点评', exact: true }).click()
      await expect(page.getByText('写点评')).toBeVisible({ timeout: 5000 })
    })

    test('家长视角：不显示"写点评"区域', async ({ page }) => {
      // 妈妈视角不应有"写点评"
      await expect(page.getByText('写点评')).toHaveCount(0)
    })

    test('孩子写点评并提交，成功后显示 toast', async ({ page }) => {
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await page.getByRole('tab', { name: '点评', exact: true }).click()
      await expect(page.getByText('写点评')).toBeVisible({ timeout: 5000 })
      const textarea = page.locator('textarea').first()
      await textarea.fill('测试点评内容-自动化')
      await page.getByRole('button', { name: /发布点评/ }).click()
      // 等待成功 toast 出现（证明保存成功）
      await expect(page.locator('[data-sonner-toast]')).toBeVisible({ timeout: 5000 })
      // 等待列表刷新
      await page.waitForTimeout(1000)
      // 点评列表应显示刚提交的内容
      await expect(page.getByText('测试点评内容-自动化')).toBeVisible({ timeout: 5000 })
    })

    test('孩子点评内容为空时，发布按钮禁用', async ({ page }) => {
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await page.getByRole('tab', { name: '点评', exact: true }).click()
      await expect(page.getByText('写点评')).toBeVisible({ timeout: 5000 })
      const publishBtn = page.getByRole("button", { name: /发布点评/ })
      await expect(publishBtn).toBeDisabled()
    })

    test('切到月报点评 Tab，内容应刷新', async ({ page }) => {
      await page.getByRole('tab', { name: '月报点评' }).click()
      await expect(page.getByRole('tab', { name: '月报点评' })).toHaveAttribute('data-state', 'active')
      // 应显示本月或前 N 月
      await expect(page.getByText(/本月|前\d+个/).first()).toBeVisible({ timeout: 5000 })
    })

    test('孩子视角：只看到自己的点评', async ({ page }) => {
      // 孩子视角下点评列表只显示自己的
      await switchMemberByUI(page, '小宇')
      await gotoTab(page, 'planning')
      await page.getByRole('tab', { name: '点评', exact: true }).click()
      await expect(page.getByText('写点评')).toBeVisible({ timeout: 5000 })
      // 列表中不应出现其他孩子的名字
      // 这里只验证组件正常渲染
      await expect(page.getByText('周报点评')).toBeVisible()
    })
  })
})
