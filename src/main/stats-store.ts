import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import type { DayStats } from '../shared/types'

const ROLLING_DAYS = 7
const STATS_FILENAME = 'stats.json'

export class StatsStore {
  private stats: DayStats[] = []
  private filePath: string

  constructor(filePath?: string) {
    this.filePath = filePath || join(app.getPath('userData'), STATS_FILENAME)
    this.load()
  }

  recordToolCall(toolName: string): void {
    const today = this.todayKey()
    const day = this.getOrCreateDay(today)

    day.toolCalls++
    day.toolBreakdown[toolName] = (day.toolBreakdown[toolName] || 0) + 1

    this.save()
  }

  recordSession(durationMs: number): void {
    const today = this.todayKey()
    const day = this.getOrCreateDay(today)

    day.sessionCount++
    day.totalDurationMs += durationMs

    this.save()
  }

  getStats(): DayStats[] {
    this.pruneOldDays()
    return [...this.stats]
  }

  getTodayStats(): DayStats | null {
    const today = this.todayKey()
    return this.stats.find((d) => d.date === today) || null
  }

  private getOrCreateDay(date: string): DayStats {
    let day = this.stats.find((d) => d.date === date)

    if (!day) {
      day = {
        date,
        sessionCount: 0,
        toolCalls: 0,
        toolBreakdown: {},
        totalDurationMs: 0,
      }
      this.stats.push(day)
      this.pruneOldDays()
    }

    return day
  }

  private pruneOldDays(): void {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - ROLLING_DAYS)
    const cutoffStr = cutoff.toISOString().slice(0, 10)

    this.stats = this.stats.filter((d) => d.date >= cutoffStr)
  }

  private todayKey(): string {
    return new Date().toISOString().slice(0, 10)
  }

  private load(): void {
    try {
      if (existsSync(this.filePath)) {
        this.stats = JSON.parse(readFileSync(this.filePath, 'utf8'))
      }
    } catch {
      this.stats = []
    }
    this.pruneOldDays()
  }

  private save(): void {
    try {
      writeFileSync(this.filePath, JSON.stringify(this.stats, null, 2), 'utf8')
    } catch {
      // Silent fail — stats are non-critical
    }
  }
}
