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
    sortImports: false,
    ignorePatterns: ['node_modules/**', 'coverage/**', 'build/**', 'dist/**', 'data/**', 'temp/**', 'tmp/**', 'out/**']
});
