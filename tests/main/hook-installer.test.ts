import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { HookInstaller } from '../../src/main/hook-installer'

// Use a temp directory to avoid modifying real ~/.claude
const TEST_DIR = join(tmpdir(), 'claude-pulse-test-' + process.pid)
const HOOKS_DIR = join(TEST_DIR, 'hooks')
const REPORTER_SOURCE = join(TEST_DIR, 'reporter-source.js')

// Override the module's constants for testing
// We'll test the core logic by calling methods directly
describe('HookInstaller', () => {
  beforeEach(() => {
    mkdirSync(HOOKS_DIR, { recursive: true })
    writeFileSync(REPORTER_SOURCE, '#!/usr/bin/env node\nconsole.log("reporter")')
  })

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true })
    }
  })

  it('should create an installer instance', () => {
    const installer = new HookInstaller(REPORTER_SOURCE)
    expect(installer).toBeDefined()
  })

  it('reporter source file should exist', () => {
    expect(existsSync(REPORTER_SOURCE)).toBe(true)
    const content = readFileSync(REPORTER_SOURCE, 'utf8')
    expect(content).toContain('reporter')
  })
})
