const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DIR = path.join(ROOT, "public");
const SERVER_FILE = path.join(ROOT, "server.js");

const STATIC_EXTENSIONS = new Set([
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
  ".ico",
  ".webmanifest",
  ".json",
  ".map"
]);

const HTML_PAGES = [
  "index.html",
  "login.html",
  "menu-management.html",
  "users.html",
  "daily-close-report.html"
];

function existsInPublic(urlPath) {
  const cleanPath = String(urlPath || "").split("?")[0].split("#")[0];
  const normalized = cleanPath.replace(/^\/+/, "");
  const fullPath = path.join(PUBLIC_DIR, normalized);
  return fs.existsSync(fullPath) && fs.statSync(fullPath).isFile();
}

function parseServerSendFiles() {
  const content = fs.readFileSync(SERVER_FILE, "utf8");
  const pattern = /sendFile\(path\.join\(__dirname,\s*"public",\s*"([^"]+)"\)\)/g;
  const files = [];
  let match = pattern.exec(content);
  while (match) {
    files.push(match[1]);
    match = pattern.exec(content);
  }
  return files;
}

function parseHtmlAssets(fileName) {
  const filePath = path.join(PUBLIC_DIR, fileName);
  if (!fs.existsSync(filePath)) return [];
  const html = fs.readFileSync(filePath, "utf8");
  const assets = [];
  const pattern = /\b(?:href|src)\s*=\s*"([^"]+)"/g;
  let match = pattern.exec(html);
  while (match) {
    const target = String(match[1] || "").trim();
    if (!target.startsWith("/")) {
      match = pattern.exec(html);
      continue;
    }
    if (target.startsWith("//")) {
      match = pattern.exec(html);
      continue;
    }
    const withoutQuery = target.split("?")[0].split("#")[0];
    const ext = path.extname(withoutQuery).toLowerCase();
    if (STATIC_EXTENSIONS.has(ext)) {
      assets.push(target);
    }
    match = pattern.exec(html);
  }
  return assets;
}

function run() {
  const missing = [];

  for (const file of parseServerSendFiles()) {
    const full = path.join(PUBLIC_DIR, file);
    if (!fs.existsSync(full)) {
      missing.push(`Missing server sendFile target: public/${file}`);
    }
  }

  for (const page of HTML_PAGES) {
    const pagePath = path.join(PUBLIC_DIR, page);
    if (!fs.existsSync(pagePath)) {
      missing.push(`Missing HTML page: public/${page}`);
      continue;
    }
    const assets = parseHtmlAssets(page);
    for (const asset of assets) {
      if (!existsInPublic(asset)) {
        missing.push(`Missing asset referenced in ${page}: ${asset}`);
      }
    }
  }

  if (missing.length > 0) {
    console.error("Public asset verification failed:");
    for (const line of missing) {
      console.error(`- ${line}`);
    }
    process.exit(1);
  }

  console.log("Public asset verification passed.");
}

run();

