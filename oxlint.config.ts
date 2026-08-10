import { defineConfig } from 'oxlint';

export default defineConfig({
    plugins: ['typescript', 'unicorn', 'oxc', 'import', 'node', 'promise'],
    categories: {
        correctness: 'error',
        restriction: 'error',
        suspicious: 'error',
        pedantic: 'error',
        style: 'error',
        perf: 'error'
    },
    env: {
        builtin: true,
        node: true
    },
    options: {
        typeAware: true,
        typeCheck: true,
        denyWarnings: true,
        reportUnusedDisableDirectives: 'error'
    },
    rules: {
        'typescript/array-type': ['error', { default: 'array-simple' }],
        'typescript/consistent-type-definitions': ['error', 'type'],
        'typescript/prefer-readonly-parameter-types': 'off',
        'typescript/explicit-module-boundary-types': 'off',
        'typescript/explicit-function-return-type': 'off',
        'typescript/strict-boolean-expressions': 'off',
        'typescript/promise-function-async': 'off',
        'typescript/no-unsafe-member-access': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-call': 'off',

        'eslint/max-lines-per-function': 'off',
        'eslint/prefer-destructuring': 'off',
        'eslint/no-duplicate-imports': 'off',
        'eslint/no-nested-ternary': 'off',
        'eslint/no-magic-numbers': 'off',
        'eslint/no-undefined': 'off',
        'eslint/no-continue': 'off',
        'eslint/no-console': 'off',
        'eslint/no-ternary': 'off',
        'eslint/max-statements': 'off',
        'eslint/sort-imports': 'off',
        'eslint/func-style': 'off',
        'eslint/id-length': 'off',
        'eslint/sort-keys': 'off',
        'eslint/no-void': 'off',
        'eslint/curly': 'off',

        'oxc/no-rest-spread-properties': 'off',
        'oxc/no-optional-chaining': 'off',
        'oxc/no-async-await': 'off',

        'import/consistent-type-specifier-style': 'off',
        'import/no-relative-parent-imports': 'off',
        'import/no-unassigned-import': 'off',
        'import/no-named-export': 'off',
        'import/prefer-default-export': 'off',
        'import/group-exports': 'off',
        'import/unambiguous': 'off',

        'promise/prefer-await-to-callbacks': 'off',
        'promise/prefer-await-to-then': 'off',

        'unicorn/prefer-query-selector': 'off',
        'unicorn/filename-case': 'off',
        'unicorn/no-useless-undefined': 'off',
        'unicorn/no-nested-ternary': 'off',
        'unicorn/no-null': 'off',

        'node/no-process-env': 'off'
    },
    overrides: [
        {
            files: ['**/*.config.*'],
            rules: { 'import/no-default-export': 'off' }
        },
        {
            files: ['src/db/migrate.ts'],
            rules: { 'import/no-nodejs-modules': 'off', 'node/no-top-level-await': 'off' }
        },
        {
            files: ['src/ingest/**'],
            rules: {
                'eslint/no-await-in-loop': 'off',
                'eslint/no-continue': 'off',
                'eslint/complexity': 'off',
                'eslint/max-depth': 'off',
                'eslint/eqeqeq': 'off',
                'eslint/no-eq-null': 'off',
                'eslint/max-lines': 'off',
                'eslint/max-params': 'off',
                'eslint/no-use-before-define': 'off',
                'unicorn/max-nested-calls': 'off',
                'node/no-top-level-await': 'off'
            }
        },
        {
            files: ['src/mcp/**'],
            rules: {
                'eslint/eqeqeq': 'off',
                'eslint/no-eq-null': 'off'
            }
        }
    ],
    ignorePatterns: ['node_modules/**', 'coverage/**', 'build/**', 'dist/**', 'data/**', 'temp/**', 'tmp/**', 'out/**']
});
