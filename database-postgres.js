const { Pool, types } = require("pg");

// Keep DATE/TIMESTAMP textual to avoid implicit UTC/local conversions on serverless runtimes.
types.setTypeParser(1082, (value) => value); // date
types.setTypeParser(1114, (value) => value); // timestamp without time zone

const useSSL =
  ["1", "true"].includes(String(process.env.PGSSL || "").toLowerCase()) || Boolean(process.env.VERCEL);
function encodeSegment(value) {
  return encodeURIComponent(String(value || ""));
}

function buildConnectionStringFromParts() {
  const host = process.env.PGHOST || process.env.POSTGRES_HOST || process.env.SUPABASE_DB_HOST || "";
  const port = process.env.PGPORT || process.env.POSTGRES_PORT || "5432";
  const database = process.env.PGDATABASE || process.env.POSTGRES_DB || process.env.POSTGRES_DATABASE || "postgres";
  const user = process.env.PGUSER || process.env.POSTGRES_USER || "";
  const password = process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || "";
  if (!host || !user || !password) return "";
  return `postgresql://${encodeSegment(user)}:${encodeSegment(password)}@${host}:${port}/${database}`;
}

const rawConnectionString =
  process.env.DATABASE_URL || process.env.POSTGRES_URL || buildConnectionStringFromParts();
let connectionString = rawConnectionString;

if (useSSL && rawConnectionString) {
  try {
    // Remove ssl query params from URL so our explicit ssl config is authoritative.
    const parsed = new URL(rawConnectionString);
    parsed.searchParams.delete("sslmode");
    parsed.searchParams.delete("ssl");
    parsed.searchParams.delete("sslcert");
    parsed.searchParams.delete("sslkey");
    parsed.searchParams.delete("sslrootcert");
    connectionString = parsed.toString();
  } catch (_error) {
    connectionString = rawConnectionString;
  }
}

const pool = new Pool({
  connectionString,
  ssl: useSSL ? { rejectUnauthorized: false } : false
});
const MAX_QTY_PER_ITEM = 10;
const MAX_CUSTOMER_NAME_LEN = 75;
const MAX_CUSTOMER_ADDRESS_LEN = 255;
const MAX_ORDER_NOTES_LEN = 75;
const usersSeed = [
  { name: "Admin", username: "admin", password: "admin", role: "admin" },
  { name: "User", username: "user", password: "user", role: "user" }
];

async function query(sql, params = []) {
  return pool.query(sql, params);
}

async function run(sql, params = []) {
  const result = await query(sql, params);
  return { rowCount: result.rowCount, rows: result.rows };
}

async function get(sql, params = []) {
  const result = await query(sql, params);
  return result.rows[0] || null;
}

