const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const pgDb = require("../database-postgres");

const sqlitePath = path.join(__dirname, "..", "data", "food_orders.db");

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

function sqliteGet(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

async function sqliteHasTable(db, tableName) {
  const row = await sqliteGet(
    db,
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    [tableName]
  );
  return Boolean(row);
}

async function sqliteTableColumns(db, tableName) {
  const rows = await sqliteAll(db, `PRAGMA table_info(${tableName})`);
  return new Set(rows.map((entry) => String(entry.name || "").trim()));
}

function normalizeRole(value) {
  return String(value || "").trim().toLowerCase() === "admin" ? "admin" : "user";
}

function normalizeOrderType(value) {
  return String(value || "").trim().toLowerCase() === "parcel" ? "parcel" : "dine_in";
}

function normalizeDateOnly(createdAt) {
  const raw = String(createdAt || "").trim();
  const direct = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

async function ensureEmptyOrAllowed() {
  const existing = await pgDb.query("SELECT COUNT(*)::int AS count FROM categories");
  const count = existing.rows[0]?.count || 0;
  if (count > 0 && !["1", "true"].includes(String(process.env.ALLOW_OVERWRITE || "").toLowerCase())) {
    throw new Error("Postgres already has data. Set ALLOW_OVERWRITE=1 to overwrite.");
  }
  if (count > 0) {
    await pgDb.query("BEGIN");
    try {
      await pgDb.query("TRUNCATE TABLE order_items RESTART IDENTITY CASCADE");
      await pgDb.query("TRUNCATE TABLE orders RESTART IDENTITY CASCADE");
      await pgDb.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
      await pgDb.query("TRUNCATE TABLE appetizer_variants RESTART IDENTITY CASCADE");
      await pgDb.query("TRUNCATE TABLE appetizer_groups RESTART IDENTITY CASCADE");
      await pgDb.query("TRUNCATE TABLE menu_items RESTART IDENTITY CASCADE");
      await pgDb.query("TRUNCATE TABLE categories RESTART IDENTITY CASCADE");
      await pgDb.query("COMMIT");
    } catch (error) {
      await pgDb.query("ROLLBACK");
      throw error;
    }
  }
}

async function insertRows(table, columns, rows) {
  if (rows.length === 0) return;
  for (const row of rows) {
    const values = columns.map((c) => row[c]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
    await pgDb.query(sql, values);
  }
}

async function resetSequence(table, idColumn = "id") {
  await pgDb.query(
    `SELECT setval(pg_get_serial_sequence('${table}','${idColumn}'), COALESCE((SELECT MAX(${idColumn}) FROM ${table}), 1))`
  );
}

async function migrate() {
  await pgDb.initDatabase();
  await ensureEmptyOrAllowed();

  const sqlite = openSqlite();
  try {
    const hasUsersTable = await sqliteHasTable(sqlite, "users");
    const userColumns = hasUsersTable ? await sqliteTableColumns(sqlite, "users") : new Set();
    const users = hasUsersTable
      ? await sqliteAll(
          sqlite,
          `
          SELECT
            id,
            ${userColumns.has("name") ? "name" : "NULL AS name"},
            ${userColumns.has("username") ? "username" : "NULL AS username"},
            ${userColumns.has("password") ? "password" : "NULL AS password"},
            ${userColumns.has("role") ? "role" : "'user' AS role"},
            ${userColumns.has("created_at") ? "created_at" : "datetime('now') AS created_at"}
          FROM users
          ORDER BY id
          `
        )
      : [];

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
    const orderColumns = await sqliteTableColumns(sqlite, "orders");
    const orders = await sqliteAll(
      sqlite,
      `
      SELECT
        id,
        token_number,
        total_amount,
        payment_mode,
        ${orderColumns.has("order_type") ? "order_type" : "'dine_in' AS order_type"},
        ${orderColumns.has("customer_name") ? "customer_name" : "NULL AS customer_name"},
        ${orderColumns.has("customer_address") ? "customer_address" : "NULL AS customer_address"},
        ${orderColumns.has("order_notes") ? "order_notes" : "NULL AS order_notes"},
        ${orderColumns.has("created_by_user_id") ? "created_by_user_id" : "NULL AS created_by_user_id"},
        status,
        created_at
      FROM orders
      ORDER BY id
      `
    );
    const orderItemColumns = await sqliteTableColumns(sqlite, "order_items");
    const orderItems = await sqliteAll(
      sqlite,
      `
      SELECT
        id,
        order_id,
        ${orderItemColumns.has("item_type") ? "item_type" : "'menu_item' AS item_type"},
        ${orderItemColumns.has("menu_item_id") ? "menu_item_id" : "NULL AS menu_item_id"},
        ${orderItemColumns.has("appetizer_variant_id") ? "appetizer_variant_id" : "NULL AS appetizer_variant_id"},
        quantity,
        line_total
      FROM order_items
      ORDER BY id
      `
    );

    await pgDb.query("BEGIN");
    try {
      const normalizedUsers = users.length > 0
        ? users.map((entry, index) => {
            const role = normalizeRole(entry.role);
            const fallbackUsername = role === "admin" ? "admin" : `user${index + 1}`;
            return {
              id: Number(entry.id),
              name: String(entry.name || fallbackUsername),
              username: String(entry.username || fallbackUsername).toLowerCase(),
              password: String(entry.password || entry.username || fallbackUsername),
              role,
              created_at: String(entry.created_at || new Date().toISOString())
            };
          })
        : [
            { id: 1, name: "Admin", username: "admin", password: "admin", role: "admin", created_at: new Date().toISOString() },
            { id: 2, name: "User", username: "user", password: "user", role: "user", created_at: new Date().toISOString() }
          ];

      await insertRows("users", ["id", "name", "username", "password", "role", "created_at"], normalizedUsers);

      const adminUserId =
        normalizedUsers.find((entry) => entry.role === "admin")?.id ||
        normalizedUsers[0]?.id ||
        1;

      await insertRows("categories", ["id", "name"], categories);
      await insertRows(
        "menu_items",
        ["id", "category_id", "name", "price", "prep_time_minutes"],
        menuItems
      );
      await insertRows("appetizer_groups", ["id", "name"], appetizerGroups);
      await insertRows(
        "appetizer_variants",
        ["id", "group_id", "portion_name", "price", "prep_time_minutes"],
        appetizerVariants
      );

      const validUserIds = new Set(normalizedUsers.map((entry) => Number(entry.id)));
      const normalizedOrders = orders.map((entry) => {
        const sourceUserId = Number(entry.created_by_user_id);
        const createdByUserId = validUserIds.has(sourceUserId) ? sourceUserId : adminUserId;
        return {
          id: Number(entry.id),
          token_number: Number(entry.token_number),
          total_amount: Number(entry.total_amount),
          payment_mode: entry.payment_mode === "upi" ? "upi" : "cash",
          order_type: normalizeOrderType(entry.order_type),
          customer_name: entry.customer_name || null,
          customer_address: entry.customer_address || null,
          order_notes: entry.order_notes || null,
          created_by_user_id: createdByUserId,
          status: String(entry.status || "queued"),
          created_at: String(entry.created_at || new Date().toISOString()),
          order_date: normalizeDateOnly(entry.created_at)
        };
      });

      await insertRows(
        "orders",
        [
          "id",
          "token_number",
          "total_amount",
          "payment_mode",
          "order_type",
          "customer_name",
          "customer_address",
          "order_notes",
          "created_by_user_id",
          "status",
          "created_at",
          "order_date"
        ],
        normalizedOrders
      );
      await insertRows(
        "order_items",
        ["id", "order_id", "item_type", "menu_item_id", "appetizer_variant_id", "quantity", "line_total"],
        orderItems
      );
      await pgDb.query("COMMIT");
    } catch (error) {
      await pgDb.query("ROLLBACK");
      throw error;
    }

    await resetSequence("users");
    await resetSequence("categories");
    await resetSequence("menu_items");
    await resetSequence("appetizer_groups");
    await resetSequence("appetizer_variants");
    await resetSequence("orders");
    await resetSequence("order_items");
  } finally {
    sqlite.close();
  }
}

migrate()
  .then(() => {
    console.log("Migration complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
