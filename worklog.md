---
Task ID: UI-TESTS-1
Agent: main
Task: 加入 Playwright UI 测试，并基于"测试疏漏"教训补充 agent 开发规则

Work Log:
- 探索 tests/ 目录：发现 31 个 spec 全部是 API 测试（fetch 调用），0 个 UI 测试
- 探索 src/components/ 下所有组件（app-shell、5 个 tab、5 个 dialog、member-switcher、pending-verification-panel），梳理每个组件需要 UI 覆盖的渲染分支
- 创建 tests/ui-helpers.ts：提供 uiLoginFast / uiLoginByClick / gotoTab / switchMemberByUI / uiResetAndSeed 等 UI 层 helper
- 关键决策：不用 page.addInitScript（会污染后续 goto，导致"未登录"测试无法回到登录页），改用 goto + evaluate + reload 模式
- 创建 8 个 UI 测试 spec：
  - 32-ui-login.spec.ts（6 tests）：登录页交互、3 个快速按钮、回车登录、错误码、空码禁用
  - 33-ui-shell-nav.spec.ts（10 tests）：5 个 Tab 切换、MemberSwitcher、家长/孩子角色 UI 差异
  - 34-ui-home-tab.spec.ts（15 tests）：欢迎卡、统计数字、活动状态 Badge、打卡/代打卡流程、孩子切换胶囊、可代打卡徽章、积分里程碑
  - 35-ui-schedule-tab.spec.ts（11 tests）：网格/列表切换、daily/weekly/monthly 子 Tab、编辑/删除按钮角色权限、新建对话框、删除确认
  - 36-ui-rewards-tab.spec.ts（11 tests）：积分卡片、兑换商店/审核记录 Tab、积分不足/立即兑换按钮、pending 数量徽章、家长审核按钮
  - 37-ui-family-tab.spec.ts（11 tests）：4 个成员卡片、当前徽章、积分流水、使用说明、添加/编辑成员对话框
  - 38-ui-planning-tab.spec.ts（8 tests）：3 个子 Tab 切换、目标列表、状态徽章、孩子角色不能新建目标
  - 39-ui-pending-panel.spec.ts（5 tests）：空状态、孩子不可见、家长通过/拒绝流程、勾选计数
- 修复迭代中发现的 locator 问题：
  - "已审核"既出现在"已审核积分"也出现在统计卡片 → 用 { exact: true }
  - "点评"父 Tab 匹配到"周报点评"子 Tab → 用 { exact: true }
  - div filter 命中嵌套元素 → 改用 .card-pressable 类
  - ToggleGroupItem 不是标准 button role → 改用 getByText 定位
  - reload 后会回到首页 Tab → 测试中 reload 后需重新 gotoTab
- 重写 CLAUDE.md：新增"测试覆盖检查清单"、"新增前端组件时"、"测试疏漏排查"、"UI 测试编写规范"四个章节
- 全部 77 个 UI 测试 sequential 运行通过（4.6 min）

Stage Summary:
- 新增 8 个 UI 测试 spec，共 77 个测试用例，覆盖所有用户可见行为
- 新增 tests/ui-helpers.ts 作为 UI 测试通用入口
- CLAUDE.md 升级为强制双层覆盖规范：API 测试 + UI 测试必须同时存在
- 关键教训写入 CLAUDE.md：API 返回正确 ≠ UI 渲染正确，必须用 Playwright page 测试前端

---
Task ID: DAY-SWIPE-1
Agent: main
Task: 日程网格日视图支持左右滑动切换日期

Work Log:
- 发现现有 TimeGridView 已有 selectedDate state 和左右箭头按钮，但 schedule-tab 始终用 ?today=1 拉数据，切换日期不会重新加载
- API 已支持 ?date=YYYY-MM-DD 参数，无需改后端
- 改动 schedule-tab.tsx：
  - 把 selectedDate state 从 TimeGridView 提升到 schedule-tab
  - loadGrid 改用 ?date= 参数拉指定日期活动
  - log 拉取天数根据选中日期动态计算（支持往前翻页看历史）
  - 传 selectedDate + onSelectedDateChange 给 TimeGridView
- 改动 time-grid-view.tsx：
  - 移除内部 selectedDate state，改用 props
  - 新增 swipe handlers（pointerdown/move/up），50px 阈值，水平滑动占主导才触发
  - 与活动拖拽冲突处理：检查 dragStateRef.current?.moved，只在真正垂直拖拽时取消滑动
  - 滑动过程有 translateX 视觉反馈（0.3 倍偏移），松手后 300ms 过渡回弹
  - touch-action: pan-y 让垂直滚动不受影响
  - 空状态也加了"← 左右滑动查看其他日期 →"提示
- 新增 tests/40-ui-day-swipe.spec.ts（8 tests）：
  - 默认显示今天日期
  - 箭头按钮切换日期
  - "回到今天"按钮
  - 左滑切下一天、右滑切前一天（用 evaluate dispatch PointerEvent，比 page.mouse 更可靠）
  - 小幅度滑动不触发
  - 切换日期后活动列表刷新
- 全部 8 个新测试 + 11 个旧 schedule 测试 + API 测试均通过

Stage Summary:
- 日视图现在支持 touch 左右滑动切换日期，50px 阈值，有滑动反馈动画
- 日期切换后活动列表自动刷新（之前切换日期不刷新数据是个隐藏 bug）
- 家长拖动活动条与滑动不冲突
- 新增 8 个 UI 测试覆盖滑动功能

