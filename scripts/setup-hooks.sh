#!/usr/bin/env bash
# 安装 git hooks 到 .git/hooks/
# 用法：bash scripts/setup-hooks.sh
#
# 安装后 hooks 会强制执行：
#   - pre-commit: tsc + eslint + 文档/测试同步检查
#   - commit-msg: 禁止 UUID 格式 commit message
#   - pre-push: 跑全量 Playwright 测试
#
# 跳过方式：git commit/push --no-verify

set -e

HOOKS_DIR=".git/hooks"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)/hooks"

echo "📦 安装 git hooks..."
echo "   源目录：$SCRIPT_DIR"
echo "   目标目录：$HOOKS_DIR"
echo ""

# 确保 .git/hooks 存在
mkdir -p "$HOOKS_DIR"

# 安装每个 hook
for hook in pre-commit commit-msg pre-push; do
  src="$SCRIPT_DIR/$hook"
  dst="$HOOKS_DIR/$hook"

  if [ ! -f "$src" ]; then
    echo "❌ 源文件不存在：$src"
    exit 1
  fi

  cp "$src" "$dst"
  chmod +x "$dst"
  echo "  ✅ 已安装 $hook"
done

echo ""
echo "🎉 git hooks 安装完成！"
echo ""
echo "钩子行为："
echo "  pre-commit:  tsc 类型检查 + eslint + 文档/测试同步警告"
echo "  commit-msg:  禁止 UUID 格式，要求至少 10 字符"
echo "  pre-push:    跑全量 Playwright 测试（~5-8 分钟）"
echo ""
echo "跳过方式（紧急情况）："
echo "  git commit --no-verify     # 跳过 pre-commit + commit-msg"
echo "  git push --no-verify       # 跳过 pre-push"
echo "  SKIP_TESTS=1 git push      # 跳过 pre-push 测试"
echo ""
echo "重新安装（更新 hooks 后）："
echo "  bash scripts/setup-hooks.sh"