async function all(sql, params = []) {
  const result = await query(sql, params);
  return result.rows;
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

function toSqlBool(value, defaultValue = false) {
  if (value === undefined || value === null || value === "") return Boolean(defaultValue);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return Boolean(defaultValue);
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

function normalizeDateOnly(value) {
  if (!value) return todayIN();
  if (value instanceof Date) {
    return toINDateTime(value).slice(0, 10);
  }
  const asString = String(value).trim();
  const isoMatch = asString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  const parsed = new Date(asString);
  if (!Number.isNaN(parsed.getTime())) {
    return toINDateTime(parsed).slice(0, 10);
  }
  return todayIN();
}

function normalizeDateTime(value) {
  if (!value) return toINDateTime();
  if (value instanceof Date) return toINDateTime(value);
  const asString = String(value).trim();
  const direct = asString.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (direct) return `${direct[1]} ${direct[2]}`;
  const parsed = new Date(asString);
  if (!Number.isNaN(parsed.getTime())) return toINDateTime(parsed);
  return toINDateTime();
}

function normalizeCreatedAt(value) {
  if (!value) return value;

  if (value instanceof Date) {
    return toINDateTime(value);
  }

  const asString = String(value);
  // For TIMESTAMP WITHOUT TIME ZONE values, keep DB text as-is.
  // We store created_at in IST business time.
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(asString)) {
    return asString;
  }

  const parsed = new Date(asString);
  if (!Number.isNaN(parsed.getTime())) {
    return toINDateTime(parsed);
  }

  return asString;
}

function normalizeOrderRow(order) {
  let normalizedOrderDate = order.order_date;
  if (normalizedOrderDate instanceof Date) {
    normalizedOrderDate = toINDateTime(normalizedOrderDate).slice(0, 10);
  } else if (normalizedOrderDate != null) {
    normalizedOrderDate = String(normalizedOrderDate).slice(0, 10);
  }
  return {
    ...order,
    created_at: normalizeCreatedAt(order.created_at),
    order_date: normalizedOrderDate
  };
}

async function initDatabase() {
  await run(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      username TEXT,
      password TEXT,
      role TEXT NOT NULL CHECK(role IN ('admin', 'user')),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT");
  await run("ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT");
  await run("CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)");
  await run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique ON users(username)");
  await run("DROP INDEX IF EXISTS idx_users_role_unique");

  await run(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id SERIAL PRIMARY KEY,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      prep_time_minutes INTEGER NOT NULL CHECK(prep_time_minutes >= 0),
      description TEXT,
      image_path TEXT,
      is_peri_peri BOOLEAN NOT NULL DEFAULT FALSE,
      has_cheese BOOLEAN NOT NULL DEFAULT FALSE,
      is_tandoori BOOLEAN NOT NULL DEFAULT FALSE,
      in_stock BOOLEAN NOT NULL DEFAULT TRUE
    )
  `);
  await run("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS description TEXT");
  await run("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS image_path TEXT");
  await run("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_peri_peri BOOLEAN NOT NULL DEFAULT FALSE");
  await run("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS has_cheese BOOLEAN NOT NULL DEFAULT FALSE");
  await run("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS is_tandoori BOOLEAN NOT NULL DEFAULT FALSE");
  await run("ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS in_stock BOOLEAN NOT NULL DEFAULT TRUE");

  await run(`
    CREATE TABLE IF NOT EXISTS appetizer_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS appetizer_variants (
      id SERIAL PRIMARY KEY,
      group_id INTEGER NOT NULL REFERENCES appetizer_groups(id) ON DELETE CASCADE,
      portion_name TEXT NOT NULL,
      price REAL NOT NULL CHECK(price >= 0),
      prep_time_minutes INTEGER NOT NULL CHECK(prep_time_minutes >= 0)
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id SERIAL PRIMARY KEY,
      token_number INTEGER NOT NULL,
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      payment_mode TEXT NOT NULL CHECK(payment_mode IN ('cash', 'upi')),
      order_type TEXT NOT NULL DEFAULT 'dine_in',
      customer_name TEXT,
      customer_address TEXT,
      order_notes TEXT,
      created_by_user_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL CHECK(status IN ('queued', 'preparing', 'ready', 'completed')),
      created_at TIMESTAMP NOT NULL,
      order_date DATE NOT NULL
    )
  `);

  // Backfill/migrate older schema that may be missing order_date.
  await run("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_date DATE");
  await run("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_address TEXT");
  await run("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_notes TEXT");
  await run("ALTER TABLE orders ADD COLUMN IF NOT EXISTS created_by_user_id INTEGER REFERENCES users(id)");
  await run("UPDATE orders SET order_date = DATE(created_at) WHERE order_date IS NULL");
  await run("ALTER TABLE orders ALTER COLUMN order_date SET NOT NULL");

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id SERIAL PRIMARY KEY,
      order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL CHECK(item_type IN ('menu_item', 'appetizer')),
      menu_item_id INTEGER REFERENCES menu_items(id),
      appetizer_variant_id INTEGER REFERENCES appetizer_variants(id),
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      line_total REAL NOT NULL CHECK(line_total >= 0),
      CHECK(
        (item_type = 'menu_item' AND menu_item_id IS NOT NULL AND appetizer_variant_id IS NULL) OR
        (item_type = 'appetizer' AND appetizer_variant_id IS NOT NULL AND menu_item_id IS NULL)
      )
    )
  `);

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
    ON orders (token_number, order_date)
  `);

  await run("BEGIN");
  try {
    for (const user of usersSeed) {
      await run(
        "INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4) ON CONFLICT (username) DO NOTHING",
        [user.name, user.username, user.password, user.role]
      );
      await run("UPDATE users SET password = $1 WHERE username = $2", [user.password, user.username]);
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
        await run("UPDATE users SET username = $1 WHERE id = $2", [candidate, entry.id]);
      }
      const currentPassword = String(entry.password || "").trim();
      if (!currentPassword) {
        const userRow = await get("SELECT username FROM users WHERE id = $1", [entry.id]);
        await run("UPDATE users SET password = $1 WHERE id = $2", [String(userRow?.username || "user"), entry.id]);
      }
    }
    const adminUser = await get("SELECT id FROM users WHERE role = 'admin' ORDER BY id ASC LIMIT 1");
    if (adminUser?.id) {
      await run("UPDATE orders SET created_by_user_id = $1 WHERE created_by_user_id IS NULL", [adminUser.id]);
    }

    const oldHotdogsCategory = await get("SELECT id FROM categories WHERE name = 'Hotdogs'");
    const newHotDogsCategory = await get("SELECT id FROM categories WHERE name = 'Hot Dogs'");
    if (oldHotdogsCategory && !newHotDogsCategory) {
      await run("UPDATE categories SET name = 'Hot Dogs' WHERE id = $1", [oldHotdogsCategory.id]);
    }

    for (const categoryName of categoriesSeed) {
      await run("INSERT INTO categories (name) VALUES ($1) ON CONFLICT DO NOTHING", [categoryName]);
    }

    const oldHotdogsAfterSeed = await get("SELECT id FROM categories WHERE name = 'Hotdogs'");
    const newHotDogsAfterSeed = await get("SELECT id FROM categories WHERE name = 'Hot Dogs'");
    if (oldHotdogsAfterSeed && newHotDogsAfterSeed) {
      await run("UPDATE menu_items SET category_id = $1 WHERE category_id = $2", [
        newHotDogsAfterSeed.id,
        oldHotdogsAfterSeed.id
      ]);
    }

    const extrasCategory = await get("SELECT id FROM categories WHERE name = $1", ["Extras"]);
    if (extrasCategory?.id) {
      await run(
        `
        UPDATE menu_items
        SET category_id = $1
        WHERE category_id IS NULL
           OR category_id NOT IN (SELECT id FROM categories)
        `,
        [extrasCategory.id]
      );
    }

    const categoryRows = await all("SELECT id, name FROM categories");
    const categoryMap = new Map(categoryRows.map((row) => [row.name, row.id]));

    for (const migration of legacyNameMigrations) {
      await run("UPDATE menu_items SET name = $1 WHERE name = $2", [migration.newName, migration.oldName]);
    }
    // Correct legacy appetizer price drift from older seed versions.
    await run(
      "UPDATE menu_items SET price = $1 WHERE name = 'Tandoori Chicken Breast - Mini' AND price = $2",
      [120, 129]
    );

    for (const item of menuSeed) {
      const inferredFlags = inferFlagsFromName(item.name);
      const existing = await get(
        `
        SELECT mi.id
        FROM menu_items mi
        INNER JOIN categories c ON c.id = mi.category_id
        WHERE c.name = $1 AND mi.name = $2
        `,
        [item.category, item.name]
      );

      if (existing) {
        await run(
          `
          UPDATE menu_items
          SET category_id = $1, price = $2, prep_time_minutes = $3
          WHERE id = $4
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            categoryMap.get(item.category),
            item.name,
            item.price,
            item.prep_time_minutes,
            null,
            null,
            inferredFlags.isPeriPeri,
            inferredFlags.hasCheese,
            inferredFlags.isTandoori,
            true
          ]
        );
      }
    }

    for (const groupSeed of appetizerGroupsSeed) {
      await run("INSERT INTO appetizer_groups (name) VALUES ($1) ON CONFLICT DO NOTHING", [groupSeed.name]);
      const groupRow = await get("SELECT id FROM appetizer_groups WHERE name = $1", [groupSeed.name]);
      for (const variant of groupSeed.variants) {
        const existingVariant = await get(
          "SELECT id FROM appetizer_variants WHERE group_id = $1 AND portion_name = $2",
          [groupRow.id, variant.portion_name]
        );
        if (existingVariant) {
          await run(
            `
            UPDATE appetizer_variants
            SET price = $1, prep_time_minutes = $2
            WHERE id = $3
            `,
            [variant.price, variant.prep_time_minutes, existingVariant.id]
          );
        } else {
          await run(
            `
            INSERT INTO appetizer_variants (group_id, portion_name, price, prep_time_minutes)
            VALUES ($1, $2, $3, $4)
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
        COALESCE(mi.is_peri_peri, FALSE) AS is_peri_peri,
        COALESCE(mi.has_cheese, FALSE) AS has_cheese,
        COALESCE(mi.is_tandoori, FALSE) AS is_tandoori,
        COALESCE(mi.in_stock, TRUE) AS in_stock,
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
        (
          lower(ag.name) LIKE '%peri peri%' OR
          lower(ag.name) LIKE '%peri-peri%' OR
          lower(ag.name) LIKE '%piri piri%' OR
          lower(ag.name) LIKE '%piri-peri%'
        ) AS is_peri_peri,
        (lower(ag.name) LIKE '%cheese%') AS has_cheese,
        (lower(ag.name) LIKE '%tandoori%' OR lower(ag.name) LIKE '%tandoor%') AS is_tandoori,
        TRUE AS in_stock,
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
      COALESCE(mi.is_peri_peri, FALSE) AS is_peri_peri,
      COALESCE(mi.has_cheese, FALSE) AS has_cheese,
      COALESCE(mi.is_tandoori, FALSE) AS is_tandoori,
      COALESCE(mi.in_stock, TRUE) AS in_stock,
      COALESCE(c.id, extras.id) AS category_id,
      COALESCE(c.name, 'Extras') AS category
    FROM menu_items mi
    LEFT JOIN categories c ON c.id = mi.category_id
    LEFT JOIN categories extras ON extras.name = 'Extras'
    ORDER BY COALESCE(c.id, extras.id, 9999) ASC, mi.id ASC
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

  const extrasCategory = await get("SELECT id FROM categories WHERE name = $1", ["Extras"]);
  const extrasCategoryId = Number(extrasCategory?.id || 0) || null;

  let resolvedCategoryId = Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
  if (!resolvedCategoryId && categoryName) {
    const categoryRow = await get("SELECT id FROM categories WHERE name = $1", [categoryName]);
    resolvedCategoryId = Number(categoryRow?.id || 0) || null;
  }
  if (!resolvedCategoryId) {
    resolvedCategoryId = extrasCategoryId;
  }
  if (!resolvedCategoryId) throw new Error("Valid category is required.");

  const category = await get("SELECT id, name FROM categories WHERE id = $1", [resolvedCategoryId]);
  if (!category) {
    resolvedCategoryId = extrasCategoryId;
  }
  if (!resolvedCategoryId) throw new Error("Valid category is required.");

  const inferredFlags = inferFlagsFromName(name);
  const isPeriPeri = toSqlBool(payload.is_peri_peri, inferredFlags.isPeriPeri);
  const hasCheese = toSqlBool(payload.has_cheese, inferredFlags.hasCheese);
  const isTandoori = toSqlBool(payload.is_tandoori, inferredFlags.isTandoori);
  const inStock = toSqlBool(payload.in_stock, true);

  const inserted = await get(
    `
    INSERT INTO menu_items (
      category_id, name, price, prep_time_minutes, description, image_path,
      is_peri_peri, has_cheese, is_tandoori, in_stock
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id
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
      COALESCE(mi.is_peri_peri, FALSE) AS is_peri_peri,
      COALESCE(mi.has_cheese, FALSE) AS has_cheese,
      COALESCE(mi.is_tandoori, FALSE) AS is_tandoori,
      COALESCE(mi.in_stock, TRUE) AS in_stock,
      c.id AS category_id,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE mi.id = $1
    `,
    [inserted.id]
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
      COALESCE(mi.is_peri_peri, FALSE) AS is_peri_peri,
      COALESCE(mi.has_cheese, FALSE) AS has_cheese,
      COALESCE(mi.is_tandoori, FALSE) AS is_tandoori,
      COALESCE(mi.in_stock, TRUE) AS in_stock,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE mi.id = $1
    `,
    [id]
  );
  if (!existing) return null;

  const extrasCategory = await get("SELECT id FROM categories WHERE name = $1", ["Extras"]);
  const extrasCategoryId = Number(extrasCategory?.id || 0) || null;

  let resolvedCategoryId = Number(existing.category_id);
  if (payload.category_id !== undefined || payload.category !== undefined) {
    const categoryId = Number(payload.category_id);
    const categoryName = String(payload.category || "").trim();
    if (Number.isInteger(categoryId) && categoryId > 0) {
      resolvedCategoryId = categoryId;
    } else if (categoryName) {
      const categoryRow = await get("SELECT id FROM categories WHERE name = $1", [categoryName]);
      resolvedCategoryId = Number(categoryRow?.id || 0) || null;
    } else {
      resolvedCategoryId = null;
    }
    if (!resolvedCategoryId) {
      resolvedCategoryId = extrasCategoryId;
    }
    if (!resolvedCategoryId) throw new Error("Valid category is required.");
    const category = await get("SELECT id, name FROM categories WHERE id = $1", [resolvedCategoryId]);
    if (!category) {
      resolvedCategoryId = extrasCategoryId;
    }
    if (!resolvedCategoryId) throw new Error("Valid category is required.");
  }

  const nextName = payload.name !== undefined ? String(payload.name || "").trim() : String(existing.name || "");
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
  const nextImagePath =
    payload.image_path !== undefined
      ? (payload.image_path ? String(payload.image_path).trim() : null)
      : existing.image_path;

  const inferredFlags = inferFlagsFromName(nextName);
  const nextIsPeriPeri =
    payload.is_peri_peri !== undefined
      ? toSqlBool(payload.is_peri_peri, inferredFlags.isPeriPeri)
      : toSqlBool(existing.is_peri_peri, inferredFlags.isPeriPeri);
  const nextHasCheese =
    payload.has_cheese !== undefined
      ? toSqlBool(payload.has_cheese, inferredFlags.hasCheese)
      : toSqlBool(existing.has_cheese, inferredFlags.hasCheese);
  const nextIsTandoori =
    payload.is_tandoori !== undefined
      ? toSqlBool(payload.is_tandoori, inferredFlags.isTandoori)
      : toSqlBool(existing.is_tandoori, inferredFlags.isTandoori);
  const nextInStock =
    payload.in_stock !== undefined ? toSqlBool(payload.in_stock, true) : toSqlBool(existing.in_stock, true);

  await run(
    `
    UPDATE menu_items
    SET
      category_id = $1,
      name = $2,
      price = $3,
      prep_time_minutes = $4,
      description = $5,
      image_path = $6,
      is_peri_peri = $7,
      has_cheese = $8,
      is_tandoori = $9,
      in_stock = $10
    WHERE id = $11
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
      COALESCE(mi.is_peri_peri, FALSE) AS is_peri_peri,
      COALESCE(mi.has_cheese, FALSE) AS has_cheese,
      COALESCE(mi.is_tandoori, FALSE) AS is_tandoori,
      COALESCE(mi.in_stock, TRUE) AS in_stock,
      c.id AS category_id,
      c.name AS category
    FROM menu_items mi
    INNER JOIN categories c ON c.id = mi.category_id
    WHERE mi.id = $1
    `,
    [id]
  );
}

async function deleteMenuItem(menuItemId) {
  const id = Number(menuItemId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid menu item id.");
  const existing = await get("SELECT id FROM menu_items WHERE id = $1", [id]);
  if (!existing) return false;

  const linkedOrderItems = await get("SELECT COUNT(*)::INTEGER AS total FROM order_items WHERE menu_item_id = $1", [id]);
  if (Number(linkedOrderItems?.total || 0) > 0) {
    throw new Error("Cannot delete menu item because it is used in existing orders.");
  }

  await run("DELETE FROM menu_items WHERE id = $1", [id]);
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
    SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, customer_address, order_notes, status, created_at, order_date, created_by_user_id
    FROM orders
    WHERE order_date = $1
  `;
  if (!includeCompleted) {
    sql += " AND status != 'completed'";
  }
  sql += " ORDER BY id ASC";
  return all(sql, [todayIN()]);
}

function placeholders(count, offset = 0) {
  return Array.from({ length: count }, (_, i) => `$${i + 1 + offset}`).join(",");
}

async function attachOrderItems(orderRows) {
  if (orderRows.length === 0) return [];
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
    WHERE oi.order_id IN (${placeholders(ids.length)})
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
    ...normalizeOrderRow(order),
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
    SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, customer_address, order_notes, status, created_at, order_date, created_by_user_id
    FROM orders
    WHERE id = $1
    `,
    [orderId]
  );
  if (!row) return null;
  const [full] = await attachOrderItems([row]);
  return full;
}

async function createOrder(
  {
    items,
    payment_mode,
    order_type = "dine_in",
    customer_name = "",
    customer_address = "",
    order_notes = "",
    created_by_user_id = null
  },
  retriesLeft = 2
) {
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

  await run("BEGIN");
  try {
    const nowInIN = await get(`
      SELECT
        to_char(CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD HH24:MI:SS') AS created_at_in,
        to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY-MM-DD') AS order_date_in
    `);
    const orderDate = normalizeDateOnly(nowInIN?.order_date_in);
    const createdAt = normalizeDateTime(nowInIN?.created_at_in);

    const tokenRow = await get(
      "SELECT COALESCE(MAX(token_number), 0) + 1 AS next_token FROM orders WHERE order_date = $1",
      [orderDate]
    );
    const tokenNumber = Number(tokenRow.next_token);

    const menuRows = await all("SELECT id, name, price, COALESCE(in_stock, TRUE) AS in_stock FROM menu_items");
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
      if (!menuItem.in_stock) {
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

    const insertOrder = await get(
      `
      INSERT INTO orders (token_number, total_amount, payment_mode, order_type, customer_name, customer_address, order_notes, created_by_user_id, status, created_at, order_date)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        tokenNumber,
        totalAmount,
        payment_mode,
        order_type,
        cleanCustomerName || null,
        cleanCustomerAddress || null,
        cleanOrderNotes || null,
        Number.isInteger(Number(created_by_user_id)) ? Number(created_by_user_id) : null,
        "queued",
        createdAt,
        orderDate
      ]
    );

    for (const item of normalizedItems) {
      await run(
        `
        INSERT INTO order_items (order_id, item_type, menu_item_id, appetizer_variant_id, quantity, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          insertOrder.id,
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
        id: insertOrder.id,
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
        order_date: orderDate
      }
    ]);
    return createdOrder;
  } catch (error) {
    await run("ROLLBACK");
    if (
      retriesLeft > 0 &&
      error &&
      error.code === "23505" &&
      error.constraint === "idx_orders_daily_token_unique"
    ) {
      return createOrder(
        { items, payment_mode, order_type, customer_name, customer_address, order_notes, created_by_user_id },
        retriesLeft - 1
      );
    }
    throw error;
  }
}

async function updateOrderStatus(orderId, nextStatus) {
  const valid = ["queued", "preparing", "ready", "completed"];
  if (!valid.includes(nextStatus)) throw new Error("Invalid status.");

  const result = await run("UPDATE orders SET status = $1 WHERE id = $2", [nextStatus, orderId]);
  if (result.rowCount === 0) return null;

  const row = await get(
    `
    SELECT id, token_number, total_amount, payment_mode, order_type, customer_name, customer_address, order_notes, status, created_at, order_date, created_by_user_id
    FROM orders
    WHERE id = $1
    `,
    [orderId]
  );
  const [full] = await attachOrderItems([row]);
  return full;
}

async function getUserById(userId) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) return null;
  return get("SELECT id, name, username, role, created_at FROM users WHERE id = $1", [id]);
}

async function getUserByUsername(username) {
  const clean = String(username || "").trim().toLowerCase();
  if (!clean) return null;
  return get("SELECT id, name, username, password, role, created_at FROM users WHERE username = $1", [clean]);
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
  const existing = await get("SELECT id FROM users WHERE username = $1", [cleanUsername]);
  if (existing) throw new Error("Username already exists.");
  return get(
    "INSERT INTO users (name, username, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, username, role, created_at",
    [cleanName, cleanUsername, cleanPassword, cleanRole]
  );
}

async function updateUser(userId, { name, role, password }) {
  const id = Number(userId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid user id.");
  const existing = await get("SELECT id, role FROM users WHERE id = $1", [id]);
  if (!existing) return null;

  const updates = [];
  const params = [];
  let idx = 1;
  if (typeof name === "string") {
    const cleanName = String(name).trim();
    if (cleanName) {
      updates.push(`name = $${idx++}`);
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
    updates.push(`role = $${idx++}`);
    params.push(cleanRole);
  }
  if (typeof password === "string" && String(password).trim()) {
    const cleanPassword = String(password).trim();
    if (cleanPassword.length < 3 || cleanPassword.length > 64) {
      throw new Error("Password must be between 3 and 64 characters.");
    }
    updates.push(`password = $${idx++}`);
    params.push(cleanPassword);
  }
  if (updates.length === 0) return getUserById(id);
  params.push(id);
  await run(`UPDATE users SET ${updates.join(", ")} WHERE id = $${idx}`, params);
  return getUserById(id);
}

async function deleteUser(userId, actorUserId = null) {
  const id = Number(userId);
  const actorId = Number(actorUserId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid user id.");
  if (Number.isInteger(actorId) && actorId > 0 && actorId === id) {
    throw new Error("You cannot delete your own account.");
  }
  const existing = await get("SELECT id, role FROM users WHERE id = $1", [id]);
  if (!existing) return false;
  if (existing.role === "admin") {
    const adminCount = await get("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'");
    if (Number(adminCount?.count || 0) <= 1) {
      throw new Error("At least one admin user is required.");
    }
  }
  const result = await run("DELETE FROM users WHERE id = $1", [id]);
  return result.rowCount > 0;
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
    WHERE order_date = $1
    `,
    [todayIN()]
  );

  return {
    total_orders: Number(row?.total_orders || 0),
    cash_total: Number(row?.cash_total || 0),
    upi_total: Number(row?.upi_total || 0),
    grand_total: Number(row?.grand_total || 0)
  };
}

async function getDailyCloseReport() {
  const date = todayIN();
  const stats = await getStats();

  const statusRows = await all(
    `
    SELECT status, COUNT(*) AS count
    FROM orders
    WHERE order_date = $1
    GROUP BY status
    `,
    [date]
  );

  const orderTypeRows = await all(
    `
    SELECT order_type, COUNT(*) AS count
    FROM orders
    WHERE order_date = $1
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
    WHERE o.order_date = $1
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
  const todaysOrders = await all("SELECT id FROM orders WHERE order_date = $1", [todayIN()]);
  if (todaysOrders.length === 0) return { deleted_orders: 0 };

  const ids = todaysOrders.map((o) => o.id);
  await run("BEGIN");
  try {
    await run(`DELETE FROM order_items WHERE order_id IN (${placeholders(ids.length)})`, ids);
    const deletedOrders = await run(`DELETE FROM orders WHERE id IN (${placeholders(ids.length)})`, ids);
    await run("COMMIT");
    return { deleted_orders: deletedOrders.rowCount };
  } catch (error) {
    await run("ROLLBACK");
    throw error;
  }
}

async function deleteOrder(orderId) {
  const exists = await get("SELECT id FROM orders WHERE id = $1", [orderId]);
  if (!exists) return false;

  await run("BEGIN");
  try {
    await run("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    await run("DELETE FROM orders WHERE id = $1", [orderId]);
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

  const existingOrder = await get("SELECT id FROM orders WHERE id = $1", [orderId]);
  if (!existingOrder) {
    return null;
  }

  await run("BEGIN");
  try {
    const menuRows = await all("SELECT id, name, price, COALESCE(in_stock, TRUE) AS in_stock FROM menu_items");
    const menuMap = new Map(menuRows.map((row) => [row.id, row]));

    const appetizerRows = await all("SELECT id AS variant_id, price FROM appetizer_variants");
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
      if (!menuItem.in_stock) {
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

    await run("DELETE FROM order_items WHERE order_id = $1", [orderId]);
    for (const item of normalizedItems) {
      await run(
        `
        INSERT INTO order_items (order_id, item_type, menu_item_id, appetizer_variant_id, quantity, line_total)
        VALUES ($1, $2, $3, $4, $5, $6)
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

    await run("UPDATE orders SET total_amount = $1 WHERE id = $2", [totalAmount, orderId]);
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
  query,
  ping
};

