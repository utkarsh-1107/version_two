const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const isVercel = Boolean(process.env.VERCEL);
const dataDir = isVercel ? path.join("/tmp", "food-pos-data") : path.join(__dirname, "data");
const dbPath = path.join(dataDir, "food_orders.db");
const READ_ONLY = ["1", "true"].includes(String(process.env.READ_ONLY || "").toLowerCase());

if (!fs.existsSync(dataDir)) {
  if (READ_ONLY) {
    throw new Error("Read-only mode requires the data directory to exist.");
  }
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(
  dbPath,
  READ_ONLY ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE
);
const MAX_QTY_PER_ITEM = 10;
const MAX_CUSTOMER_NAME_LEN = 75;
const MAX_CUSTOMER_ADDRESS_LEN = 255;
const MAX_ORDER_NOTES_LEN = 75;
const usersSeed = [
  { name: "Admin", username: "admin", password: "admin", role: "admin" },
  { name: "User", username: "user", password: "user", role: "user" }
];

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

async function ping() {
  const row = await get("SELECT 1 AS ok");
  return Number(row?.ok || 0) === 1;
}

const categoriesSeed = [
  "Appetizers",
  "Wings",
  "Drumsticks",
  "Full Leg",
  "Wraps",
  "Sandwiches",
  "Hot Dogs",
  "Extras"
];

const menuSeed = [
  { category: "Wings", name: "BBQ Wings (6 pcs)", price: 150, prep_time_minutes: 20 },
  { category: "Wings", name: "Peri Peri Wings (6 pcs)", price: 150, prep_time_minutes: 20 },
  { category: "Wings", name: "Sweet Chilli Wings (6 pcs)", price: 160, prep_time_minutes: 20 },
  { category: "Wings", name: "Tandoori Wings (6 pcs)", price: 180, prep_time_minutes: 20 },

  { category: "Drumsticks", name: "BBQ Drumsticks (2 pcs)", price: 160, prep_time_minutes: 20 },
  { category: "Drumsticks", name: "Peri Peri Drumsticks (2 pcs)", price: 160, prep_time_minutes: 20 },
  { category: "Drumsticks", name: "Sweet Chilli Drumsticks (2 pcs)", price: 180, prep_time_minutes: 20 },
  { category: "Drumsticks", name: "Tandoori Drumsticks (2 pcs)", price: 200, prep_time_minutes: 20 },

  { category: "Full Leg", name: "BBQ Tangdi Kebab", price: 220, prep_time_minutes: 20 },
  { category: "Full Leg", name: "Peri Peri Tangdi Kebab", price: 220, prep_time_minutes: 20 },
  { category: "Full Leg", name: "Sweet Chilli Tangdi Kebab", price: 240, prep_time_minutes: 20 },
  { category: "Full Leg", name: "Tandoori Tangdi Kebab", price: 260, prep_time_minutes: 20 },

  { category: "Wraps", name: "BBQ Chicken Wrap", price: 130, prep_time_minutes: 10 },
  { category: "Wraps", name: "Cheese BBQ Wrap", price: 160, prep_time_minutes: 10 },
  { category: "Wraps", name: "Peri Peri Chicken Wrap", price: 150, prep_time_minutes: 10 },
  { category: "Wraps", name: "Cheese Peri Peri Wrap", price: 180, prep_time_minutes: 10 },
  { category: "Wraps", name: "Tandoori Chicken Wrap", price: 170, prep_time_minutes: 10 },
  { category: "Wraps", name: "Cheese Tandoori Wrap", price: 200, prep_time_minutes: 10 },
  { category: "Wraps", name: "Chicken Sausage Wrap", price: 150, prep_time_minutes: 10 },
  { category: "Wraps", name: "Cheese Sausage Wrap", price: 180, prep_time_minutes: 10 },

  { category: "Sandwiches", name: "BBQ Chicken Sub Sandwich", price: 130, prep_time_minutes: 10 },
  { category: "Sandwiches", name: "Cheese BBQ Sub Sandwich", price: 160, prep_time_minutes: 10 },
  { category: "Sandwiches", name: "Peri Peri Sub Sandwich", price: 150, prep_time_minutes: 10 },
  { category: "Sandwiches", name: "Cheese Peri Peri Sub Sandwich", price: 180, prep_time_minutes: 10 },
  { category: "Sandwiches", name: "Tandoori Chicken Sub Sandwich", price: 170, prep_time_minutes: 10 },
  { category: "Sandwiches", name: "Cheese Tandoori Sub Sandwich", price: 200, prep_time_minutes: 10 },

  { category: "Hot Dogs", name: "Chicken Hotdog", price: 100, prep_time_minutes: 10 },
  { category: "Hot Dogs", name: "Cheese Chicken Hotdog", price: 130, prep_time_minutes: 10 },
  { category: "Hot Dogs", name: "Peri Peri Hotdog", price: 120, prep_time_minutes: 10 },
  { category: "Hot Dogs", name: "Cheese Peri Peri Hotdog", price: 150, prep_time_minutes: 10 },

  { category: "Extras", name: "Extra Sauce Dip", price: 10, prep_time_minutes: 1 },
  { category: "Extras", name: "Extra Cheese", price: 30, prep_time_minutes: 1 }
];

const appetizerGroupsSeed = [
  {
    name: "BBQ Chicken Breast",
    variants: [
      { portion_name: "Mini", price: 100, prep_time_minutes: 10 },
      { portion_name: "Half", price: 160, prep_time_minutes: 10 },
      { portion_name: "Full", price: 300, prep_time_minutes: 10 }
    ]
  },
  {
    name: "Tandoori Chicken Breast",
    variants: [
      { portion_name: "Mini", price: 120, prep_time_minutes: 10 },
      { portion_name: "Half", price: 180, prep_time_minutes: 10 },
      { portion_name: "Full", price: 340, prep_time_minutes: 10 }
    ]
  },
  {
    name: "Grilled Chicken Sausages",
    variants: [
      { portion_name: "1 pc", price: 60, prep_time_minutes: 10 },
      { portion_name: "2 pcs", price: 100, prep_time_minutes: 10 },
      { portion_name: "3 pcs", price: 150, prep_time_minutes: 10 }
    ]
  }
];

const legacyNameMigrations = [
  { oldName: "BBQ Chicken Sub", newName: "BBQ Chicken Sub Sandwich" },
  { oldName: "Cheese BBQ Sub", newName: "Cheese BBQ Sub Sandwich" },
  { oldName: "Peri Peri Sub", newName: "Peri Peri Sub Sandwich" },
  { oldName: "Cheese Peri Peri Sub", newName: "Cheese Peri Peri Sub Sandwich" },
  { oldName: "Tandoori Chicken Sub", newName: "Tandoori Chicken Sub Sandwich" },
  { oldName: "Cheese Tandoori Sub", newName: "Cheese Tandoori Sub Sandwich" }
];

function toSqliteBool(value, defaultValue = 0) {
  if (value === undefined || value === null || value === "") return defaultValue ? 1 : 0;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number") return value > 0 ? 1 : 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return 1;
  if (["0", "false", "no", "off"].includes(normalized)) return 0;
  return defaultValue ? 1 : 0;
}

function inferFlagsFromName(name = "") {
  const text = String(name || "").toLowerCase();
  const isPeriPeri =
    text.includes("peri peri") ||
    text.includes("peri-peri") ||
    text.includes("piri piri") ||
    text.includes("piri-peri");
  const hasCheese = text.includes("cheese");
  const isTandoori = text.includes("tandoori") || text.includes("tandoor");
  return { isPeriPeri, hasCheese, isTandoori };
}

function toINDateTime(date = new Date()) {
  const options = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  };
  const formatted = new Intl.DateTimeFormat("en-GB", options).format(date);
  const [d, t] = formatted.split(", ");
  const [day, month, year] = d.split("/");
  return `${year}-${month}-${day} ${t}`;
}

