const fs = require("node:fs");
const path = require("node:path");
const mysql = require("mysql2/promise");

const ROOT_DIR = __dirname;
const OUTPUT_FILE = path.join(ROOT_DIR, "modelo-relacional-db.svg");
function loadEnvFile() {
  const envPath = path.join(ROOT_DIR, ".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const content = fs.readFileSync(envPath, "utf8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^"|"$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildTableBlocks(columns) {
  const grouped = new Map();

  for (const column of columns) {
    const key = `${column.TABLE_SCHEMA}.${column.TABLE_NAME}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(column);
  }

  return grouped;
}

function markerForColumn(column) {
  const markers = [];

  if (column.COLUMN_KEY === "PRI") {
    markers.push("PK");
  }
  if (column.COLUMN_KEY === "UNI") {
    markers.push("UQ");
  }
  if (column.COLUMN_KEY === "MUL") {
    markers.push("FK");
  }
  if (column.IS_NULLABLE === "NO") {
    markers.push("NN");
  }

  return markers.join(" | ");
}

function drawTable(table, columns, layout) {
  const lineHeight = 28;
  const headerHeight = 34;
  const schemaHeight = 24;
  const width = layout.width;
  const height = schemaHeight + headerHeight + columns.length * lineHeight + 14;
  const x = layout.x;
  const y = layout.y;

  let rows = "";

  columns.forEach((column, index) => {
    const rowY = y + schemaHeight + headerHeight + index * lineHeight;
    const fill = index % 2 === 0 ? "#ffffff" : "#f8fafc";
    const markers = markerForColumn(column);

    rows += `
      <rect x="${x}" y="${rowY}" width="${width}" height="${lineHeight}" fill="${fill}" />
      <text x="${x + 14}" y="${rowY + 18}" class="col-name">${escapeXml(column.COLUMN_NAME)}</text>
      <text x="${x + 215}" y="${rowY + 18}" class="col-type">${escapeXml(column.COLUMN_TYPE)}</text>
      <text x="${x + width - 14}" y="${rowY + 18}" text-anchor="end" class="col-meta">${escapeXml(markers)}</text>
    `;
  });

  return `
    <g id="${escapeXml(`${table.TABLE_SCHEMA}.${table.TABLE_NAME}`)}">
      <rect x="${x}" y="${y}" rx="14" ry="14" width="${width}" height="${height}" class="table-shadow" />
      <rect x="${x}" y="${y}" rx="14" ry="14" width="${width}" height="${height}" class="table-frame" />
      <rect x="${x}" y="${y}" rx="14" ry="14" width="${width}" height="${schemaHeight}" class="schema-bar" />
      <rect x="${x}" y="${y + schemaHeight}" width="${width}" height="${headerHeight}" class="table-bar" />
      <text x="${x + width / 2}" y="${y + 16}" text-anchor="middle" class="schema-name">${escapeXml(table.TABLE_SCHEMA)}</text>
      <text x="${x + 14}" y="${y + schemaHeight + 22}" class="table-name">${escapeXml(table.TABLE_NAME)}</text>
      ${rows}
    </g>
  `;
}

function connectionPoint(layout, side, offsetY) {
  if (side === "left") {
    return { x: layout.x, y: layout.y + offsetY };
  }
  if (side === "right") {
    return { x: layout.x + layout.width, y: layout.y + offsetY };
  }
  return { x: layout.x + layout.width / 2, y: layout.y + offsetY };
}

function drawRelationship(fromLayout, toLayout, options) {
  const start = connectionPoint(fromLayout, options.fromSide, options.fromOffsetY);
  const end = connectionPoint(toLayout, options.toSide, options.toOffsetY);
  const midX = (start.x + end.x) / 2;
  const path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`;

  return `
    <path d="${path}" class="rel-line" />
    <text x="${start.x + (options.fromSide === "right" ? 12 : -12)}" y="${start.y - 8}" text-anchor="${options.fromSide === "right" ? "start" : "end"}" class="rel-label">${escapeXml(options.fromLabel)}</text>
    <text x="${end.x + (options.toSide === "right" ? 12 : -12)}" y="${end.y - 8}" text-anchor="${options.toSide === "right" ? "start" : "end"}" class="rel-label">${escapeXml(options.toLabel)}</text>
  `;
}

async function fetchSchema() {
  loadEnvFile();

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined
  });

  const [tables] = await connection.query(`
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_schema IN ('seguranca', 'cadastro', 'financeiro')
    ORDER BY FIELD(table_schema, 'seguranca', 'cadastro', 'financeiro'), table_name
  `);

  const [columns] = await connection.query(`
    SELECT table_schema, table_name, column_name, column_type, is_nullable, column_key, extra, ordinal_position
    FROM information_schema.columns
    WHERE table_schema IN ('seguranca', 'cadastro', 'financeiro')
    ORDER BY table_schema, table_name, ordinal_position
  `);

  await connection.end();
  return { tables, columns };
}

async function main() {
  const { tables, columns } = await fetchSchema();
  const tableColumns = buildTableBlocks(columns);

  const layouts = {
    "seguranca.tbUsuarios": { x: 30, y: 70, width: 430 },
    "cadastro.tbPessoaTipo": { x: 690, y: 40, width: 360 },
    "cadastro.tbPessoas": { x: 600, y: 240, width: 450 },
    "financeiro.tbContasReceber": { x: 40, y: 430, width: 450 },
    "financeiro.tbTipoTitulo": { x: 720, y: 610, width: 320 }
  };

  const tableSvg = tables
    .map((table) => {
      const key = `${table.TABLE_SCHEMA}.${table.TABLE_NAME}`;
      return drawTable(table, tableColumns.get(key) || [], layouts[key]);
    })
    .join("\n");

  const relationshipSvg = [
    drawRelationship(layouts["seguranca.tbUsuarios"], layouts["cadastro.tbPessoas"], {
      fromSide: "right",
      toSide: "left",
      fromOffsetY: 110,
      toOffsetY: 160,
      fromLabel: "1",
      toLabel: "0..N"
    }),
    drawRelationship(layouts["seguranca.tbUsuarios"], layouts["financeiro.tbContasReceber"], {
      fromSide: "bottom",
      toSide: "top",
      fromOffsetY: 240,
      toOffsetY: 20,
      fromLabel: "1",
      toLabel: "0..N"
    }),
    drawRelationship(layouts["seguranca.tbUsuarios"], layouts["seguranca.tbUsuarios"], {
      fromSide: "right",
      toSide: "top",
      fromOffsetY: 150,
      toOffsetY: -14,
      fromLabel: "1",
      toLabel: "0..N"
    }),
    drawRelationship(layouts["cadastro.tbPessoaTipo"], layouts["cadastro.tbPessoas"], {
      fromSide: "bottom",
      toSide: "top",
      fromOffsetY: 94,
      toOffsetY: 18,
      fromLabel: "1",
      toLabel: "N"
    }),
    drawRelationship(layouts["cadastro.tbPessoas"], layouts["financeiro.tbContasReceber"], {
      fromSide: "left",
      toSide: "right",
      fromOffsetY: 196,
      toOffsetY: 150,
      fromLabel: "1",
      toLabel: "0..1"
    }),
    drawRelationship(layouts["financeiro.tbTipoTitulo"], layouts["financeiro.tbContasReceber"], {
      fromSide: "left",
      toSide: "right",
      fromOffsetY: 70,
      toOffsetY: 235,
      fromLabel: "1",
      toLabel: "N"
    })
  ].join("\n");

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="900" viewBox="0 0 1100 900">
  <defs>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0f172a" flood-opacity="0.14" />
    </filter>
    <style>
      .bg { fill: #f4f1ea; }
      .title { font: 700 28px 'Segoe UI', Arial, sans-serif; fill: #1f2937; }
      .subtitle { font: 400 14px 'Segoe UI', Arial, sans-serif; fill: #475569; }
      .table-shadow { fill: #00000010; filter: url(#shadow); }
      .table-frame { fill: #fffdf9; stroke: #475569; stroke-width: 1.4; }
      .schema-bar { fill: #f1f5f9; stroke: #475569; stroke-width: 1.4; }
      .table-bar { fill: #e2e8f0; stroke: #475569; stroke-width: 1.2; }
      .schema-name { font: 600 13px 'Segoe UI', Arial, sans-serif; fill: #334155; }
      .table-name { font: 700 18px 'Segoe UI', Arial, sans-serif; fill: #0f172a; }
      .col-name { font: 600 14px 'Segoe UI', Arial, sans-serif; fill: #111827; }
      .col-type { font: 400 13px 'Consolas', 'Courier New', monospace; fill: #475569; }
      .col-meta { font: 700 11px 'Segoe UI', Arial, sans-serif; fill: #b45309; }
      .rel-line { fill: none; stroke: #475569; stroke-width: 2.3; stroke-dasharray: 8 6; }
      .rel-label { font: 700 13px 'Segoe UI', Arial, sans-serif; fill: #1e293b; }
    </style>
  </defs>
  <rect width="1100" height="900" class="bg" />
  <text x="34" y="36" class="title">Modelo Relacional do Banco</text>
  <text x="34" y="58" class="subtitle">Gerado a partir do schema real do MySQL: seguranca, cadastro e financeiro</text>
  ${relationshipSvg}
  ${tableSvg}
</svg>
  `.trim();

  fs.writeFileSync(OUTPUT_FILE, svg, "utf8");
  console.log(`Imagem gerada em: ${OUTPUT_FILE}`);
}

main().catch((error) => {
  console.error("Falha ao gerar o diagrama:", error);
  process.exit(1);
});
