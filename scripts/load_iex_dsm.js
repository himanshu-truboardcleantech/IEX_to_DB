const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');
const { pool } = require('../src/db');

const EXCEL_PATH =
  process.argv[2] ||
  process.env.EXCEL_PATH ||
  path.join(__dirname, '..', '..', 'excel', 'IEX_DSM_Combined_Master.xlsx');

const SKIP_SHEETS = new Set(['Summary']);

// Excel header -> DB column
const COLUMN_MAP = {
  'Delivery Date': 'delivery_date',
  'Time Period': 'time_period',
  'DAM_Cleared Buy (MW)': 'dam_cleared_buy_mw',
  'DAM_Cleared Sell (MW)': 'dam_cleared_sell_mw',
  'DAM_Price (Rs./MWh)': 'dam_price_rs_mwh',
  'DAM_Trade (MW)': 'dam_trade_mw',
  'GDAM_Cleared Buy (MW)': 'gdam_cleared_buy_mw',
  'GDAM_Cleared Sell (MW)': 'gdam_cleared_sell_mw',
  'GDAM_Price (Rs./MWh)': 'gdam_price_rs_mwh',
  'GDAM_Trade (MW)': 'gdam_trade_mw',
  'RTM_Cleared Buy (MW)': 'rtm_cleared_buy_mw',
  'RTM_Cleared Sell (MW)': 'rtm_cleared_sell_mw',
  'RTM_Price (Rs./MWh)': 'rtm_price_rs_mwh',
  'RTM_Trade (MW)': 'rtm_trade_mw',
  'Wt. Avg. ACP DAM': 'wt_avg_acp_dam',
};

const DATA_COLUMNS = [
  'dam_cleared_buy_mw',
  'dam_cleared_sell_mw',
  'dam_price_rs_mwh',
  'dam_trade_mw',
  'gdam_cleared_buy_mw',
  'gdam_cleared_sell_mw',
  'gdam_price_rs_mwh',
  'gdam_trade_mw',
  'rtm_cleared_buy_mw',
  'rtm_cleared_sell_mw',
  'rtm_price_rs_mwh',
  'rtm_trade_mw',
  'wt_avg_acp_dam',
];

const ALL_COLUMNS = ['state', 'delivery_date', 'time_period', ...DATA_COLUMNS];

const BATCH_SIZE = 500;

function toDateOnly(value) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return value;
}

function sheetToRows(worksheet, state) {
  const raw = xlsx.utils.sheet_to_json(worksheet, { header: 1, raw: true, defval: null });
  const [headerRow, ...dataRows] = raw;

  const fieldByIndex = headerRow.map((header) => COLUMN_MAP[header] || null);
  const unknown = headerRow.filter((header) => !COLUMN_MAP[header]);
  if (unknown.length) {
    throw new Error(`Sheet "${state}" has unrecognized column(s): ${unknown.join(', ')}`);
  }

  return dataRows
    .filter((row) => row.some((cell) => cell !== null && cell !== undefined))
    .map((row) => {
      const record = { state };
      fieldByIndex.forEach((field, idx) => {
        if (!field) return;
        const value = row[idx];
        record[field] = field === 'delivery_date' ? toDateOnly(value) : value;
      });
      return record;
    });
}

function buildUpsert(rows) {
  const values = [];
  const placeholders = rows.map((row, rowIdx) => {
    const base = rowIdx * ALL_COLUMNS.length;
    ALL_COLUMNS.forEach((col) => values.push(row[col] ?? null));
    const slots = ALL_COLUMNS.map((_, colIdx) => `$${base + colIdx + 1}`);
    return `(${slots.join(', ')})`;
  });

  const updateSet = DATA_COLUMNS.map((col) => `${col} = EXCLUDED.${col}`).join(', ');

  const sql = `
    INSERT INTO iex_dsm (${ALL_COLUMNS.join(', ')})
    VALUES ${placeholders.join(', ')}
    ON CONFLICT (state, delivery_date, time_period)
    DO UPDATE SET ${updateSet}, updated_at = now()
  `;

  return { sql, values };
}

async function upsertRows(rows) {
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { sql, values } = buildUpsert(batch);
    await pool.query(sql, values);
  }
}

async function loadExcel(excelPath = EXCEL_PATH) {
  if (!fs.existsSync(excelPath)) {
    throw new Error(
      `Excel file not found at: ${excelPath}\n` +
        `Set EXCEL_PATH=... in your .env file, or pass a path explicitly:\n` +
        `  npm run load -- "C:\\Users\\himanshu\\Scripts\\IEX_data_toDB\\excel\\IEX_DSM_Combined_Master.xlsx"`
    );
  }

  console.log(`Reading: ${excelPath}`);
  const workbook = xlsx.readFile(excelPath, { cellDates: true });
  const stateSheets = workbook.SheetNames.filter((name) => !SKIP_SHEETS.has(name));

  if (!stateSheets.length) {
    throw new Error(`No state sheets found in ${excelPath}`);
  }

  let totalRows = 0;
  for (const state of stateSheets) {
    const rows = sheetToRows(workbook.Sheets[state], state);
    await upsertRows(rows);
    console.log(`${state}: upserted ${rows.length} rows`);
    totalRows += rows.length;
  }

  console.log(`Done. Total rows upserted: ${totalRows}`);
  return totalRows;
}

module.exports = { loadExcel };

if (require.main === module) {
  loadExcel()
    .then(() => pool.end())
    .catch((err) => {
      console.error('Load failed:', err);
      process.exit(1);
    });
}
