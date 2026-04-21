/**
 * Ferramenta interna: converte data/events.json ↔ data/events.xlsx
 *
 * Uso:
 *   npm run excel:export   →  events.json → events.xlsx
 *   npm run excel:import   →  events.xlsx → events.json
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const JSON_PATH = path.join(ROOT, "data", "events.json");
const XLSX_PATH = path.join(ROOT, "data", "events.xlsx");

const COLUMNS = ["id", "title", "start_date", "end_date", "country", "region", "type", "company", "wikipedia", "description"];
const REQUIRED = ["id", "title", "start_date"];
const NULLABLE = ["end_date", "company", "wikipedia"];

// ── Largura sugerida por coluna (em caracteres) ─────────────────────────────
const COL_WIDTHS = { id: 36, title: 50, start_date: 12, end_date: 12, country: 20, region: 20, type: 12, company: 30, wikipedia: 55, description: 80 };

// ───────────────────────────────────────────────────────────────────────────
// EXPORT: events.json → events.xlsx
// ───────────────────────────────────────────────────────────────────────────
function exportToExcel() {
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌  Arquivo não encontrado: ${JSON_PATH}`);
    process.exit(1);
  }

  const events = JSON.parse(fs.readFileSync(JSON_PATH, "utf-8"));

  // Converte para array de arrays (cabeçalho + dados)
  const rows = [
    COLUMNS, // linha 1: cabeçalho
    ...events.map((ev) =>
      COLUMNS.map((col) => {
        const val = ev[col];
        // null e undefined → string vazia
        return val === null || val === undefined ? "" : String(val);
      })
    ),
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Ajusta largura das colunas
  ws["!cols"] = COLUMNS.map((col) => ({ wch: COL_WIDTHS[col] ?? 20 }));

  // Congela a primeira linha (cabeçalho sempre visível)
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Aplica negrito nos cabeçalhos (A1..J1)
  COLUMNS.forEach((_, i) => {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (ws[cellRef]) {
      ws[cellRef].s = { font: { bold: true } };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "eventos");

  XLSX.writeFile(wb, XLSX_PATH);
  console.log(`✅  Exportado: ${XLSX_PATH}`);
  console.log(`    ${events.length} eventos → ${COLUMNS.length} colunas`);
}

// ───────────────────────────────────────────────────────────────────────────
// IMPORT: events.xlsx → events.json
// ───────────────────────────────────────────────────────────────────────────
function importFromExcel() {
  if (!fs.existsSync(XLSX_PATH)) {
    console.error(`❌  Arquivo não encontrado: ${XLSX_PATH}`);
    console.error(`    Execute primeiro: npm run excel:export`);
    process.exit(1);
  }

  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];

  // Lê como array de objetos usando a primeira linha como cabeçalho
  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,         // retorna array de arrays
    raw: false,        // tudo como string (evita conversão automática de datas)
    defval: "",        // células vazias → string vazia
  });

  if (rows.length < 2) {
    console.error("❌  Planilha vazia ou sem dados.");
    process.exit(1);
  }

  // Primeira linha = cabeçalhos; valida se batem com os esperados
  const headers = rows[0].map((h) => String(h).trim());
  const missingCols = COLUMNS.filter((c) => !headers.includes(c));
  if (missingCols.length > 0) {
    console.error(`❌  Colunas faltando na planilha: ${missingCols.join(", ")}`);
    process.exit(1);
  }

  // Índice de cada coluna (tolerante a colunas extras ou fora de ordem)
  const idx = {};
  COLUMNS.forEach((col) => { idx[col] = headers.indexOf(col); });

  const events = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ev = {};

    for (const col of COLUMNS) {
      const raw = String(row[idx[col]] ?? "").trim();
      ev[col] = NULLABLE.includes(col) ? (raw === "" ? null : raw) : raw;
    }

    // Valida campos obrigatórios
    const missing = REQUIRED.filter((f) => !ev[f]);
    if (missing.length > 0) {
      console.warn(`⚠️   Linha ${i + 1} ignorada — campos obrigatórios vazios: ${missing.join(", ")}`);
      skipped++;
      continue;
    }

    events.push(ev);
  }

  // Ordena por start_date
  events.sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  fs.writeFileSync(JSON_PATH, JSON.stringify(events, null, 2), "utf-8");
  console.log(`✅  Importado: ${JSON_PATH}`);
  console.log(`    ${events.length} eventos salvos${skipped > 0 ? ` (${skipped} linha(s) ignorada(s))` : ""}`);
}

// ───────────────────────────────────────────────────────────────────────────
// CLI
// ───────────────────────────────────────────────────────────────────────────
const cmd = process.argv[2];

if (cmd === "export") {
  exportToExcel();
} else if (cmd === "import") {
  importFromExcel();
} else {
  console.log("Uso:");
  console.log("  npm run excel:export   →  events.json  →  events.xlsx");
  console.log("  npm run excel:import   →  events.xlsx  →  events.json");
  process.exit(1);
}
