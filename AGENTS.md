# AGENTS.md

Guidance for AI agents working on this project.

## Feedback loop (required)

After any code change, verify before finishing:

```bash
bun run format:check
bun run lint:check
bun run typecheck
```

Fix all errors these report. Do not leave failing checks or unexplained suppressions.
To auto-fix safe lint issues: `bun run lint` and to auto-fix formatting issues: `bun run format`.
Config sources of truth: `oxlint.config.ts`, `oxfmt.config.ts`, `tsconfig.json`.

## Code conventions

1. **No Explicit Return Types** — Never use explicit return types, unless no other option.
2. **No Default Exports** — Never use default export, unless no other option.
3. **No Any Types** — Never use any type, always prefer precise types or unknown.
4. **No Comments** — Never add comments, unless logic is complex or non-obvious.
5. **No CommonJS** — Never use CommonJS syntax, always use native ES Modules.
6. **Import Preferences** — `import type { … }` only; never inline `import { type … }`.
7. **Import Sorting** — `import type { … }` always at the top of the file.
8. **Dependencies** — Always use exact versions; never `^` or `~`.

## Scripts

| Command                | Description              |
| ---------------------- | ------------------------ |
| `bun run dev`          | Start development server |
| `bun run start`        | Start production server  |
| `bun run migrate`      | Apply migrations         |
| `bun run format`       | Format code              |
| `bun run format:check` | Format check             |
| `bun run lint`         | Lint code                |
| `bun run lint:check`   | Lint check               |
| `bun run typecheck`    | Typecheck                |
