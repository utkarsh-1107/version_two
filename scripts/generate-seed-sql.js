const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const sqlitePath = path.join(__dirname, "..", "data", "food_orders.db");
const outputPath = path.join(__dirname, "seed.sql");

function openSqlite() {
  return new sqlite3.Database(sqlitePath, sqlite3.OPEN_READONLY);
}

function sqliteAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function escapeLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function buildInsert(table, columns, rows) {
  if (!rows.length) return "";
  const values = rows
    .map((row) => `(${columns.map((c) => escapeLiteral(row[c])).join(", ")})`)
    .join(",\n");
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES\n${values};\n`;
}

async function generate() {
  const sqlite = openSqlite();
  try {
    const categories = await sqliteAll(sqlite, "SELECT id, name FROM categories ORDER BY id");
    const menuItems = await sqliteAll(
      sqlite,
      "SELECT id, category_id, name, price, prep_time_minutes FROM menu_items ORDER BY id"
    );
    const appetizerGroups = await sqliteAll(
      sqlite,
      "SELECT id, name FROM appetizer_groups ORDER BY id"
    );
    const appetizerVariants = await sqliteAll(
      sqlite,
      "SELECT id, group_id, portion_name, price, prep_time_minutes FROM appetizer_variants ORDER BY id"
    );
    const orders = await sqliteAll(
      sqlite,
      "SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, status, created_at FROM orders ORDER BY id"
    );
    const orderItems = await sqliteAll(
      sqlite,
      "SELECT id, order_id, item_type, menu_item_id, appetizer_variant_id, quantity, line_total FROM order_items ORDER BY id"
    );

    let sql = "";
    sql += "BEGIN;\n";
    sql +=
      "TRUNCATE TABLE order_items, orders, appetizer_variants, appetizer_groups, menu_items, categories RESTART IDENTITY CASCADE;\n";

    sql += buildInsert("categories", ["id", "name"], categories);
    sql += buildInsert("menu_items", ["id", "category_id", "name", "price", "prep_time_minutes"], menuItems);
    sql += buildInsert("appetizer_groups", ["id", "name"], appetizerGroups);
    sql += buildInsert(
      "appetizer_variants",
      ["id", "group_id", "portion_name", "price", "prep_time_minutes"],
      appetizerVariants
    );
    sql += buildInsert(
      "orders",
      ["id", "token_number", "total_amount", "payment_mode", "order_type", "customer_name", "status", "created_at"],
      orders
    );
    sql += buildInsert(
      "order_items",
      ["id", "order_id", "item_type", "menu_item_id", "appetizer_variant_id", "quantity", "line_total"],
      orderItems
    );

    sql += "SELECT setval(pg_get_serial_sequence('categories','id'), COALESCE((SELECT MAX(id) FROM categories), 1));\n";
    sql += "SELECT setval(pg_get_serial_sequence('menu_items','id'), COALESCE((SELECT MAX(id) FROM menu_items), 1));\n";
    sql +=
      "SELECT setval(pg_get_serial_sequence('appetizer_groups','id'), COALESCE((SELECT MAX(id) FROM appetizer_groups), 1));\n";
    sql +=
      "SELECT setval(pg_get_serial_sequence('appetizer_variants','id'), COALESCE((SELECT MAX(id) FROM appetizer_variants), 1));\n";
    sql += "SELECT setval(pg_get_serial_sequence('orders','id'), COALESCE((SELECT MAX(id) FROM orders), 1));\n";
    sql += "SELECT setval(pg_get_serial_sequence('order_items','id'), COALESCE((SELECT MAX(id) FROM order_items), 1));\n";
    sql += "COMMIT;\n";

    fs.writeFileSync(outputPath, sql, "utf8");
  } finally {
    sqlite.close();
  }
}

generate()
  .then(() => {
    console.log(`Seed SQL written to ${outputPath}`);
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to generate seed SQL:", error);
    process.exit(1);
  });
