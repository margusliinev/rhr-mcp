# RHR MCP

MCP server that gives AI agents structured access to Public Procurement Registry data. Query procurements, awards, buyers, and winning suppliers using natural language through any MCP-compatible client.

## Tech Stack

- **Runtime** — Bun >= 1.4.0
- **Language** — TypeScript 7
- **Database** — PostgreSQL
- **Query builder** — Kysely
- **Validation** — Zod
- **Tooling** — Oxfmt and Oxlint

## Prerequisites

- [Bun](https://bun.com) >= 1.4.0
- [Docker](https://www.docker.com/) (for PostgreSQL)

## Download open data

Download the public datasets from:

https://riigihanked.riik.ee/rhr-web/#/open-data

Unzip them into the `data/` folder at the project root, keeping the year folders. Ingest expects files like:

```text
data/
  2025/
    HT_2025_1.xml
    HLST_2025_1.xml
    …
  2026/
    HT_2026_1.xml
    HLST_2026_1.xml
    …
```

`HT_*.xml` files are contract notices. `HLST_*.xml` files are contract award notices.

## Getting Started

```bash
git clone https://github.com/margusliinev/rhr-mcp.git
cd rhr-mcp
cp .env.example .env
bun install
docker compose up -d
bun run migrate
bun run ingest
bun run dev
```

The MCP endpoint is available at `http://localhost:3000/mcp`.

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

## Available tools

| Tool                             | Description                                                          |
| -------------------------------- | -------------------------------------------------------------------- |
| `get-organization`               | Get an organization by id or registry code                           |
| `get-procurement`                | Get a procurement with buyers, lots, and award summaries             |
| `get-award`                      | Get an award with suppliers, lot, and procurement summary            |
| `list-organization-procurements` | List procurements where an organization is a buyer                   |
| `list-organization-awards`       | List awards where an organization is a winning supplier              |
| `list-procurement-lots`          | List lots for a procurement, with award summaries linked by lot id   |
| `search-organizations`           | Search organizations by name or registry code                        |
| `search-procurements`            | Search and filter procurements by text, status, CPV, value, and more |
| `search-awards`                  | Search awards by amount, date, CPV, result, and supplier             |

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

## License

MIT