---
Task ID: CAROUSEL-PRELOAD-1
Agent: main
Task: 日视图轮播改造 + 预加载前后天，让滑动过程能直接看到相邻日期内容

Work Log:
- 之前的实现：滑动只是当前面板的 translateX 反馈，相邻日期内容不存在，滑动看不到"前一天/后一天"
- 改为 3-panel 轮播结构：prev / current / next 三个面板横向排列，track 宽度 300%，translateX(-33.333%) 默认显示中间
- schedule-tab.tsx 改造：
  - 用 dayData state 替换 allActivities + todayLogs，包含 prev/current/next 三天的 activities + logs
  - fetchDayData helper 拉单天数据
  - loadGrid 用 Promise.all 并行拉 3 天，提升加载速度
  - dayData.date 字段记录数据属于哪个日期，用于轮播无闪烁切换
- time-grid-view.tsx 改造：
  - 提取 renderDayPanel(panelActivities, panelLogs, panelDate, isCurrent) 函数，3 个面板共用
  - renderBar 接收 panelLogs + panelRangeStart 参数，避免硬依赖外部变量
  - 轮播容器 .schedule-day-view > .schedule-day-carousel-track > .schedule-day-panel * 3
  - 滑动时 translateX 跟手（阻尼 0.6），松手后 snap 到 ±panelWidth
  - 关键防闪烁：snap 后不立即重置 swipeOffset，等父组件新数据到达（dataDate === selectedDate）后再重置
  - animating 状态控制 transition 启用，防止跟手时有延迟
  - 测量 panelWidth（carouselRef.offsetWidth）+ resize 监听
- 修复编译错误：
  - useEffect 未导入
  - 周视图导航误用 setSelectedDate（应改为 onSelectedDateChange，因为 selectedDate 现在是受控 prop）
- 新增 3 个测试：
  - 轮播结构：3 个 .schedule-day-panel 子元素存在
  - 预加载：滑动过程中不出现"加载中..."（证明数据已预加载）
  - 连续滑动：今天 → 明天 → 后天，每次滑动都能成功切换
- 全部 11 个 swipe 测试 + 11 个 schedule 测试 + 6 个 API 测试通过

Stage Summary:
- 日视图现在是真正的 3-panel 轮播，滑动过程能看到相邻日期的真实内容（不是空白或 loading）
- 预加载让滑动体验流畅，无闪烁
- snap 动画 + dataDate 同步机制保证切换日期时无内容跳变

---
Task ID: TEST-COMPLETION-1
Agent: main
Task: 补全测试，特别是 Playwright UI 测试

Work Log:
- 排查测试覆盖缺口：发现 5 个 dialog 组件、活动详情对话框、网格视图角色权限、规划子 Tab CRUD、奖励完整流程、边缘场景、API 日期过滤边界均缺乏 UI 测试
- 修复了 carousel 重构遗留的 TypeScript 编译错误（specificDate 类型、setSelectedDate 引用、todayLogs 引用）
- 新增 7 个测试文件（共 ~120 个测试用例）：
  - 41-ui-dialogs.spec.ts（27 tests）：5 个 dialog（活动/奖励/成员/目标/鼓励）的表单填写、校验、提交、编辑预填、取消关闭、周期类型切换、图标选择、实时预览
  - 42-ui-activity-detail.spec.ts（9 tests）：活动详情对话框（标题/时间/积分/状态徽章/编辑入口/角色权限/Esc 关闭/周期标签）
  - 43-ui-time-grid-roles.spec.ts（13 tests）：网格视图角色权限（GripVertical 拖动手柄/可拖动提示/成员选择胶囊/扣分检查/图例）+ 周视图（7 天列表/点击切回日视图/高亮今天）
  - 44-ui-planning-subtabs.spec.ts（19 tests）：目标（新建按钮/状态切换/删除确认/分组/编辑权限）、复盘（图表/成员切换/周期导航/积分汇总）、点评（周报月报 Tab/写点评/发布/空内容禁用/孩子只看自己）
  - 45-ui-rewards-flow.spec.ts（6 tests）：完整兑换流程（兑换→通过→兑现→状态变化）、拒绝流程、积分扣减、pending 徽章、已兑现不可操作、孩子无操作按钮
  - 46-ui-edge-cases.spec.ts（13 tests）：加载状态、未登录回登录页、token 失效、空数据不崩溃、空奖励/空流水/空目标、快速切换 Tab/成员、Esc 关闭、多家庭隔离、网络错误、活动详情
  - 47-api-date-filter.spec.ts（11 tests）：?date= 参数边界（今天/明天/昨天/跨月/跨年/startDate 限制）、weekly/monthly/once 按周期过滤、endDate 过期、公共活动对所有孩子可见
- 修复了 test 38 的错误断言（"孩子不显示新建目标按钮" → 实际上 isChild && 显示按钮，已修正为"显示"）
- 修复了多个定位器问题：
  - ToggleGroupItem 文字有空白 → 用 button:has-text() 代替 getByText(exact)
  - Radix Select 下拉项在 portal 中 → 用 [role="option"] 定位
  - .or() 链匹配多元素 → 加 .first()
  - 多家庭隔离：每个新家庭默认有"小宇"，改用"小苒"区分
- 各文件单独运行均通过

Stage Summary:
- 新增 7 个测试文件，约 120 个测试用例
- 覆盖了所有 dialog 表单交互、活动详情、网格视图角色权限、规划子 Tab、奖励完整流程、边缘场景、API 日期过滤
- 修复了 carousel 重构遗留的 TS 编译错误
- 修正了 test 38 的错误断言
- 总测试文件数：47（API 31 + UI 16）
