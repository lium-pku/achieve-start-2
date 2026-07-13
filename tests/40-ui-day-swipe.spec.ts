import { test, expect } from '@playwright/test'
import { uiLoginFast, uiResetAndSeed, gotoTab } from './ui-helpers'

test.describe('UI 40：日程网格日视图左右滑动切换日期', () => {
  test.beforeEach(async ({ page }) => {
    await uiResetAndSeed(page, 'test-mom')
    await uiLoginFast(page, 'test-mom')
    await gotoTab(page, 'schedule')
    // 确保在网格视图（默认就是）
    await expect(page.getByText('日程管理')).toBeVisible({ timeout: 5000 })
  })

  test('日视图默认显示今天日期', async ({ page }) => {
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 5000 })
  })

  test('点击右上角箭头切换到下一天，日期标签更新', async ({ page }) => {
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 5000 })

    // 点击右箭头（下一天）
    const nextBtn = page.locator('button:has(svg.lucide-chevron-right)').first()
    await nextBtn.click()

    // 日期应变为明天
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowLabel = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`
    await expect(page.getByText(tomorrowLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })
  })

  test('点击左上角箭头切换到前一天，日期标签更新', async ({ page }) => {
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 5000 })

    // 点击左箭头（前一天）
    const prevBtn = page.locator('button:has(svg.lucide-chevron-left)').first()
    await prevBtn.click()

    // 日期应变为昨天
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayLabel = `${yesterday.getMonth() + 1}月${yesterday.getDate()}日`
    await expect(page.getByText(yesterdayLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })
  })

  test('非今天时显示"回到今天"按钮，点击后回到今天', async ({ page }) => {
    // 先切到明天
    await page.locator('button:has(svg.lucide-chevron-right)').first().click()
    // 应出现"回到今天"
    await expect(page.getByText('回到今天')).toBeVisible({ timeout: 3000 })
    // 点击
    await page.getByText('回到今天').click()
    // 应回到今天的日期
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })
    // "回到今天"应消失
    await expect(page.getByText('回到今天')).toHaveCount(0)
  })

  test('左滑（touch swipe left）切换到下一天', async ({ page }) => {
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 5000 })

    // 找到日视图的时间轴卡片容器
    const dayCard = page.locator('.schedule-day-view').first()
    await expect(dayCard).toBeVisible({ timeout: 5000 })

    // 用 evaluate 直接 dispatch PointerEvent，比 page.mouse 更可靠
    await dayCard.evaluate((el: HTMLElement, { direction }: any) => {
      const rect = el.getBoundingClientRect()
      const startX = direction === 'left' ? rect.x + rect.width * 0.7 : rect.x + rect.width * 0.3
      const endX = direction === 'left' ? rect.x + rect.width * 0.3 : rect.x + rect.width * 0.7
      const midY = rect.y + rect.height / 2
      const pid = 1

      el.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true,
        clientX: startX, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1,
      }))
      // 分 10 步移动
      for (let i = 1; i <= 10; i++) {
        const x = startX + (endX - startX) * (i / 10)
        el.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, cancelable: true,
          clientX: x, clientY: midY,
          pointerId: pid, pointerType: 'touch', isPrimary: true, buttons: 1,
        }))
      }
      el.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true,
        clientX: endX, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: 0,
      }))
    }, { direction: 'left' })

    // 日期应变为明天
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowLabel = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`
    await expect(page.getByText(tomorrowLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })
  })

  test('右滑（touch swipe right）切换到前一天', async ({ page }) => {
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 5000 })

    const dayCard = page.locator('.schedule-day-view').first()
    await expect(dayCard).toBeVisible({ timeout: 5000 })

    await dayCard.evaluate((el: HTMLElement, { direction }: any) => {
      const rect = el.getBoundingClientRect()
      const startX = direction === 'left' ? rect.x + rect.width * 0.7 : rect.x + rect.width * 0.3
      const endX = direction === 'left' ? rect.x + rect.width * 0.3 : rect.x + rect.width * 0.7
      const midY = rect.y + rect.height / 2
      const pid = 1

      el.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true,
        clientX: startX, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1,
      }))
      for (let i = 1; i <= 10; i++) {
        const x = startX + (endX - startX) * (i / 10)
        el.dispatchEvent(new PointerEvent('pointermove', {
          bubbles: true, cancelable: true,
          clientX: x, clientY: midY,
          pointerId: pid, pointerType: 'touch', isPrimary: true, buttons: 1,
        }))
      }
      el.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true,
        clientX: endX, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: 0,
      }))
    }, { direction: 'right' })

    // 日期应变为昨天
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayLabel = `${yesterday.getMonth() + 1}月${yesterday.getDate()}日`
    await expect(page.getByText(yesterdayLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })
  })

  test('滑动幅度太小不触发日期切换', async ({ page }) => {
    const now = new Date()
    const todayLabel = `${now.getMonth() + 1}月${now.getDate()}日`
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 5000 })

    const dayCard = page.locator('.schedule-day-view').first()
    await expect(dayCard).toBeVisible({ timeout: 5000 })

    // 小幅度滑动（仅 10px，低于 50px 阈值）
    await dayCard.evaluate((el: HTMLElement) => {
      const rect = el.getBoundingClientRect()
      const centerX = rect.x + rect.width / 2
      const midY = rect.y + rect.height / 2
      const pid = 1
      el.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true,
        clientX: centerX - 5, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1,
      }))
      el.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, cancelable: true,
        clientX: centerX + 5, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, buttons: 1,
      }))
      el.dispatchEvent(new PointerEvent('pointerup', {
        bubbles: true, cancelable: true,
        clientX: centerX + 5, clientY: midY,
        pointerId: pid, pointerType: 'touch', isPrimary: true, button: 0, buttons: 0,
      }))
    })

    // 日期应仍然是今天
    await expect(page.getByText(todayLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })
  })

  test('切换日期后活动列表应刷新（不同日期活动可能不同）', async ({ page }) => {
    // 点击右箭头到明天
    await page.locator('button:has(svg.lucide-chevron-right)').first().click()
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowLabel = `${tomorrow.getMonth() + 1}月${tomorrow.getDate()}日`
    await expect(page.getByText(tomorrowLabel, { exact: false }).first()).toBeVisible({ timeout: 3000 })

    // 等待加载完成
    await expect(page.getByText('加载中...', { exact: true })).toHaveCount(0, { timeout: 5000 })

    // 说明条应显示明天的日期 + 活动数量
    await expect(page.getByText(/时间轴/)).toBeVisible({ timeout: 5000 })
  })
})
