import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    rules: {
      'no-console': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage'],
    },
    languageOptions: {
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
      },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'vite.config.ts',
      'eslint.config.mjs',
      'postcss.config.js',
      'tailwind.config.mjs',
      'tailwind.config.js',
      'src/__tests__/**',
      'src/test/**',
      'src/components/AnamneseTemplateManager.tsx',
      'src/hooks/useAnamneseTemplates.ts',
      'src/pages/AnamneseTemplatesPage.tsx',
      'src/pages/medico/index.tsx'
    ],
  }
);
