#!/usr/bin/env node
const path = require("path");
const readline = require("node:readline/promises");

const core = require("./events-excel-core.cjs");

function printIntro() {
  console.log("Timeline do Petróleo — Ferramenta Excel ↔ JSON");
  console.log("");
  console.log("O que significa:");
  console.log("  EXPORTAR = pegar `data/events.json` e GERAR/ATUALIZAR `data/events.xlsx` (para editar no Excel).");
  console.log("  IMPORTAR = pegar `data/events.xlsx` e SOBRESCREVER `data/events.json` (traz as edições do Excel para o site).");
  console.log("");
}

function parseArgs(argv) {
  const args = argv.slice(2);
  const out = { cmd: null, rootArg: null, yes: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--yes" || a === "-y") out.yes = true;
    else if (a === "--root") out.rootArg = args[++i];
    else if (!out.cmd) out.cmd = a;
  }
  return out;
}

function printHelp() {
  printIntro();
  console.log("Uso:");
  console.log("  events-excel.exe                 (interface interativa)");
  console.log("  events-excel.exe export          (exporta sem menu)");
  console.log("  events-excel.exe import          (importa com confirmação)");
  console.log("");
  console.log("Opções:");
  console.log("  --root <pasta>   Define a pasta do projeto (onde existe `data/`).");
  console.log("  --yes            Pula confirmações (cuidado).");
}

async function confirmImport({ rl, paths, currentCount, excelCount, skipped }) {
  console.log("");
  console.log("Você escolheu IMPORTAR (Excel → JSON).");
  console.log(`Isso vai SOBRESCREVER: ${paths.jsonPath}`);
  console.log(`Planilha lida:        ${paths.xlsxPath}`);
  console.log("");
  console.log(`Resumo:`);
  console.log(`  - events.json atual: ${currentCount ?? "não encontrado"}`);
  console.log(`  - eventos na planilha: ${excelCount}${skipped > 0 ? ` (${skipped} linha(s) ignorada(s))` : ""}`);
  console.log("");
  console.log("Para confirmar, digite IMPORTAR e pressione Enter (ou Enter para cancelar).");
  const answer = (await rl.question("> ")).trim().toUpperCase();
  return answer === "IMPORTAR";
}

async function runUi({ root }) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    printIntro();
    const paths = core.getPaths(root);
    console.log(`Pasta do projeto: ${paths.root}`);
    console.log("");
    console.log("Escolha uma opção:");
    console.log("  1) Exportar (JSON → Excel)");
    console.log("  2) Importar (Excel → JSON)");
    console.log("  0) Sair");
    const choice = (await rl.question("> ")).trim();
    if (choice === "0") return { ok: true, action: "exit" };
    if (choice === "1") {
      const res = core.exportToExcel({ root });
      if (!res.ok) return res;
      console.log(`✅  Exportado: ${res.xlsxPath}`);
      console.log(`    ${res.eventCount} eventos → ${res.columnCount} colunas`);
      return { ok: true, action: "export" };
    }
    if (choice === "2") {
      const current = core.safeReadJsonArray(paths.jsonPath);
      const currentCount = current.ok ? current.value.length : null;
      const read = core.readEventsFromExcel({ root });
      if (!read.ok) return read;
      const confirmed = await confirmImport({
        rl,
        paths,
        currentCount,
        excelCount: read.events.length,
        skipped: read.skipped,
      });
      if (!confirmed) return { ok: true, action: "import-cancelled" };
      const write = core.writeEventsJson({ root, events: read.events, makeBackup: true });
      console.log(`✅  Importado: ${write.jsonPath}`);
      if (write.backupPath) console.log(`    Backup criado: ${write.backupPath}`);
      console.log(`    ${read.events.length} eventos salvos${read.skipped > 0 ? ` (${read.skipped} linha(s) ignorada(s))` : ""}`);
      return { ok: true, action: "import" };
    }
    return { ok: false, error: "Opção inválida." };
  } finally {
    rl.close();
  }
}

async function main() {
  const parsed = parseArgs(process.argv);
  const root = core.resolveProjectRoot({ rootArg: parsed.rootArg, callerDir: __dirname });

  if (parsed.help) {
    printHelp();
    return;
  }

  if (!parsed.cmd) {
    const ui = await runUi({ root });
    if (!ui.ok) {
      console.error(`❌  ${ui.error}`);
      process.exit(1);
    }
    return;
  }

  if (parsed.cmd === "export") {
    const res = core.exportToExcel({ root });
    if (!res.ok) {
      console.error(`❌  ${res.error}`);
      process.exit(1);
    }
    console.log(`✅  Exportado: ${res.xlsxPath}`);
    console.log(`    ${res.eventCount} eventos → ${res.columnCount} colunas`);
    return;
  }

  if (parsed.cmd === "import") {
    const paths = core.getPaths(root);
    const current = core.safeReadJsonArray(paths.jsonPath);
    const currentCount = current.ok ? current.value.length : null;
    const read = core.readEventsFromExcel({ root });
    if (!read.ok) {
      console.error(`❌  ${read.error}`);
      process.exit(1);
    }
    if (!parsed.yes) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      try {
        const confirmed = await confirmImport({
          rl,
          paths,
          currentCount,
          excelCount: read.events.length,
          skipped: read.skipped,
        });
        if (!confirmed) return;
      } finally {
        rl.close();
      }
    }
    const write = core.writeEventsJson({ root, events: read.events, makeBackup: true });
    console.log(`✅  Importado: ${write.jsonPath}`);
    if (write.backupPath) console.log(`    Backup criado: ${write.backupPath}`);
    console.log(`    ${read.events.length} eventos salvos${read.skipped > 0 ? ` (${read.skipped} linha(s) ignorada(s))` : ""}`);
    return;
  }

  printHelp();
  process.exit(1);
}

main().catch((err) => {
  console.error("❌  Erro inesperado:", err);
  process.exit(1);
});

