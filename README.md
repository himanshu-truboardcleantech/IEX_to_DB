# IEX_to_DB

Loads IEX DSM Excel data (per-state sheets) into a Postgres database.

## Setup

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your values:
   ```
   DATABASE_URL="postgresql://<user>:<password>@<host>:5432/<database>?sslmode=require"
   DB_SSL=true
   EXCEL_PATH="C:\path\to\IEX_DSM_Combined_Master.xlsx"
   ```

## Usage

Apply the schema and load data in one step:
```
npm run migrate
```

Or just load Excel data (schema must already exist):
```
npm run load
```

The Excel file path is resolved in this order:
1. Command-line argument: `npm run load -- "C:\path\to\file.xlsx"`
2. `EXCEL_PATH` in `.env`
3. Default: `../excel/IEX_DSM_Combined_Master.xlsx` (relative to project root)

## Project structure

- `scripts/migrate.js` — applies `sql/schema.sql` then loads Excel data
- `scripts/load_iex_dsm.js` — reads the Excel workbook and upserts rows into `iex_dsm`
- `sql/schema.sql` — database schema
- `src/db.js` — Postgres connection pool
