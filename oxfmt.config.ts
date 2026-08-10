import { defineConfig } from 'oxfmt';

export default defineConfig({
    trailingComma: 'none',
    jsxSingleQuote: true,
    singleQuote: true,
    semi: true,
    printWidth: 140,
    tabWidth: 4,
    insertFinalNewline: true,
    sortPackageJson: true,
    sortImports: {
        newlinesBetween: false,
        groups: ['type', 'builtin', 'external', ['internal', 'subpath'], ['parent', 'sibling', 'index'], 'style', 'unknown']
    },
    ignorePatterns: ['node_modules/**', 'coverage/**', 'build/**', 'dist/**', 'data/**', 'temp/**', 'tmp/**', 'out/**']
});
