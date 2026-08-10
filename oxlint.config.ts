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
        'typescript/no-unsafe-member-access': 'off',
        'typescript/promise-function-async': 'off',
        'typescript/no-unsafe-assignment': 'off',
        'typescript/no-unsafe-call': 'off',

        'eslint/max-lines-per-function': 'off',
        'eslint/no-duplicate-imports': 'off',
        'eslint/no-use-before-define': 'off',
        'eslint/prefer-destructuring': 'off',
        'eslint/no-nested-ternary': 'off',
        'eslint/no-await-in-loop': 'off',
        'eslint/no-magic-numbers': 'off',
        'eslint/max-statements': 'off',
        'eslint/no-undefined': 'off',
        'eslint/sort-imports': 'off',
        'eslint/no-continue': 'off',
        'eslint/complexity': 'off',
        'eslint/func-style': 'off',
        'eslint/max-params': 'off',
        'eslint/no-console': 'off',
        'eslint/no-eq-null': 'off',
        'eslint/no-ternary': 'off',
        'eslint/id-length': 'off',
        'eslint/max-depth': 'off',
        'eslint/max-lines': 'off',
        'eslint/sort-keys': 'off',
        'eslint/sort-vars': 'off',
        'eslint/no-void': 'off',
        'eslint/one-var': 'off',
        'eslint/eqeqeq': 'off',
        'eslint/curly': 'off',

        'oxc/no-rest-spread-properties': 'off',
        'oxc/no-optional-chaining': 'off',
        'oxc/no-async-await': 'off',

        'import/consistent-type-specifier-style': 'off',
        'import/no-relative-parent-imports': 'off',
        'import/prefer-default-export': 'off',
        'import/no-unassigned-import': 'off',
        'import/no-named-export': 'off',
        'import/group-exports': 'off',
        'import/unambiguous': 'off',

        'promise/prefer-await-to-callbacks': 'off',
        'promise/prefer-await-to-then': 'off',

        'unicorn/prefer-query-selector': 'off',
        'unicorn/no-useless-undefined': 'off',
        'unicorn/no-nested-ternary': 'off',
        'unicorn/max-nested-calls': 'off',
        'unicorn/filename-case': 'off',
        'unicorn/no-null': 'off',

        'node/no-top-level-await': 'off',
        'node/no-process-env': 'off'
    },
    overrides: [
        {
            files: ['**/*.config.*'],
            rules: { 'import/no-default-export': 'off' }
        },
        {
            files: ['src/db/migrate.ts'],
            rules: { 'import/no-nodejs-modules': 'off' }
        }
    ],
    ignorePatterns: ['node_modules/**', 'coverage/**', 'build/**', 'dist/**', 'data/**', 'temp/**', 'tmp/**', 'out/**']
});
