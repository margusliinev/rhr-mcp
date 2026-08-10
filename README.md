# RHR MCP

MCP server that gives AI agents structured access to Public Procurement Registry data. Query planned procurements, open tenders, contract awards, buyers, and winning suppliers using natural language through any MCP-compatible client.

## Prerequisites

- [Bun](https://bun.com) >= 1.4.0
- PostgreSQL (via Docker Compose below, or [Postgres.app](https://postgresapp.com) / any local Postgres)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/margusliinev/rhr-mcp.git
cd rhr-mcp
cp .env.example .env
bun install
```

The default `DATABASE_URL` in `.env.example` is:

```text
postgresql://postgres:postgres@127.0.0.1:5432/postgres
```

### 2. Start PostgreSQL

**Option A — Docker Compose** (matches the default `DATABASE_URL`):

```bash
docker compose up -d
```

**Option B — Postgres.app / other local Postgres**

Create a database reachable with the same `DATABASE_URL`, or update `.env` to match your setup.

### 3. Download open data

Download the public datasets from:

https://riigihanked.riik.ee/rhr-web/#/open-data

Unzip them into the `data/` folder at the project root.

### 4. Migrate and ingest

```bash
bun run migrate
bun run ingest
```

Ingest loads the XML files into Postgres. It can take a while depending on disk and machine.
Re-running ingest on a database that already has data will fail on unique constraints.

### 5. Start the server

```bash
bun run dev
```

The MCP endpoint is available at `http://localhost:3000/mcp` (or whatever `PORT` you set in `.env`).

## Use with Cursor

With the server running, add this to your Cursor MCP config (`.cursor/mcp.json`):

```json
{
    "mcpServers": {
        "RHR": {
            "url": "http://localhost:3000/mcp"
        }
    }
}
```

Then restart MCP / reload Cursor so the `RHR` server shows up.

## Scripts

| Command             | Description                              |
| ------------------- | ---------------------------------------- |
| `bun run dev`       | Start development server                 |
| `bun run start`     | Start production server                  |
| `bun run migrate`   | Apply database migrations                |
| `bun run ingest`    | Load RHR data from `data/` into Postgres |
| `bun run format`    | Format code                              |
| `bun run lint`      | Lint code                                |
| `bun run typecheck` | Typecheck                                |

## Tech Stack

- **Runtime** — Bun >= 1.4.0
- **Language** — TypeScript 7
- **Database** — PostgreSQL
- **Query builder** — Kysely
- **Validation** — Zod
- **Tooling** — Oxfmt and Oxlint

## License

MIT
