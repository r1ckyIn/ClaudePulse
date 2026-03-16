import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { writeFileSync, existsSync, rmSync, mkdirSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

// Mock electron app module
vi.mock('electron', () => ({
  app: {
    getPath: () => join(tmpdir(), 'claude-pulse-test-stats-' + process.pid),
  },
}))

import { StatsStore } from '../../src/main/stats-store'

const testDir = join(tmpdir(), 'claude-pulse-test-stats-' + process.pid)
const testFile = join(testDir, 'stats.json')

describe('StatsStore', () => {
  beforeEach(() => {
    mkdirSync(testDir, { recursive: true })
  })

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  it('should initialize with empty stats', () => {
    const store = new StatsStore(testFile)
    expect(store.getStats()).toEqual([])
  })

  it('should record tool calls', () => {
    const store = new StatsStore(testFile)
    store.recordToolCall('Read')
    store.recordToolCall('Read')
    store.recordToolCall('Edit')

    const today = store.getTodayStats()
    expect(today).not.toBeNull()
    expect(today!.toolCalls).toBe(3)
    expect(today!.toolBreakdown['Read']).toBe(2)
    expect(today!.toolBreakdown['Edit']).toBe(1)
  })

  it('should record sessions', () => {
    const store = new StatsStore(testFile)
    store.recordSession(60000)
    store.recordSession(30000)

    const today = store.getTodayStats()
    expect(today!.sessionCount).toBe(2)
    expect(today!.totalDurationMs).toBe(90000)
  })

  it('should persist and reload stats', () => {
    const store1 = new StatsStore(testFile)
    store1.recordToolCall('Bash')
    store1.recordSession(120000)

    const store2 = new StatsStore(testFile)
    const today = store2.getTodayStats()
    expect(today!.toolCalls).toBe(1)
    expect(today!.sessionCount).toBe(1)
  })

  it('should handle corrupted stats file', () => {
    writeFileSync(testFile, 'not-json{{{')
    const store = new StatsStore(testFile)
    expect(store.getStats()).toEqual([])
  })

  it('should return null for today when no stats recorded', () => {
    const store = new StatsStore(testFile)
    expect(store.getTodayStats()).toBeNull()
  })
})
