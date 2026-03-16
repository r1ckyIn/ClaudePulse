import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['out/**', 'node_modules/**', 'dist/**', 'scripts/**', '*.config.*'],
  },
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