function todayIN() {
  return toINDateTime().slice(0, 10);
}

async function hasColumn(tableName, columnName) {
  const columns = await all(`PRAGMA table_info(${tableName})`);
  return columns.some((c) => c.name === columnName);
}

async function getOrdersSchemaFlags() {
  const tableExists = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'orders'"
  );
  if (!tableExists) {
    return {
      hasItemsJson: false,
      hasDateKey: false,
      hasOrderType: false,
      hasCustomerName: false,
      hasCustomerAddress: false,
      hasOrderNotes: false,
      hasCreatedByUserId: false
    };
  }

  const hasItemsJson = await hasColumn("orders", "items_json");
  const hasDateKey = await hasColumn("orders", "date_key");
  const hasOrderType = await hasColumn("orders", "order_type");
  const hasCustomerName = await hasColumn("orders", "customer_name");
  const hasCustomerAddress = await hasColumn("orders", "customer_address");
  const hasOrderNotes = await hasColumn("orders", "order_notes");
  const hasCreatedByUserId = await hasColumn("orders", "created_by_user_id");
  return {
    hasItemsJson,
    hasDateKey,
    hasOrderType,
    hasCustomerName,
    hasCustomerAddress,
    hasOrderNotes,
    hasCreatedByUserId
  };
}

async function migrateOrdersTable() {
  const hasOrderType = await hasColumn("orders", "order_type");
  if (!hasOrderType) {
    await run("ALTER TABLE orders ADD COLUMN order_type TEXT NOT NULL DEFAULT 'dine_in'");
  }

  const hasCustomerName = await hasColumn("orders", "customer_name");
  if (!hasCustomerName) {
    await run("ALTER TABLE orders ADD COLUMN customer_name TEXT");
  }

  const hasCustomerAddress = await hasColumn("orders", "customer_address");
  if (!hasCustomerAddress) {
    await run("ALTER TABLE orders ADD COLUMN customer_address TEXT");
  }

  const hasOrderNotes = await hasColumn("orders", "order_notes");
  if (!hasOrderNotes) {
    await run("ALTER TABLE orders ADD COLUMN order_notes TEXT");
  }

  const hasCreatedByUserId = await hasColumn("orders", "created_by_user_id");
  if (!hasCreatedByUserId) {
    await run("ALTER TABLE orders ADD COLUMN created_by_user_id INTEGER");
  }
}

