import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/renderer/**'],
    // Tests share a Unix socket, must run sequentially
    fileParallelism: false,
    testTimeout: 10000,
  },
})
