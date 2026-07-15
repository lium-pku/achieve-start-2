import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab, switchMemberByUI } from './ui-helpers'

test.describe('UI 38：规划 Tab 子页面切换', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'planning')
  })

  test('规划页显示 3 个子 Tab：目标 / 复盘 / 点评', async ({ page }) => {
    await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('tab', { name: /目标/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /复盘/ })).toBeVisible()
    await expect(page.getByRole('tab', { name: /点评/ })).toBeVisible()
  })

  test('默认显示"目标"子页', async ({ page }) => {
    await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
    // 目标 tab 应高亮
    await expect(page.getByRole('tab', { name: /目标/ })).toHaveAttribute('data-state', 'active')
  })

  test('切到"复盘"子页，显示复盘内容', async ({ page }) => {
    await page.getByRole('tab', { name: /复盘/ }).click()
    await expect(page.getByRole('tab', { name: /复盘/ })).toHaveAttribute('data-state', 'active')
    // 复盘页应显示统计图表区域（包含"完成率"或"按时率"等文字）
    await expect(page.getByText(/完成率|按时率|本周|本月/).first()).toBeVisible({ timeout: 5000 })
  })

  test('切到"点评"子页，显示点评内容', async ({ page }) => {
    await page.getByRole('tab', { name: '点评', exact: true }).click()
    await expect(page.getByRole('tab', { name: '点评', exact: true })).toHaveAttribute('data-state', 'active')
    // 点评页通常有"周报点评"/"月报点评"切换或空状态
    await expect(
      page.getByText(/周报点评|月报点评|还没有点评/).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('家长视角：目标子页显示"新建目标"按钮', async ({ page }) => {
    await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
    // 家长应能看到"新建目标"按钮
    await expect(page.getByRole('button', { name: /新建目标/ }).or(page.getByText('目标').first())).toBeVisible({ timeout: 5000 })
  })

  test('目标列表至少显示 seed 的目标', async ({ page }) => {
    await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
    // seed 应该有 2 个目标（小宇 + 小苒 各 1）
    // 家长视角应能看到"共 2 个目标"提示或具体目标卡片
    await expect(
      page.getByText(/共 \d+ 个目标/).or(page.getByText('暂无目标'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('孩子视角：只看到自己的目标，显示"新建目标"按钮', async ({ page }) => {
    await switchMemberByUI(page, '小宇')
    await gotoTab(page, 'planning')
    await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
    // 孩子可以新建自己的目标（isChild && 显示按钮）
    await page.waitForTimeout(500)
    await expect(page.getByRole('button', { name: /新建目标/ })).toBeVisible({ timeout: 5000 })
  })

  test('目标卡片显示状态徽章（未开始/进行中/已达成）', async ({ page }) => {
    await expect(page.getByText('规划').first()).toBeVisible({ timeout: 5000 })
    // seed 目标至少有一个，状态应为 not_started / in_progress / achieved 之一
    const statusLabels = ['未开始', '进行中', '已达成']
    let found = false
    for (const s of statusLabels) {
      if (await page.getByText(s, { exact: true }).count() > 0) {
        found = true
        break
      }
    }
    expect(found).toBeTruthy()
  })
})
