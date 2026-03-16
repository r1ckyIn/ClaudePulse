# ClaudePulse

## Vision
A macOS menu bar app that monitors ALL running Claude Code instances in real-time, fixing ClaudeGlance's limitation where same-folder instances are conflated.

## Problem
ClaudeGlance uses TTY-based session ID hashing, causing multiple Claude Code instances in the same directory to appear as one. Users running Agent Teams or parallel Claude Code sessions cannot see all their instances.

## Solution
Read `session_id` directly from Claude Code's hook payload JSON (guaranteed unique per instance). Display each instance as a separate card in an Anthropic-styled floating popover.

## Tech Stack
Electron 33 + React 19 + TypeScript 5 + Tailwind CSS 4 + electron-vite

## Success Criteria
- All running Claude Code instances visible regardless of folder
- Anthropic warm aesthetic (cream, warm orange, paper feel)
- Easy one-click installation on macOS
- Coexists with ClaudeGlance without conflicts