async function migrateOrderItemsTable() {
  const exists = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'order_items'"
  );
  if (!exists) return;

  const hasItemType = await hasColumn("order_items", "item_type");
  const hasVariant = await hasColumn("order_items", "appetizer_variant_id");
  if (hasItemType && hasVariant) return;

  await run("BEGIN TRANSACTION");
  try {
    await run("ALTER TABLE order_items RENAME TO order_items_legacy");
    await run(`
      CREATE TABLE order_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER NOT NULL,
        item_type TEXT NOT NULL CHECK(item_type IN ('menu_item', 'appetizer')),
        menu_item_id INTEGER,
        appetizer_variant_id INTEGER,
        quantity INTEGER NOT NULL CHECK(quantity > 0),
        line_total REAL NOT NULL CHECK(line_total >= 0),
        FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY(menu_item_id) REFERENCES menu_items(id),
        FOREIGN KEY(appetizer_variant_id) REFERENCES appetizer_variants(id),
        CHECK(
          (item_type = 'menu_item' AND menu_item_id IS NOT NULL AND appetizer_variant_id IS NULL) OR
          (item_type = 'appetizer' AND appetizer_variant_id IS NOT NULL AND menu_item_id IS NULL)
        )
      )
    `);

    await run(`
      INSERT INTO order_items (id, order_id, item_type, menu_item_id, appetizer_variant_id, quantity, line_total)
      SELECT id, order_id, 'menu_item', menu_item_id, NULL, quantity, line_total
      FROM order_items_legacy
    `);

    await run("DROP TABLE order_items_legacy");
    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

async function migrateMenuItemsTable() {
  const exists = await get(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'menu_items'"
  );
  if (!exists) return;

  if (!(await hasColumn("menu_items", "description"))) {
    await run("ALTER TABLE menu_items ADD COLUMN description TEXT");
  }
  if (!(await hasColumn("menu_items", "image_path"))) {
    await run("ALTER TABLE menu_items ADD COLUMN image_path TEXT");
  }
  if (!(await hasColumn("menu_items", "is_peri_peri"))) {
    await run("ALTER TABLE menu_items ADD COLUMN is_peri_peri INTEGER NOT NULL DEFAULT 0");
  }
  if (!(await hasColumn("menu_items", "has_cheese"))) {
    await run("ALTER TABLE menu_items ADD COLUMN has_cheese INTEGER NOT NULL DEFAULT 0");
  }
  if (!(await hasColumn("menu_items", "is_tandoori"))) {
    await run("ALTER TABLE menu_items ADD COLUMN is_tandoori INTEGER NOT NULL DEFAULT 0");
  }
  if (!(await hasColumn("menu_items", "in_stock"))) {
    await run("ALTER TABLE menu_items ADD COLUMN in_stock INTEGER NOT NULL DEFAULT 1");
  }
}

async function initDatabase() {
  if (READ_ONLY) return;
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      username TEXT,
      password TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  if (!(await hasColumn("users", "username"))) {
    await run("ALTER TABLE users ADD COLUMN username TEXT");
  }
  if (!(await hasColumn("users", "password"))) {
    await run("ALTER TABLE users ADD COLUMN password TEXT");
  }
  await run("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)");
  await run("DROP INDEX IF EXISTS idx_users_role_unique");

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      prep_time_minutes INTEGER NOT NULL CHECK(prep_time_minutes >= 0),
      description TEXT,
      image_path TEXT,
      is_peri_peri INTEGER NOT NULL DEFAULT 0 CHECK(is_peri_peri IN (0, 1)),
      has_cheese INTEGER NOT NULL DEFAULT 0 CHECK(has_cheese IN (0, 1)),
      is_tandoori INTEGER NOT NULL DEFAULT 0 CHECK(is_tandoori IN (0, 1)),
      in_stock INTEGER NOT NULL DEFAULT 1 CHECK(in_stock IN (0, 1)),
      FOREIGN KEY(category_id) REFERENCES categories(id)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appetizer_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appetizer_variants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      portion_name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      prep_time_minutes INTEGER NOT NULL CHECK(prep_time_minutes >= 0),
      FOREIGN KEY(group_id) REFERENCES appetizer_groups(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_number INTEGER NOT NULL,
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi')),
      order_type TEXT NOT NULL DEFAULT 'dine_in',
      customer_name TEXT,
      customer_address TEXT,
      order_notes TEXT,
      created_by_user_id INTEGER,
      status TEXT NOT NULL CHECK(status IN ('queued', 'preparing', 'ready', 'completed')),
      created_at TEXT NOT NULL,
      FOREIGN KEY(created_by_user_id) REFERENCES users(id)
    )
  `);

  await migrateOrdersTable();
  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      item_type TEXT NOT NULL CHECK(item_type IN ('menu_item', 'appetizer')),
      menu_item_id INTEGER,
      appetizer_variant_id INTEGER,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      line_total REAL NOT NULL CHECK(line_total >= 0),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(menu_item_id) REFERENCES menu_items(id),
      FOREIGN KEY(appetizer_variant_id) REFERENCES appetizer_variants(id),
      CHECK(
        (item_type = 'menu_item' AND menu_item_id IS NOT NULL AND appetizer_variant_id IS NULL) OR
        (item_type = 'appetizer' AND appetizer_variant_id IS NOT NULL AND menu_item_id IS NULL)
      )
    )
  `);

  await migrateOrderItemsTable();
  await migrateMenuItemsTable();

  await run("CREATE INDEX IF NOT EXISTS idx_menu_items_category_id ON menu_items(category_id)");
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_items_unique_name_per_category ON menu_items(category_id, name)");
  await run("CREATE INDEX IF NOT EXISTS idx_appetizer_variants_group_id ON appetizer_variants(group_id)");
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_appetizer_variants_group_portion ON appetizer_variants(group_id, portion_name)");
  await run("CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)");
  await run("CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)");
  await run("CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_order_items_variant_id ON order_items(appetizer_variant_id)");
  await run(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_daily_token_unique
    ON orders(token_number, date(created_at))
  `);

  await run("BEGIN TRANSACTION");
  try {
    for (const user of usersSeed) {
      await run(
        "INSERT OR IGNORE INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
        [user.name, user.username, user.password, user.role]
      );
      await run(
        "UPDATE users SET password = ? WHERE username = ?",
        [user.password, user.username]
      );
    }
    const existingUsers = await all("SELECT id, role, username, password FROM users ORDER BY id ASC");
    const usedUsernames = new Set(
      existingUsers
        .map((entry) => String(entry.username || "").trim().toLowerCase())
        .filter(Boolean)
    );
    for (const entry of existingUsers) {
      const currentUsername = String(entry.username || "").trim().toLowerCase();
      if (!currentUsername) {
        const base = String(entry.role || "user").trim().toLowerCase() === "admin" ? "admin" : "user";
        let candidate = base;
        let counter = 1;
        while (usedUsernames.has(candidate)) {
          candidate = `${base}${counter}`;
          counter += 1;
        }
        usedUsernames.add(candidate);
        await run("UPDATE users SET username = ? WHERE id = ?", [candidate, entry.id]);
      }
      const currentPassword = String(entry.password || "").trim();
      if (!currentPassword) {
        const userRow = await get("SELECT username FROM users WHERE id = ?", [entry.id]);
        await run("UPDATE users SET password = ? WHERE id = ?", [String(userRow?.username || "user"), entry.id]);
      }
    }
    const adminUser = await get("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    if (adminUser) {
      await run("UPDATE orders SET created_by_user_id = ? WHERE created_by_user_id IS NULL", [adminUser.id]);
    }

    const oldHotdogsCategory = await get("SELECT id FROM categories WHERE name = 'Hotdogs'");
    const newHotDogsCategory = await get("SELECT id FROM categories WHERE name = 'Hot Dogs'");
    if (oldHotdogsCategory && !newHotDogsCategory) {
      await run("UPDATE categories SET name = 'Hot Dogs' WHERE id = ?", [oldHotdogsCategory.id]);
    }

    for (const categoryName of categoriesSeed) {
      await run("INSERT OR IGNORE INTO categories (name) VALUES (?)", [categoryName]);
    }

    const oldHotdogsAfterSeed = await get("SELECT id FROM categories WHERE name = 'Hotdogs'");
    const newHotDogsAfterSeed = await get("SELECT id FROM categories WHERE name = 'Hot Dogs'");
    if (oldHotdogsAfterSeed && newHotDogsAfterSeed) {
      await run(
        "UPDATE menu_items SET category_id = ? WHERE category_id = ?",
        [newHotDogsAfterSeed.id, oldHotdogsAfterSeed.id]
      );
    }

    const categoryRows = await all("SELECT id, name FROM categories");
    const categoryMap = new Map(categoryRows.map((row) => [row.name, row.id]));

    for (const migration of legacyNameMigrations) {
      await run("UPDATE menu_items SET name = ? WHERE name = ?", [migration.newName, migration.oldName]);
    }
    // Correct legacy appetizer price drift from older seed versions.
    await run(
      "UPDATE menu_items SET price = 120 WHERE name = 'Tandoori Chicken Breast - Mini' AND price = 129"
    );

    for (const item of menuSeed) {
      const inferredFlags = inferFlagsFromName(item.name);
      const existing = await get(
        `
        SELECT mi.id
        FROM menu_items mi
        INNER JOIN categories c ON c.id = mi.category_id
        WHERE c.name = ? AND mi.name = ?
        `,
        [item.category, item.name]
      );

      if (existing) {
        await run(
          `
          UPDATE menu_items
          SET category_id = ?, price = ?, prep_time_minutes = ?
          WHERE id = ?
          `,
          [categoryMap.get(item.category), item.price, item.prep_time_minutes, existing.id]
        );
      } else {
        await run(
          `
          INSERT INTO menu_items (
            category_id, name, price, prep_time_minutes, description, image_path,
            is_peri_peri, has_cheese, is_tandoori, in_stock
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            categoryMap.get(item.category),
            item.name,
            item.price,
            item.prep_time_minutes,
            null,
            null,
            inferredFlags.isPeriPeri ? 1 : 0,
            inferredFlags.hasCheese ? 1 : 0,
            inferredFlags.isTandoori ? 1 : 0,
            1
          ]
        );
      }
    }

    for (const groupSeed of appetizerGroupsSeed) {
      await run("INSERT OR IGNORE INTO appetizer_groups (name) VALUES (?)", [groupSeed.name]);
      const groupRow = await get("SELECT id FROM appetizer_groups WHERE name = ?", [groupSeed.name]);
      for (const variant of groupSeed.variants) {
        const existingVariant = await get(
          "SELECT id FROM appetizer_variants WHERE group_id = ? AND portion_name = ?",
          [groupRow.id, variant.portion_name]
        );
        if (existingVariant) {
          await run(
            `
            UPDATE appetizer_variants
            SET price = ?, prep_time_minutes = ?
            WHERE id = ?
            `,
            [variant.price, variant.prep_time_minutes, existingVariant.id]
          );
        } else {
          await run(
            `
            INSERT INTO appetizer_variants (group_id, portion_name, price, prep_time_minutes)
            VALUES (?, ?, ?, ?)
            `,
            [groupRow.id, variant.portion_name, variant.price, variant.prep_time_minutes]
          );
        }
      }
    }

    await run("COMMIT");
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

