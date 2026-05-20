const fs = require("node:fs");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT_DIR, "public");

const staticFiles = [
  "index.html",
  "login.html",
  "cadastro.html",
  "usuarios.html",
  "home.html",
  "style.css",
  "shared.js",
  "login.js",
  "cadastro.js",
  "usuarios.js",
  "home.js"
];

fs.mkdirSync(PUBLIC_DIR, { recursive: true });

for (const file of staticFiles) {
  fs.copyFileSync(path.join(ROOT_DIR, file), path.join(PUBLIC_DIR, file));
}

console.log(`Arquivos estaticos copiados para ${path.relative(ROOT_DIR, PUBLIC_DIR)}`);
