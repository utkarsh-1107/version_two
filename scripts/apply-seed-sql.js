const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const seedPath = path.join(__dirname, "seed.sql");

const useSSL =
  ["1", "true"].includes(String(process.env.PGSSL || "").toLowerCase()) || Boolean(process.env.VERCEL);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});

function splitStatements(sql) {
  const statements = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const prev = sql[i - 1];
    if (char === "'" && prev !== "\\") {
      inString = !inString;
    }
    if (char === ";" && !inString) {
      const trimmed = current.trim();
      if (trimmed) statements.push(trimmed);
      current = "";
    } else {
      current += char;
    }
  }
  const tail = current.trim();
  if (tail) statements.push(tail);
  return statements;
}

async function apply() {
  if (!fs.existsSync(seedPath)) {
    throw new Error("seed.sql not found. Run generate-seed-sql.js first.");
  }
  const sql = fs.readFileSync(seedPath, "utf8");
  const statements = splitStatements(sql);

  for (const statement of statements) {
    await pool.query(statement);
  }
  await pool.end();
}

apply()
  .then(() => {
    console.log("Seed SQL applied successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to apply seed SQL:", error);
    process.exit(1);
  });
