# ClaudePulse Roadmap

## Milestone 1: MVP (v0.1.0)

### Phase 1: Core Infrastructure ✅ IN PROGRESS
- Electron + React + TypeScript scaffolding
- IPC server (Unix socket + HTTP fallback)
- Menu bar tray icon + empty popover window
- Shared types and constants

### Phase 2: Session Tracking + Hook Integration
- Session state machine with multi-instance support
- Node.js hook reporter (reads session_id from stdin JSON)
- Auto hook installer for ~/.claude/settings.json
- contextBridge preload for renderer IPC

### Phase 3: UI Design + Anthropic Aesthetic
- Design tokens from frontend_brief.md
- SessionCard, StatusIndicator, SessionList components
- Animated status indicators (6 states)
- StatsDashboard with 7-day rolling stats
- EmptyState view

### Phase 4: Distribution + Polish
- Electron Forge DMG packaging
- install.sh / uninstall.sh scripts
- Settings view (launch at login, auto-hide)
- README (bilingual EN + CN)
- GitHub Actions CI
