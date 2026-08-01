import js from '@eslint/js';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import perfectionist from 'eslint-plugin-perfectionist';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist',
      '**/build',
      '**/node_modules',
      '**/.turbo',
      'apps/server/drizzle',
      // Workout content is not part of any tsconfig project: it is source code
      // for a *different* program, materialised into a scratch workspace and
      // type-checked there. Linting it against this repo's rules is meaningless,
      // and deliberately broken starter files would fail anyway.
      'packages/workouts/content',
      'packages/workouts/scaffold',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommendedTypeChecked],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: [
          './apps/server/tsconfig.json',
          './apps/web/tsconfig.json',
          './packages/shared/tsconfig.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'jsx-a11y': jsxA11y,
      perfectionist,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          groups: [
            'side-effect',
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling', 'index'],
            'unknown',
          ],
        },
      ],
      'perfectionist/sort-named-imports': ['error', { type: 'natural' }],
      'perfectionist/sort-exports': ['error', { type: 'natural' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'no-console': 'error',
    },
  },
  // The CLIs and the seeder are terminal tools — console is their output channel.
  {
    files: ['apps/server/src/cli/**/*.ts', 'apps/server/src/seed/**/*.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Tests spy on and assert against console output from the code runner.
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  // Vitest cases are declared `async` uniformly whether or not a given one awaits,
  // so the suite reads consistently. Not worth churning to satisfy require-await.
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  },
  // shadcn/ui primitives: they export CVA variants alongside the component, and the
  // heading wrappers take their content from the caller, which jsx-a11y can't see.
  {
    files: ['apps/web/src/components/ui/**/*.tsx'],
    rules: {
      'jsx-a11y/heading-has-content': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
  // Config files sit outside every package tsconfig, so type-aware rules have no
  // program to run against.
  {
    files: ['*.js', '*.mjs', '**/scripts/*.mjs', '**/*.config.ts'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
  }
);