async function getMenu() {
  return all(
    `
    SELECT
      id, name, price, prep_time_minutes, category, type, group_id, variant_id,
      description, image_path, is_peri_peri, has_cheese, is_tandoori, in_stock
    FROM (
      SELECT
        CAST(mi.id AS TEXT) AS id,
        mi.name,
        mi.price,
        mi.prep_time_minutes,
        c.name AS category,
        'menu_item' AS type,
        NULL AS group_id,
        NULL AS variant_id,
        COALESCE(mi.description, '') AS description,
        mi.image_path,
        COALESCE(mi.is_peri_peri, 0) AS is_peri_peri,
        COALESCE(mi.has_cheese, 0) AS has_cheese,
        COALESCE(mi.is_tandoori, 0) AS is_tandoori,
        COALESCE(mi.in_stock, 1) AS in_stock,
        c.id AS category_sort,
        mi.id AS item_sort
      FROM menu_items mi
      INNER JOIN categories c ON c.id = mi.category_id
      WHERE c.name != 'Appetizers'

      UNION ALL

      SELECT
        ('a-' || av.id) AS id,
        (ag.name || ' - ' || av.portion_name) AS name,
        av.price,
        av.prep_time_minutes,
        'Appetizers' AS category,
        'appetizer' AS type,
        ag.id AS group_id,
        av.id AS variant_id,
        '' AS description,
        NULL AS image_path,
        CASE
          WHEN lower(ag.name) LIKE '%peri peri%' OR lower(ag.name) LIKE '%peri-peri%' OR lower(ag.name) LIKE '%piri piri%' OR lower(ag.name) LIKE '%piri-peri%'
          THEN 1 ELSE 0
        END AS is_peri_peri,
        CASE WHEN lower(ag.name) LIKE '%cheese%' THEN 1 ELSE 0 END AS has_cheese,
        CASE WHEN lower(ag.name) LIKE '%tandoori%' OR lower(ag.name) LIKE '%tandoor%' THEN 1 ELSE 0 END AS is_tandoori,
        1 AS in_stock,
        1 AS category_sort,
        av.id AS item_sort
      FROM appetizer_variants av
      INNER JOIN appetizer_groups ag ON ag.id = av.group_id
    ) t
    ORDER BY t.category_sort ASC, t.item_sort ASC
    `
  );
}

async function getMenuManagementItems() {
  return all(
    `
    SELECT
      mi.id,
      mi.name,
      mi.price,
      mi.prep_time_minutes,
      COALESCE(mi.description, '') AS description,
      mi.image_path,
      COALESCE(mi.is_peri_peri, 0) AS is_peri_peri,
      COALESCE(mi.has_cheese, 0) AS has_cheese,
      COALESCE(mi.is_tandoori, 0) AS is_tandoori,
      COALESCE(mi.in_stock, 1) AS in_stock,
      c.id AS category_id,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE c.name != 'Appetizers'
    ORDER BY c.id ASC, mi.id ASC
    `
  );
}

