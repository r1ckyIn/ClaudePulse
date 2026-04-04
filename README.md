<div align="center">

# ClaudePulse

[![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

**A macOS menu bar app that monitors ALL running Claude Code instances in real-time.**

[English](#english) | [中文](#中文)

</div>

---

## English

### Overview

ClaudePulse is a lightweight macOS menu bar application that provides real-time visibility into every running Claude Code session. It solves a key limitation in [ClaudeGlance](https://github.com/mbenhamd/claude-glance) where multiple Claude Code instances launched from the same directory are collapsed into a single entry. ClaudePulse reads the `session_id` directly from the Claude Code hook JSON payload — a value guaranteed unique per instance — instead of relying on TTY hashing.

### Features

- **True Multi-Instance Tracking** — Every Claude Code session gets its own entry, even when launched from the same folder
- **Real-Time Status** — Animated indicators show which sessions are active, idle, or stopped
- **7-Day Rolling Stats** — Tracks session activity over the past week
- **Anthropic Warm Aesthetic** — Cream (#faf9f5), warm orange (#d97757), soft blue (#6a9bcc), and olive green (#788c5d) color palette
- **Zero-Interference Design** — Hook reporter exits silently on failure and never blocks Claude Code

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Shell | Electron 33 |
| UI | React 19 + Tailwind CSS 4 |
| Language | TypeScript 5 |
| IPC | Unix socket (`/tmp/claude-pulse.sock`) + HTTP fallback (`localhost:19860-19870`) |
| Build | electron-vite + Electron Forge |
| Test | Vitest + Testing Library |

### Quick Start

```bash
# Clone and install
git clone git@github.com:r1ckyIn/ClaudePulse.git
cd ClaudePulse
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Install hooks (alternative to auto-install)
bash scripts/install.sh
```

### How It Works

1. **Hook Installation** — `scripts/install.sh` copies a reporter script to `~/.claude/hooks/` and registers it for `PreToolUse`, `PostToolUse`, `Notification`, and `Stop` events.
2. **Session Reporting** — When Claude Code fires a hook, the reporter (`claude-pulse-reporter.js`) reads stdin JSON, extracts the unique `session_id`, and forwards enriched data (project name, cwd, terminal, tool info) to ClaudePulse.
3. **IPC Transport** — The reporter first tries a Unix socket at `/tmp/claude-pulse.sock`. If that fails, it scans HTTP ports `19860`–`19870` on localhost. If both fail, it exits silently.
4. **Menu Bar UI** — The Electron main process listens on the socket/HTTP server, aggregates session state, and pushes updates to the React renderer displayed in the macOS menu bar.

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Claude Code Instance(s)                                │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ Session A │ │ Session B │ │ Session C │  ...          │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│       │ hook event  │            │                       │
└───────┼─────────────┼────────────┼───────────────────────┘
        ▼             ▼            ▼
   claude-pulse-reporter.js  (reads session_id from JSON)
        │             │            │
        └──────┬──────┘────────────┘
               ▼
   ┌───────────────────────┐
   │  Unix Socket / HTTP   │
   │  /tmp/claude-pulse.sock│
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │  Electron Main Process│
   │  (session aggregator) │
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │  React Menu Bar UI    │
   │  (Tailwind CSS)       │
   └───────────────────────┘
```

### Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start in development mode with hot reload |
| `pnpm build` | Build for production |
| `pnpm test` | Run tests with Vitest |
| `pnpm lint` | Lint with ESLint (zero warnings) |
| `pnpm typecheck` | TypeScript type check |
| `pnpm make` | Package as distributable (DMG/ZIP) |
| `bash scripts/install.sh` | Install hooks into Claude Code settings |
| `bash scripts/uninstall.sh` | Remove hooks from Claude Code settings |

---

## 中文

### 项目概述

ClaudePulse 是一款轻量级 macOS 菜单栏应用，可实时监控所有正在运行的 Claude Code 会话。它解决了 [ClaudeGlance](https://github.com/mbenhamd/claude-glance) 的一个核心限制——当多个 Claude Code 实例从同一目录启动时，只会显示一个条目。ClaudePulse 直接从 Claude Code Hook JSON 载荷中读取 `session_id`（每个实例保证唯一），而非依赖 TTY 哈希。

### 功能特点

- **真正的多实例追踪** — 每个 Claude Code 会话都有独立条目，即使从同一文件夹启动
- **实时状态显示** — 动画指示器展示会话的活跃、空闲或停止状态
- **7 天滚动统计** — 追踪过去一周的会话活动数据
- **Anthropic 暖色美学** — 奶油色 (#faf9f5)、暖橙色 (#d97757)、柔蓝色 (#6a9bcc)、橄榄绿 (#788c5d) 配色方案
- **零干扰设计** — Hook 上报器在失败时静默退出，绝不阻塞 Claude Code

### 技术栈

| 层级 | 技术 |
|------|------|
| 外壳 | Electron 33 |
| UI | React 19 + Tailwind CSS 4 |
| 语言 | TypeScript 5 |
| 进程通信 | Unix socket (`/tmp/claude-pulse.sock`) + HTTP 降级 (`localhost:19860-19870`) |
| 构建 | electron-vite + Electron Forge |
| 测试 | Vitest + Testing Library |

### 快速开始

```bash
# 克隆并安装
git clone git@github.com:r1ckyIn/ClaudePulse.git
cd ClaudePulse
pnpm install

# 开发模式
pnpm dev

# 构建
pnpm build

# 安装 hooks（手动方式）
bash scripts/install.sh
```

### 工作原理

1. **Hook 安装** — `scripts/install.sh` 将上报器脚本复制到 `~/.claude/hooks/`，并注册到 `PreToolUse`、`PostToolUse`、`Notification` 和 `Stop` 事件。
2. **会话上报** — 当 Claude Code 触发 hook 时，上报器 (`claude-pulse-reporter.js`) 从 stdin JSON 中读取唯一的 `session_id`，并将丰富的数据（项目名、工作目录、终端、工具信息）转发给 ClaudePulse。
3. **IPC 传输** — 上报器优先尝试 Unix socket (`/tmp/claude-pulse.sock`)，失败则扫描 localhost 的 HTTP 端口 `19860`–`19870`。若两者均失败，静默退出。
4. **菜单栏 UI** — Electron 主进程监听 socket/HTTP 服务器，聚合会话状态，并推送更新到 macOS 菜单栏中的 React 渲染器。

### 架构

```
┌─────────────────────────────────────────────────────────┐
│  Claude Code 实例                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                │
│  │ 会话 A   │ │ 会话 B   │ │ 会话 C   │  ...           │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘                │
│       │ hook 事件   │            │                       │
└───────┼─────────────┼────────────┼───────────────────────┘
        ▼             ▼            ▼
   claude-pulse-reporter.js（从 JSON 中读取 session_id）
        │             │            │
        └──────┬──────┘────────────┘
               ▼
   ┌───────────────────────┐
   │  Unix Socket / HTTP   │
   │  /tmp/claude-pulse.sock│
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │  Electron 主进程       │
   │  （会话聚合器）         │
   └───────────┬───────────┘
               ▼
   ┌───────────────────────┐
   │  React 菜单栏 UI      │
   │  (Tailwind CSS)       │
   └───────────────────────┘
```

### 可用脚本

| 脚本 | 说明 |
|------|------|
| `pnpm dev` | 以开发模式启动，支持热重载 |
| `pnpm build` | 生产环境构建 |
| `pnpm test` | 使用 Vitest 运行测试 |
| `pnpm lint` | ESLint 代码检查（零警告） |
| `pnpm typecheck` | TypeScript 类型检查 |
| `pnpm make` | 打包为可分发格式 (DMG/ZIP) |
| `bash scripts/install.sh` | 将 hooks 安装到 Claude Code 配置中 |
| `bash scripts/uninstall.sh` | 从 Claude Code 配置中移除 hooks |

---

## License

MIT License

## Author

**Ricky** - CS Student @ University of Sydney

[![GitHub](https://img.shields.io/badge/GitHub-r1ckyIn-181717?style=flat-square&logo=github)](https://github.com/r1ckyIn)
