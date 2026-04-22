const fs = require("fs");
const path = require("path");

const XLSX = require("xlsx");

const COLUMNS = ["id", "title", "start_date", "end_date", "country", "region", "type", "company", "wikipedia", "description"];
const REQUIRED = ["id", "title", "start_date"];
const NULLABLE = ["end_date", "company", "wikipedia"];

// ── Largura sugerida por coluna (em caracteres) ─────────────────────────────
const COL_WIDTHS = { id: 36, title: 50, start_date: 12, end_date: 12, country: 20, region: 20, type: 12, company: 30, wikipedia: 55, description: 80 };

function resolveProjectRoot({ rootArg, callerDir } = {}) {
  const explicit = rootArg || process.env.TIMELINE_ROOT;
  if (explicit) return path.resolve(explicit);

  const base = process.pkg
    ? path.dirname(process.execPath)
    : callerDir
      ? path.resolve(callerDir, "..")
      : process.cwd();

  // Tenta ser tolerante com `.exe` em `dist/` (ou execução a partir de subpastas):
  // sobe alguns níveis buscando uma pasta que contenha `data/`.
  let dir = base;
  for (let i = 0; i < 6; i++) {
    const dataDir = path.join(dir, "data");
    if (
      fs.existsSync(dataDir) &&
      (fs.existsSync(path.join(dataDir, "events.json")) || fs.existsSync(path.join(dataDir, "events.xlsx")) || fs.existsSync(path.join(dir, "package.json")))
    ) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return base;
}

function getPaths(root) {
  return {
    root,
    jsonPath: path.join(root, "data", "events.json"),
    xlsxPath: path.join(root, "data", "events.xlsx"),
  };
}

function safeReadJsonArray(filePath) {
  if (!fs.existsSync(filePath)) return { ok: false, value: null, error: "missing" };
  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(parsed)) return { ok: false, value: null, error: "not-array" };
    return { ok: true, value: parsed, error: null };
  } catch (err) {
    return { ok: false, value: null, error: "invalid-json", details: err };
  }
}

function timestampForFilename(date = new Date()) {
  const pad2 = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}-${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

// ───────────────────────────────────────────────────────────────────────────
// EXPORT: events.json → events.xlsx
// ───────────────────────────────────────────────────────────────────────────
function exportToExcel({ root } = {}) {
  const { jsonPath, xlsxPath } = getPaths(root);

  if (!fs.existsSync(jsonPath)) {
    return { ok: false, error: `Arquivo não encontrado: ${jsonPath}` };
  }

  const json = safeReadJsonArray(jsonPath);
  if (!json.ok) {
    return { ok: false, error: `Falha ao ler JSON: ${jsonPath} (${json.error})` };
  }

  const events = json.value;

  // Converte para array de arrays (cabeçalho + dados)
  const rows = [
    COLUMNS, // linha 1: cabeçalho
    ...events.map((ev) =>
      COLUMNS.map((col) => {
        const val = ev[col];
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
    if (ws[cellRef]) ws[cellRef].s = { font: { bold: true } };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "eventos");

  XLSX.writeFile(wb, xlsxPath);
  return { ok: true, xlsxPath, jsonPath, eventCount: events.length, columnCount: COLUMNS.length };
}

// ───────────────────────────────────────────────────────────────────────────
// IMPORT (leitura): events.xlsx → events[] (ainda não grava)
// ───────────────────────────────────────────────────────────────────────────
function readEventsFromExcel({ root } = {}) {
  const { xlsxPath } = getPaths(root);

  if (!fs.existsSync(xlsxPath)) {
    return { ok: false, error: `Arquivo não encontrado: ${xlsxPath}` };
  }

  const wb = XLSX.readFile(xlsxPath);
  const ws = wb.Sheets[wb.SheetNames[0]];

  const rows = XLSX.utils.sheet_to_json(ws, {
    header: 1,
    raw: false,
    defval: "",
  });

  if (rows.length < 2) {
    return { ok: false, error: "Planilha vazia ou sem dados." };
  }

  const headers = rows[0].map((h) => String(h).trim());
  const missingCols = COLUMNS.filter((c) => !headers.includes(c));
  if (missingCols.length > 0) {
    return { ok: false, error: `Colunas faltando na planilha: ${missingCols.join(", ")}` };
  }

  const idx = {};
  COLUMNS.forEach((col) => {
    idx[col] = headers.indexOf(col);
  });

  const events = [];
  const warnings = [];
  let skipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const ev = {};

    for (const col of COLUMNS) {
      const raw = String(row[idx[col]] ?? "").trim();
      ev[col] = NULLABLE.includes(col) ? (raw === "" ? null : raw) : raw;
    }

    const missing = REQUIRED.filter((f) => !ev[f]);
    if (missing.length > 0) {
      warnings.push(`Linha ${i + 1} ignorada — obrigatórios vazios: ${missing.join(", ")}`);
      skipped++;
      continue;
    }

    events.push(ev);
  }

  events.sort((a, b) => (a.start_date < b.start_date ? -1 : 1));

  return { ok: true, xlsxPath, events, skipped, warnings };
}

function writeEventsJson({ root, events, makeBackup = true } = {}) {
  const { jsonPath } = getPaths(root);

  let backupPath = null;
  if (makeBackup && fs.existsSync(jsonPath)) {
    backupPath = `${jsonPath}.bak-${timestampForFilename()}`;
    fs.copyFileSync(jsonPath, backupPath);
  }

  fs.writeFileSync(jsonPath, JSON.stringify(events, null, 2), "utf-8");
  return { ok: true, jsonPath, backupPath };
}

module.exports = {
  COLUMNS,
  REQUIRED,
  NULLABLE,
  resolveProjectRoot,
  getPaths,
  safeReadJsonArray,
  exportToExcel,
  readEventsFromExcel,
  writeEventsJson,
};