async function createMenuItem(payload = {}) {
  const categoryId = Number(payload.category_id);
  const categoryName = String(payload.category || "").trim();
  const name = String(payload.name || "").trim();
  const description = String(payload.description || "").trim();
  const price = Number(payload.price);
  const prepTime = Number(payload.prep_time_minutes || 0);
  const imagePath = payload.image_path ? String(payload.image_path).trim() : null;

  if (!name) throw new Error("Item name is required.");
  if (!Number.isFinite(price) || price < 0) throw new Error("Price must be a valid non-negative number.");
  if (!Number.isInteger(prepTime) || prepTime < 0) throw new Error("Prep time must be a non-negative integer.");

  let resolvedCategoryId = Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
  if (!resolvedCategoryId && categoryName) {
    const categoryRow = await get("SELECT id FROM categories WHERE name = ?", [categoryName]);
    resolvedCategoryId = Number(categoryRow?.id || 0) || null;
  }
  if (!resolvedCategoryId) throw new Error("Valid category is required.");

  const category = await get("SELECT id, name FROM categories WHERE id = ?", [resolvedCategoryId]);
  if (!category || category.name === "Appetizers") {
    throw new Error("Menu management supports non-appetizer categories only.");
  }

  const inferredFlags = inferFlagsFromName(name);
  const isPeriPeri = toSqliteBool(payload.is_peri_peri, inferredFlags.isPeriPeri ? 1 : 0);
  const hasCheese = toSqliteBool(payload.has_cheese, inferredFlags.hasCheese ? 1 : 0);
  const isTandoori = toSqliteBool(payload.is_tandoori, inferredFlags.isTandoori ? 1 : 0);
  const inStock = toSqliteBool(payload.in_stock, 1);

  const insert = await run(
    `
    INSERT INTO menu_items (
      category_id, name, price, prep_time_minutes, description, image_path,
      is_peri_peri, has_cheese, is_tandoori, in_stock
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      resolvedCategoryId,
      name,
      price,
      prepTime,
      description || null,
      imagePath || null,
      isPeriPeri,
      hasCheese,
      isTandoori,
      inStock
    ]
  );

  return get(
    `
    SELECT
      mi.id,
      mi.name,
      mi.price,
      mi.prep_time_minutes,
      COALESCE(mi.description, '') AS description,
      mi.image_path,
      COALESCE(mi.is_peri_peri, 0) AS is_peri_peri,
      COALESCE(mi.has_cheese, 0) AS has_cheese,
      COALESCE(mi.is_tandoori, 0) AS is_tandoori,
      COALESCE(mi.in_stock, 1) AS in_stock,
      c.id AS category_id,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE mi.id = ?
    `,
    [insert.lastID]
  );
}

async function updateMenuItem(menuItemId, payload = {}) {
  const id = Number(menuItemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid menu item id.");

  const existing = await get(
    `
    SELECT
      mi.id,
      mi.name,
      mi.category_id,
      mi.price,
      mi.prep_time_minutes,
      COALESCE(mi.description, '') AS description,
      mi.image_path,
      COALESCE(mi.is_peri_peri, 0) AS is_peri_peri,
      COALESCE(mi.has_cheese, 0) AS has_cheese,
      COALESCE(mi.is_tandoori, 0) AS is_tandoori,
      COALESCE(mi.in_stock, 1) AS in_stock,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE mi.id = ?
    `,
    [id]
  );
  if (!existing) return null;

  let resolvedCategoryId = existing.category_id;
  if (payload.category_id !== undefined || payload.category !== undefined) {
    const categoryId = Number(payload.category_id);
    const categoryName = String(payload.category || "").trim();
    if (Number.isInteger(categoryId) && categoryId > 0) {
      resolvedCategoryId = categoryId;
    } else if (categoryName) {
      const categoryRow = await get("SELECT id FROM categories WHERE name = ?", [categoryName]);
      resolvedCategoryId = Number(categoryRow?.id || 0) || null;
    } else {
      resolvedCategoryId = null;
    }
    if (!resolvedCategoryId) throw new Error("Valid category is required.");
    const category = await get("SELECT id, name FROM categories WHERE id = ?", [resolvedCategoryId]);
    if (!category || category.name === "Appetizers") {
      throw new Error("Menu management supports non-appetizer categories only.");
    }
  }

  const nextName = payload.name !== undefined ? String(payload.name || "").trim() : existing.name;
  if (!nextName) throw new Error("Item name is required.");

  const nextPrice = payload.price !== undefined ? Number(payload.price) : Number(existing.price);
  if (!Number.isFinite(nextPrice) || nextPrice < 0) throw new Error("Price must be a valid non-negative number.");

  const nextPrepTime =
    payload.prep_time_minutes !== undefined ? Number(payload.prep_time_minutes) : Number(existing.prep_time_minutes);
  if (!Number.isInteger(nextPrepTime) || nextPrepTime < 0) {
    throw new Error("Prep time must be a non-negative integer.");
  }

  const nextDescription =
    payload.description !== undefined ? String(payload.description || "").trim() : String(existing.description || "");
  const nextImagePath = payload.image_path !== undefined
    ? (payload.image_path ? String(payload.image_path).trim() : null)
    : existing.image_path;

  const inferredFlags = inferFlagsFromName(nextName);
  const nextIsPeriPeri =
    payload.is_peri_peri !== undefined
      ? toSqliteBool(payload.is_peri_peri, inferredFlags.isPeriPeri ? 1 : 0)
      : toSqliteBool(existing.is_peri_peri, inferredFlags.isPeriPeri ? 1 : 0);
  const nextHasCheese =
    payload.has_cheese !== undefined
      ? toSqliteBool(payload.has_cheese, inferredFlags.hasCheese ? 1 : 0)
      : toSqliteBool(existing.has_cheese, inferredFlags.hasCheese ? 1 : 0);
  const nextIsTandoori =
    payload.is_tandoori !== undefined
      ? toSqliteBool(payload.is_tandoori, inferredFlags.isTandoori ? 1 : 0)
      : toSqliteBool(existing.is_tandoori, inferredFlags.isTandoori ? 1 : 0);
  const nextInStock =
    payload.in_stock !== undefined ? toSqliteBool(payload.in_stock, 1) : toSqliteBool(existing.in_stock, 1);

  await run(
    `
    UPDATE menu_items
    SET
      category_id = ?,
      name = ?,
      price = ?,
      prep_time_minutes = ?,
      description = ?,
      image_path = ?,
      is_peri_peri = ?,
      has_cheese = ?,
      is_tandoori = ?,
      in_stock = ?
    WHERE id = ?
    `,
    [
      resolvedCategoryId,
      nextName,
      nextPrice,
      nextPrepTime,
      nextDescription || null,
      nextImagePath || null,
      nextIsPeriPeri,
      nextHasCheese,
      nextIsTandoori,
      nextInStock,
      id
    ]
  );

  return get(
    `
    SELECT
      mi.id,
      mi.name,
      mi.price,
      mi.prep_time_minutes,
      COALESCE(mi.description, '') AS description,
      mi.image_path,
      COALESCE(mi.is_peri_peri, 0) AS is_peri_peri,
      COALESCE(mi.has_cheese, 0) AS has_cheese,
      COALESCE(mi.is_tandoori, 0) AS is_tandoori,
      COALESCE(mi.in_stock, 1) AS in_stock,
      c.id AS category_id,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE mi.id = ?
    `,
    [id]
  );
}

async function deleteMenuItem(menuItemId) {
  const id = Number(menuItemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid menu item id.");
  const existing = await get("SELECT id FROM menu_items WHERE id = ?", [id]);
  if (!existing) return false;

  const linkedOrderItems = await get("SELECT COUNT(*) AS total FROM order_items WHERE menu_item_id = ?", [id]);
  if (Number(linkedOrderItems?.total || 0) > 0) {
    throw new Error("Cannot delete menu item because it is used in existing orders.");
  }

  await run("DELETE FROM menu_items WHERE id = ?", [id]);
  return true;
}

async function getAppetizers() {
  const rows = await all(
    `
    SELECT
      ag.id AS group_id,
      ag.name,
      av.id AS variant_id,
      av.portion_name,
      av.price,
      av.prep_time_minutes
    FROM appetizer_groups ag
    INNER JOIN appetizer_variants av ON av.group_id = ag.id
    ORDER BY ag.id ASC, av.id ASC
    `
  );

  const grouped = new Map();
  for (const row of rows) {
    if (!grouped.has(row.group_id)) {
      grouped.set(row.group_id, {
        group_id: row.group_id,
        name: row.name,
        variants: []
      });
    }
    grouped.get(row.group_id).variants.push({
      id: row.variant_id,
      portion: row.portion_name,
      price: row.price,
      prep_time_minutes: row.prep_time_minutes
    });
  }

  return Array.from(grouped.values());
}

async function fetchOrderRows(includeCompleted = false) {
  let sql = `
    SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, status, created_at, date(created_at) AS order_date
    , created_by_user_id
    , customer_address, order_notes
    FROM orders
    WHERE date(created_at) = ?
  `;
  if (!includeCompleted) {
    sql += " AND status != 'completed'";
  }
  sql += " ORDER BY id ASC";
  return all(sql, [todayIN()]);
}

async function attachOrderItems(orderRows) {
  if (orderRows.length === 0) return [];
  const placeholders = orderRows.map(() => "?").join(",");
  const ids = orderRows.map((o) => o.id);

  const items = await all(
    `
    SELECT
      oi.order_id,
      oi.item_type,
      oi.quantity,
      oi.line_total,
      oi.menu_item_id,
      oi.appetizer_variant_id,
      mi.name AS menu_item_name,
      ag.id AS appetizer_group_id,
      ag.name AS appetizer_group_name,
      av.portion_name AS appetizer_portion_name
    FROM order_items oi
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    LEFT JOIN appetizer_variants av ON av.id = oi.appetizer_variant_id
    LEFT JOIN appetizer_groups ag ON ag.id = av.group_id
    WHERE oi.order_id IN (${placeholders})
    ORDER BY oi.id ASC
    `,
    ids
  );

  const byOrderId = new Map();
  for (const item of items) {
    if (!byOrderId.has(item.order_id)) byOrderId.set(item.order_id, []);

    let displayName = item.menu_item_name;
    if (item.item_type === "appetizer") {
      displayName = `${item.appetizer_group_name} - ${item.appetizer_portion_name}`;
    }

    byOrderId.get(item.order_id).push({
      type: item.item_type,
      menu_item_id: item.menu_item_id,
      group_id: item.appetizer_group_id,
      variant_id: item.appetizer_variant_id,
      name: displayName,
      quantity: item.quantity,
      line_total: item.line_total
    });
  }

  return orderRows.map((order) => ({
    ...order,
    items: byOrderId.get(order.id) || []
  }));
}

async function getOrders(includeCompleted = false) {
  const rows = await fetchOrderRows(includeCompleted);
  return attachOrderItems(rows);
}

async function getOrderById(orderId) {
  const row = await get(
    `
    SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, status, created_at, date(created_at) AS order_date
    , created_by_user_id
    , customer_address, order_notes
    FROM orders
    WHERE id = ?
    `,
    [orderId]
  );
  if (!row) return null;
  const [full] = await attachOrderItems([row]);
  return full;
}

async function createOrder({
  items,
  payment_mode,
  order_type = "dine_in",
  customer_name = "",
  customer_address = "",
  order_notes = "",
  created_by_user_id = null
}) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("At least one item is required.");
  }
  if (!["cash", "upi"].includes(payment_mode)) {
    throw new Error("Invalid payment mode.");
  }
  if (!["dine_in", "parcel"].includes(order_type)) {
    throw new Error("Invalid order type.");
  }

  const cleanCustomerName = String(customer_name || "").trim();
  const cleanCustomerAddress = String(customer_address || "").trim();
  const cleanOrderNotes = String(order_notes || "").trim();

  if (cleanCustomerName.length > MAX_CUSTOMER_NAME_LEN) {
    throw new Error(`Customer name must be at most ${MAX_CUSTOMER_NAME_LEN} characters.`);
  }
  if (cleanCustomerAddress.length > MAX_CUSTOMER_ADDRESS_LEN) {
    throw new Error(`Customer address must be at most ${MAX_CUSTOMER_ADDRESS_LEN} characters.`);
  }
  if (cleanOrderNotes.length > MAX_ORDER_NOTES_LEN) {
    throw new Error(`Order notes must be at most ${MAX_ORDER_NOTES_LEN} characters.`);
  }

  await run("BEGIN IMMEDIATE TRANSACTION");
  try {
    const tokenRow = await get(
      "SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token FROM orders WHERE date(created_at) = ?",
      [todayIN()]
    );
    const tokenNumber = tokenRow.next_token;

    const menuRows = await all("SELECT id, name, price, COALESCE(in_stock, 1) AS in_stock FROM menu_items");
    const menuMap = new Map(menuRows.map((row) => [row.id, row]));

    const appetizerRows = await all(
      `
      SELECT
        av.id AS variant_id,
        av.group_id,
        av.price,
        ag.name AS group_name,
        av.portion_name
      FROM appetizer_variants av
      INNER JOIN appetizer_groups ag ON ag.id = av.group_id
      `
    );
    const appetizerMap = new Map(appetizerRows.map((row) => [row.variant_id, row]));

    let totalAmount = 0;
    const normalizedItems = [];

    for (const rawItem of items) {
      const type = rawItem.type === "appetizer" ? "appetizer" : "menu_item";
      const quantity = Number(rawItem.quantity);

      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > MAX_QTY_PER_ITEM) {
        throw new Error(`Quantity must be between 1 and ${MAX_QTY_PER_ITEM}.`);
      }

      if (type === "appetizer") {
        const groupId = Number(rawItem.group_id);
        const variantId = Number(rawItem.variant_id);
        if (!Number.isInteger(groupId) || !Number.isInteger(variantId)) {
          throw new Error("Invalid appetizer payload.");
        }

        const variant = appetizerMap.get(variantId);
        if (!variant || variant.group_id !== groupId) {
          throw new Error("Invalid appetizer variant selection.");
        }

        const lineTotal = Number(variant.price) * quantity;
        totalAmount += lineTotal;
        normalizedItems.push({
          item_type: "appetizer",
          menu_item_id: null,
          appetizer_variant_id: variantId,
          quantity,
          line_total: lineTotal
        });
        continue;
      }

      const menuItemId = Number(rawItem.menu_item_id || rawItem.id);
      if (!Number.isInteger(menuItemId)) {
        throw new Error("Invalid menu item payload.");
      }

      const menuItem = menuMap.get(menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item not found: ${menuItemId}`);
      }
      if (Number(menuItem.in_stock) !== 1) {
        throw new Error(`Menu item is out of stock: ${menuItem.name}`);
      }

      const lineTotal = Number(menuItem.price) * quantity;
      totalAmount += lineTotal;
      normalizedItems.push({
        item_type: "menu_item",
        menu_item_id: menuItemId,
        appetizer_variant_id: null,
        quantity,
        line_total: lineTotal
      });
    }

    const createdAt = toINDateTime();
    const schemaFlags = await getOrdersSchemaFlags();

    const orderColumns = ["token_number", "total_amount", "payment_mode", "status", "created_at"];
    const orderValues = [tokenNumber, totalAmount, payment_mode, "queued", createdAt];

    if (schemaFlags.hasOrderType) {
      orderColumns.push("order_type");
      orderValues.push(order_type);
    }
    if (schemaFlags.hasCustomerName) {
      orderColumns.push("customer_name");
      orderValues.push(cleanCustomerName || null);
    }
    if (schemaFlags.hasCustomerAddress) {
      orderColumns.push("customer_address");
      orderValues.push(cleanCustomerAddress || null);
    }
    if (schemaFlags.hasOrderNotes) {
      orderColumns.push("order_notes");
      orderValues.push(cleanOrderNotes || null);
    }
    if (schemaFlags.hasCreatedByUserId) {
      orderColumns.push("created_by_user_id");
      orderValues.push(Number.isInteger(Number(created_by_user_id)) ? Number(created_by_user_id) : null);
    }

    if (schemaFlags.hasItemsJson) {
      orderColumns.push("items_json");
      orderValues.push(JSON.stringify(normalizedItems));
    }
    if (schemaFlags.hasDateKey) {
      orderColumns.push("date_key");
      orderValues.push(todayIN());
    }

    const placeholders = orderColumns.map(() => "?").join(", ");
    const insertOrder = await run(
      `
      INSERT INTO orders (${orderColumns.join(", ")})
      VALUES (${placeholders})
      `,
      orderValues
    );

    for (const item of normalizedItems) {
      await run(
        `
        INSERT INTO order_items (order_id, item_type, menu_item_id, appetizer_variant_id, quantity, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          insertOrder.lastID,
          item.item_type,
          item.menu_item_id,
          item.appetizer_variant_id,
          item.quantity,
          item.line_total
        ]
      );
    }

    await run("COMMIT");

    const [createdOrder] = await attachOrderItems([
      {
        id: insertOrder.lastID,
        token_number: tokenNumber,
        total_amount: totalAmount,
        payment_mode,
        order_type,
        customer_name: cleanCustomerName || null,
        customer_address: cleanCustomerAddress || null,
        order_notes: cleanOrderNotes || null,
        created_by_user_id: Number.isInteger(Number(created_by_user_id)) ? Number(created_by_user_id) : null,
        status: "queued",
        created_at: createdAt,
        order_date: createdAt.slice(0, 10)
      }
    ]);
    return createdOrder;
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

async function updateOrderStatus(orderId, nextStatus) {
  const valid = ["queued", "preparing", "ready", "completed"];
  if (!valid.includes(nextStatus)) throw new Error("Invalid status.");

  const result = await run("UPDATE orders SET status = ? WHERE id = ?", [nextStatus, orderId]);
  if (result.changes === 0) return null;

  const row = await get(
    `
    SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, customer_address, order_notes, status, created_at, date(created_at) AS order_date, created_by_user_id
    FROM orders
    WHERE id = ?
    `,
    [orderId]
  );
  const [full] = await attachOrderItems([row]);
  return full;
}

async function getUserById(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return get("SELECT id, name, username, role, created_at FROM users WHERE id = ?", [id]);
}

async function getUserByUsername(username) {
  const clean = String(username || "").trim().toLowerCase();
  if (!clean) return null;
  return get("SELECT id, name, username, password, role, created_at FROM users WHERE username = ?", [clean]);
}

async function getUsers() {
  return all(
    "SELECT id, name, username, role, created_at FROM users ORDER BY CASE WHEN role = 'admin' THEN 0 ELSE 1 END, id ASC"
  );
}

async function createUser({ name = "", username = "", password = "", role = "user" }) {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanPassword = String(password || "").trim();
  const cleanRole = String(role || "").trim().toLowerCase() === "admin" ? "admin" : "user";
  const cleanName = String(name || "").trim() || cleanUsername;
  if (!cleanUsername) throw new Error("Username is required.");
  if (!/^[a-z0-9_.-]{3,32}$/.test(cleanUsername)) {
    throw new Error("Username must be 3-32 chars (a-z, 0-9, ., _, -).");
  }
  if (cleanPassword.length < 3 || cleanPassword.length > 64) {
    throw new Error("Password must be between 3 and 64 characters.");
  }
  const existing = await get("SELECT id FROM users WHERE username = ?", [cleanUsername]);
  if (existing) throw new Error("Username already exists.");
  const insert = await run(
    "INSERT INTO users (name, username, password, role) VALUES (?, ?, ?, ?)",
    [cleanName, cleanUsername, cleanPassword, cleanRole]
  );
  return getUserById(insert.lastID);
}

async function updateUser(userId, { name, role, password }) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid user id.");
  const existing = await get("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!existing) return null;

  const updates = [];
  const params = [];
  if (typeof name === "string") {
    const cleanName = String(name).trim();
    if (cleanName) {
      updates.push("name = ?");
      params.push(cleanName);
    }
  }
  if (typeof role === "string") {
    const cleanRole = String(role).trim().toLowerCase() === "admin" ? "admin" : "user";
    if (existing.role === "admin" && cleanRole !== "admin") {
      const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
      if (Number(adminCount?.count || 0) <= 1) {
        throw new Error("At least one admin user is required.");
      }
    }
    updates.push("role = ?");
    params.push(cleanRole);
  }
  if (typeof password === "string" && String(password).trim()) {
    const cleanPassword = String(password).trim();
    if (cleanPassword.length < 3 || cleanPassword.length > 64) {
      throw new Error("Password must be between 3 and 64 characters.");
    }
    updates.push("password = ?");
    params.push(cleanPassword);
  }
  if (updates.length === 0) return getUserById(id);
  params.push(id);
  await run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
  return getUserById(id);
}

async function deleteUser(userId, actorUserId = null) {
  const id = Number(userId);
  const actorId = Number(actorUserId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid user id.");
  if (Number.isInteger(actorId) && actorId > 0 && actorId === id) {
    throw new Error("You cannot delete your own account.");
  }
  const existing = await get("SELECT id, role FROM users WHERE id = ?", [id]);
  if (!existing) return false;
  if (existing.role === "admin") {
    const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (Number(adminCount?.count || 0) <= 1) {
      throw new Error("At least one admin user is required.");
    }
  }
  const result = await run("DELETE FROM users WHERE id = ?", [id]);
  return result.changes > 0;
}

async function getStats() {
  const row = await get(
    `
    SELECT
      COUNT(*) AS total_orders,
      COALESCE(SUM(CASE WHEN payment_mode = 'cash' THEN total_amount END), 0) AS cash_total,
      COALESCE(SUM(CASE WHEN payment_mode = 'upi' THEN total_amount END), 0) AS upi_total,
      COALESCE(SUM(total_amount), 0) AS grand_total
    FROM orders
    WHERE date(created_at) = ?
    `,
    [todayIN()]
  );

  return {
    total_orders: Number(row.total_orders || 0),
    cash_total: Number(row.cash_total || 0),
    upi_total: Number(row.upi_total || 0),
    grand_total: Number(row.grand_total || 0)
  };
}

async function getDailyCloseReport() {
  const date = todayIN();
  const stats = await getStats();

  const statusRows = await all(
    `
    SELECT status, COUNT(*) AS count
    FROM orders
    WHERE date(created_at) = ?
    GROUP BY status
    `,
    [date]
  );

  const orderTypeRows = await all(
    `
    SELECT order_type, COUNT(*) AS count
    FROM orders
    WHERE date(created_at) = ?
    GROUP BY order_type
    `,
    [date]
  );

  const topItemRows = await all(
    `
    SELECT
      COALESCE(mi.name, ag.name || ' - ' || av.portion_name) AS item_name,
      SUM(oi.quantity) AS qty
    FROM order_items oi
    INNER JOIN orders o ON o.id = oi.order_id
    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
    LEFT JOIN appetizer_variants av ON av.id = oi.appetizer_variant_id
    LEFT JOIN appetizer_groups ag ON ag.id = av.group_id
    WHERE date(o.created_at) = ?
    GROUP BY COALESCE(mi.name, ag.name || ' - ' || av.portion_name)
    ORDER BY qty DESC, item_name ASC
    `,
    [date]
  );

  return {
    date,
    summary: stats,
    by_status: statusRows.reduce((acc, row) => {
      acc[row.status] = Number(row.count || 0);
      return acc;
    }, {}),
    by_order_type: orderTypeRows.reduce((acc, row) => {
      acc[row.order_type || "dine_in"] = Number(row.count || 0);
      return acc;
    }, {}),
    top_items: topItemRows.map((row) => ({
      name: row.item_name,
      quantity: Number(row.qty || 0)
    }))
  };
}

async function resetDay() {
  const todaysOrders = await all("SELECT id FROM orders WHERE date(created_at) = ?", [todayIN()]);
  if (todaysOrders.length === 0) return { deleted_orders: 0 };

  const ids = todaysOrders.map((o) => o.id);
  const placeholders = ids.map(() => "?").join(",");

  await run("BEGIN TRANSACTION");
  try {
    await run(`DELETE FROM order_items WHERE order_id IN (${placeholders})`, ids);
    const deletedOrders = await run(`DELETE FROM orders WHERE id IN (${placeholders})`, ids);
    await run("COMMIT");
    return { deleted_orders: deletedOrders.changes };
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

async function deleteOrder(orderId) {
  const exists = await get("SELECT id FROM orders WHERE id = ?", [orderId]);
  if (!exists) return false;

  await run("BEGIN TRANSACTION");
  try {
    await run("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    await run("DELETE FROM orders WHERE id = ?", [orderId]);
    await run("COMMIT");
    return true;
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

async function editOrder(orderId, items) {
  if (!Array.isArray(items)) {
    throw new Error("Items payload is required.");
  }

  const existingOrder = await get("SELECT id FROM orders WHERE id = ?", [orderId]);
  if (!existingOrder) {
    return null;
  }

  await run("BEGIN IMMEDIATE TRANSACTION");
  try {
    const menuRows = await all("SELECT id, name, price, COALESCE(in_stock, 1) AS in_stock FROM menu_items");
    const menuMap = new Map(menuRows.map((row) => [row.id, row]));

    const appetizerRows = await all(
      `
      SELECT
        av.id AS variant_id,
        av.price
      FROM appetizer_variants av
      `
    );
    const appetizerMap = new Map(appetizerRows.map((row) => [row.variant_id, row]));

    const normalizedItems = [];
    let totalAmount = 0;

    for (const rawItem of items) {
      const quantity = Number(rawItem.quantity);
      if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QTY_PER_ITEM) {
        throw new Error(`Quantity must be between 0 and ${MAX_QTY_PER_ITEM}.`);
      }
      if (quantity === 0) continue;

      const itemType =
        rawItem.type === "appetizer" || rawItem.appetizer_variant_id
          ? "appetizer"
          : "menu_item";

      if (itemType === "appetizer") {
        const variantId = Number(rawItem.appetizer_variant_id || rawItem.id);
        if (!Number.isInteger(variantId)) {
          throw new Error("Invalid appetizer item id.");
        }
        const variant = appetizerMap.get(variantId);
        if (!variant) {
          throw new Error(`Appetizer variant not found: ${variantId}`);
        }
        const lineTotal = Number(variant.price) * quantity;
        totalAmount += lineTotal;
        normalizedItems.push({
          item_type: "appetizer",
          menu_item_id: null,
          appetizer_variant_id: variantId,
          quantity,
          line_total: lineTotal
        });
        continue;
      }

      const menuItemId = Number(rawItem.menu_item_id || rawItem.id);
      if (!Number.isInteger(menuItemId)) {
        throw new Error("Invalid menu item id.");
      }
      const menuItem = menuMap.get(menuItemId);
      if (!menuItem) {
        throw new Error(`Menu item not found: ${menuItemId}`);
      }
      if (Number(menuItem.in_stock) !== 1) {
        throw new Error(`Menu item is out of stock: ${menuItem.name}`);
      }
      const lineTotal = Number(menuItem.price) * quantity;
      totalAmount += lineTotal;
      normalizedItems.push({
        item_type: "menu_item",
        menu_item_id: menuItemId,
        appetizer_variant_id: null,
        quantity,
        line_total: lineTotal
      });
    }

    if (normalizedItems.length === 0) {
      throw new Error("At least one item with quantity above 0 is required.");
    }

    await run("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    for (const item of normalizedItems) {
      await run(
        `
        INSERT INTO order_items (order_id, item_type, menu_item_id, appetizer_variant_id, quantity, line_total)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.item_type,
          item.menu_item_id,
          item.appetizer_variant_id,
          item.quantity,
          item.line_total
        ]
      );
    }

    const schemaFlags = await getOrdersSchemaFlags();
    const updateFragments = ["total_amount = ?"];
    const updateParams = [totalAmount];
    if (schemaFlags.hasItemsJson) {
      updateFragments.push("items_json = ?");
      updateParams.push(JSON.stringify(normalizedItems));
    }
    updateParams.push(orderId);
    await run(`UPDATE orders SET ${updateFragments.join(", ")} WHERE id = ?`, updateParams);

    await run("COMMIT");
    return getOrderById(orderId);
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

module.exports = {
  initDatabase,
  getUserById,
  getUserByUsername,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getMenu,
  getMenuManagementItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getAppetizers,
  getOrders,
  getOrderById,
  createOrder,
  editOrder,
  updateOrderStatus,
  getStats,
  getDailyCloseReport,
  resetDay,
  deleteOrder,
  ping
};

