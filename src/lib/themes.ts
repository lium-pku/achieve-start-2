/**
 * 主题预设方案
 *
 * 每套主题定义 primary（主色）、accent（强调色）、ring（聚焦环）、chart-1（图表色）等 CSS 变量值。
 * 切换成员时，根据 member.theme（主题 key）应用对应的 CSS 变量到 :root。
 *
 * 颜色用 oklch 格式（与 globals.css 一致），保证感知亮度统一。
 */

export interface ThemePreset {
  key: string
  name: string
  emoji: string
  /** 头像背景色（HEX，兼容旧 color 字段） */
  color: string
  /** CSS 变量覆盖（应用到 :root） */
  vars: Record<string, string>
}

// 6 套预设主题
export const THEME_PRESETS: ThemePreset[] = [
  {
    key: 'orange',
    name: '活力橙',
    emoji: '🟠',
    color: '#FF9A3C',
    vars: {
      '--primary': 'oklch(0.72 0.18 50)',
      '--primary-foreground': 'oklch(0.99 0 0)',
      '--ring': 'oklch(0.72 0.18 50)',
      '--chart-1': 'oklch(0.72 0.18 50)',
      '--sidebar-primary': 'oklch(0.72 0.18 50)',
      '--sidebar-ring': 'oklch(0.72 0.18 50)',
    },
  },
  {
    key: 'pink',
    name: '甜美粉',
    emoji: '🌸',
    color: '#EC4899',
    vars: {
      '--primary': 'oklch(0.65 0.24 350)',
      '--primary-foreground': 'oklch(0.99 0 0)',
      '--ring': 'oklch(0.65 0.24 350)',
      '--chart-1': 'oklch(0.65 0.24 350)',
      '--sidebar-primary': 'oklch(0.65 0.24 350)',
      '--sidebar-ring': 'oklch(0.65 0.24 350)',
    },
  },
  {
    key: 'green',
    name: '清新绿',
    emoji: '🌿',
    color: '#10B981',
    vars: {
      '--primary': 'oklch(0.6 0.18 145)',
      '--primary-foreground': 'oklch(0.99 0 0)',
      '--ring': 'oklch(0.6 0.18 145)',
      '--chart-1': 'oklch(0.6 0.18 145)',
      '--sidebar-primary': 'oklch(0.6 0.18 145)',
      '--sidebar-ring': 'oklch(0.6 0.18 145)',
    },
  },
  {
    key: 'blue',
    name: '天空蓝',
    emoji: '💙',
    color: '#3B82F6',
    vars: {
      '--primary': 'oklch(0.62 0.19 250)',
      '--primary-foreground': 'oklch(0.99 0 0)',
      '--ring': 'oklch(0.62 0.19 250)',
      '--chart-1': 'oklch(0.62 0.19 250)',
      '--sidebar-primary': 'oklch(0.62 0.19 250)',
      '--sidebar-ring': 'oklch(0.62 0.19 250)',
    },
  },
  {
    key: 'purple',
    name: '梦幻紫',
    emoji: '🔮',
    color: '#8B5CF6',
    vars: {
      '--primary': 'oklch(0.58 0.22 290)',
      '--primary-foreground': 'oklch(0.99 0 0)',
      '--ring': 'oklch(0.58 0.22 290)',
      '--chart-1': 'oklch(0.58 0.22 290)',
      '--sidebar-primary': 'oklch(0.58 0.22 290)',
      '--sidebar-ring': 'oklch(0.58 0.22 290)',
    },
  },
  {
    key: 'red',
    name: '热情红',
    emoji: '🍎',
    color: '#EF4444',
    vars: {
      '--primary': 'oklch(0.62 0.24 25)',
      '--primary-foreground': 'oklch(0.99 0 0)',
      '--ring': 'oklch(0.62 0.24 25)',
      '--chart-1': 'oklch(0.62 0.24 25)',
      '--sidebar-primary': 'oklch(0.62 0.24 25)',
      '--sidebar-ring': 'oklch(0.62 0.24 25)',
    },
  },
]

// 默认主题（兼容旧数据：color 字段映射到最近的主题）
export const DEFAULT_THEME = 'orange'

/** 根据主题 key 获取预设 */
export function getThemePreset(key: string | null | undefined): ThemePreset {
  if (!key) return THEME_PRESETS[0]
  return THEME_PRESETS.find((t) => t.key === key) || THEME_PRESETS[0]
}

/** 根据 HEX color 反查主题（兼容旧数据，seed 成员 color=#FF9A3C → orange） */
export function guessThemeByColor(color: string | null | undefined): string {
  if (!color) return DEFAULT_THEME
  const found = THEME_PRESETS.find((t) => t.color.toLowerCase() === color.toLowerCase())
  return found ? found.key : DEFAULT_THEME
}

/** 将主题变量应用到 document root */
export function applyTheme(themeKey: string | null | undefined) {
  if (typeof document === 'undefined') return
  const preset = getThemePreset(themeKey)
  const root = document.documentElement
  for (const [varName, value] of Object.entries(preset.vars)) {
    root.style.setProperty(varName, value)
  }
}

/** 清除主题变量（恢复默认） */
export function clearTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  for (const preset of THEME_PRESETS) {
    for (const varName of Object.keys(preset.vars)) {
      root.style.removeProperty(varName)
    }
  }
}
