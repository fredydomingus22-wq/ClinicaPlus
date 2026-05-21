import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'warn',
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        process: 'readonly',
        __dirname: 'readonly',
      },
    }
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'vitest.config.ts', 'eslint.config.mjs'],
  },
  {
    files: ['src/**/*.test.ts', 'src/**/__tests__/**/*.ts', 'src/scripts/**/*.ts', 'src/debug-*.ts'],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
    }
  },
);
