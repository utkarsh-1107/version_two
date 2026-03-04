const path = require("path");
const express = require("express");
const PDFDocument = require("pdfkit");

const postgresUrl =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.SUPABASE_DB_URL ||
  process.env.SUPABASE_DATABASE_URL ||
  process.env.PG_CONNECTION_STRING ||
  "";
if (!process.env.DATABASE_URL && postgresUrl) {
  process.env.DATABASE_URL = postgresUrl;
}

const dbClientEnv = String(process.env.DB_CLIENT || "").toLowerCase();
const hasPostgresUrl = Boolean(postgresUrl);
const usePostgres = dbClientEnv ? dbClientEnv === "postgres" : hasPostgresUrl;
const dbClient = usePostgres ? "postgres" : "sqlite";
const db = usePostgres ? require("./database-postgres") : require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const IS_VERCEL = Boolean(process.env.VERCEL);
const SKIP_DB_INIT = ["1", "true"].includes(String(process.env.SKIP_DB_INIT || "").toLowerCase());
const READ_ONLY = ["1", "true"].includes(String(process.env.READ_ONLY || "").toLowerCase());
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";
const sseClients = new Set();
const runtimeCache = {
  menu: null,
  menuExpiresAt: 0,
  stats: null,
  statsExpiresAt: 0
};

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

let initError = null;
const initPromise = (SKIP_DB_INIT ? Promise.resolve() : db.initDatabase()).catch((error) => {
  initError = error;
  console.error("Failed to initialize database:", error);
});

async function ensureDatabaseReady(res) {
  await initPromise;
  if (!initError) return true;
  res.status(500).json({
    error: "Database initialization failed.",
    detail: initError.message || String(initError)
  });
  return false;
}

function broadcastEvent(type, payload = {}) {
  const message = `event: ${type}\ndata: ${JSON.stringify({ type, ...payload, ts: Date.now() })}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(message);
    } catch (_error) {
      sseClients.delete(client);
    }
  }
}

function invalidateRuntimeCache() {
  runtimeCache.menu = null;
  runtimeCache.menuExpiresAt = 0;
  runtimeCache.stats = null;
  runtimeCache.statsExpiresAt = 0;
}

function formatInr(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function drawSectionTitle(doc, text, x, y, width) {
  doc
    .save()
    .lineWidth(1)
    .strokeColor("#D32F2F")
    .roundedRect(x, y, width, 26, 6)
    .stroke()
    .fillColor("#D32F2F")
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(String(text || "").toUpperCase(), x + 10, y + 7, { width: width - 20, align: "left" })
    .restore();
}

function renderDailyClosePdf(doc, report) {
  const pageWidth = doc.page.width;
  const margin = 40;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  doc.rect(0, 0, pageWidth, 72).fill("#D32F2F");
  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(22)
    .text("BLAZING BARBECUE", margin, 24);
  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Daily Close Report - ${report.date}`, margin, 50);

  y = 92;

  drawSectionTitle(doc, "Summary", margin, y, contentWidth);
  y += 36;

  const summary = [
    ["Total Orders", String(report.summary?.total_orders || 0)],
    ["Cash Total", formatInr(report.summary?.cash_total || 0)],
    ["UPI Total", formatInr(report.summary?.upi_total || 0)],
    ["Grand Total", formatInr(report.summary?.grand_total || 0)]
  ];

  const cardGap = 10;
  const cardWidth = (contentWidth - cardGap) / 2;
  const cardHeight = 54;
  summary.forEach((row, index) => {
    const col = index % 2;
    const rowIndex = Math.floor(index / 2);
    const x = margin + col * (cardWidth + cardGap);
    const cardY = y + rowIndex * (cardHeight + cardGap);

    doc
      .lineWidth(1)
      .strokeColor("#E6A2A2")
      .roundedRect(x, cardY, cardWidth, cardHeight, 6)
      .stroke();
    doc.fillColor("#444444").font("Helvetica").fontSize(10).text(row[0], x + 10, cardY + 10);
    doc.fillColor("#111111").font("Helvetica-Bold").fontSize(14).text(row[1], x + 10, cardY + 26);
  });

  y += cardHeight * 2 + cardGap + 8;

  const status = report.by_status || {};
  const orderType = report.by_order_type || {};
  drawSectionTitle(doc, "Breakdown", margin, y, contentWidth);
  y += 36;

  const leftWidth = (contentWidth - 16) / 2;
  const rightX = margin + leftWidth + 16;

  doc
    .lineWidth(1)
    .strokeColor("#E6A2A2")
    .roundedRect(margin, y, leftWidth, 92, 6)
    .stroke();
  doc.fillColor("#D32F2F").font("Helvetica-Bold").fontSize(11).text("By Status", margin + 10, y + 10);
  doc.fillColor("#333333").font("Helvetica").fontSize(10);
  doc.text(`Queued: ${status.queued || 0}`, margin + 10, y + 30);
  doc.text(`Preparing: ${status.preparing || 0}`, margin + 10, y + 46);
  doc.text(`Ready: ${status.ready || 0}`, margin + 10, y + 62);
  doc.text(`Completed: ${status.completed || 0}`, margin + 10, y + 78);

  doc
    .lineWidth(1)
    .strokeColor("#E6A2A2")
    .roundedRect(rightX, y, leftWidth, 92, 6)
    .stroke();
  doc.fillColor("#D32F2F").font("Helvetica-Bold").fontSize(11).text("By Order Type", rightX + 10, y + 10);
  doc.fillColor("#333333").font("Helvetica").fontSize(10);
  doc.text(`Dine In: ${orderType.dine_in || 0}`, rightX + 10, y + 36);
  doc.text(`Parcel: ${orderType.parcel || 0}`, rightX + 10, y + 56);

  y += 110;
  drawSectionTitle(doc, "Item Consumption (Plates)", margin, y, contentWidth);
  y += 36;

  const consumedItems = Array.isArray(report.top_items) ? report.top_items : [];
  if (consumedItems.length === 0) {
    doc.fillColor("#666666").font("Helvetica").fontSize(10).text("No item sales today.", margin, y);
  } else {
    const most = consumedItems[0];
    doc
      .lineWidth(1)
      .strokeColor("#E6A2A2")
      .roundedRect(margin, y, contentWidth, 28, 6)
      .stroke();
    doc
      .fillColor("#B71C1C")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`Most consumed today: ${most.name} (${most.quantity} plates)`, margin + 10, y + 8);
    y += 40;

    const rowHeight = 22;
    consumedItems.forEach((item, idx) => {
      if (y + rowHeight > doc.page.height - 48) {
        doc.addPage();
        y = margin;
        drawSectionTitle(doc, "Item Consumption (Plates)", margin, y, contentWidth);
        y += 36;
      }
      doc
        .lineWidth(1)
        .strokeColor("#F1C9C9")
        .roundedRect(margin, y, contentWidth, 20, 4)
        .stroke();
      doc
        .fillColor("#333333")
        .font("Helvetica")
        .fontSize(10)
        .text(`${idx + 1}. ${item.name || "-"}`, margin + 8, y + 5, { width: contentWidth - 90 });
      doc
        .fillColor("#111111")
        .font("Helvetica-Bold")
        .text(`${item.quantity || 0} plates`, margin + contentWidth - 80, y + 5, {
          width: 72,
          align: "right"
        });
      y += rowHeight;
    });
  }

  doc
    .fillColor("#666666")
    .font("Helvetica")
    .fontSize(9)
    .text(`Generated: ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`, margin, doc.page.height - 30);
}

app.get("/health", async (req, res) => {
  await initPromise;
  if (initError) {
    return res.status(500).json({
      status: "error",
      error: "Database initialization failed.",
      detail: initError.message || String(initError),
      config: {
        db_client: dbClient,
        is_vercel: IS_VERCEL,
        read_only: READ_ONLY,
        skip_db_init: SKIP_DB_INIT
      }
    });
  }

  return res.json({
    status: "ok",
    database: "ready",
    config: {
      db_client: dbClient,
      is_vercel: IS_VERCEL,
      read_only: READ_ONLY,
      skip_db_init: SKIP_DB_INIT
    }
  });
});

app.get("/events", async (req, res) => {
  if (!(await ensureDatabaseReady(res))) return;
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  res.write("retry: 3000\n\n");

  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
    res.end();
  });
});

app.get("/menu", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const now = Date.now();
    if (runtimeCache.menu && runtimeCache.menuExpiresAt > now) {
      res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
      return res.json(runtimeCache.menu);
    }

    const menu = await db.getMenu();
    runtimeCache.menu = menu;
    runtimeCache.menuExpiresAt = now + 5 * 60 * 1000;
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
    res.json(menu);
  } catch (error) {
    console.error("GET /menu failed:", error);
    res.status(500).json({
      error: "Failed to fetch menu.",
      detail: error.message || String(error)
    });
  }
});

app.get("/appetizers", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const appetizers = await db.getAppetizers();
    res.json(appetizers);
  } catch (error) {
    console.error("GET /appetizers failed:", error);
    res.status(500).json({ error: "Failed to fetch appetizers." });
  }
});

app.get("/orders", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const includeCompleted = req.query.includeCompleted === "true";
    const orders = await db.getOrders(includeCompleted);
    res.setHeader("Cache-Control", "no-store");
    res.json(orders);
  } catch (error) {
    console.error("GET /orders failed:", error);
    res.status(500).json({ error: "Failed to fetch orders." });
  }
});

app.get("/orders/:id", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const order = await db.getOrderById(orderId);
    if (!order) {
      return res.status(404).json({ error: "Order not found." });
    }
    return res.json(order);
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch order." });
  }
});

app.post("/orders", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    if (READ_ONLY) {
      return res.status(405).json({ error: "Read-only mode is enabled." });
    }
    const { items, payment_mode, order_type, customer_name, customer_address, order_notes } = req.body;
    const order = await db.createOrder({
      items,
      payment_mode,
      order_type,
      customer_name,
      customer_address,
      order_notes
    });
    invalidateRuntimeCache();
    broadcastEvent("orders_changed", { action: "created", order_id: order.id });
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message || "Failed to create order." });
  }
});

app.put("/orders/:id/status", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    if (READ_ONLY) {
      return res.status(405).json({ error: "Read-only mode is enabled." });
    }
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const { status } = req.body;
    const updated = await db.updateOrderStatus(orderId, status);
    if (!updated) {
      return res.status(404).json({ error: "Order not found." });
    }

    invalidateRuntimeCache();
    broadcastEvent("orders_changed", { action: "status_updated", order_id: orderId, status });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to update order status." });
  }
});

app.put("/orders/:id/edit", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    if (READ_ONLY) {
      return res.status(405).json({ error: "Read-only mode is enabled." });
    }

    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const { items } = req.body;
    const updated = await db.editOrder(orderId, items);
    if (!updated) {
      return res.status(404).json({ error: "Order not found." });
    }

    invalidateRuntimeCache();
    broadcastEvent("orders_changed", { action: "edited", order_id: orderId });
    return res.json(updated);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to edit order." });
  }
});

app.delete("/orders/:id", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    if (READ_ONLY) {
      return res.status(405).json({ error: "Read-only mode is enabled." });
    }
    const orderId = Number(req.params.id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      return res.status(400).json({ error: "Invalid order id." });
    }

    const providedPin = String(req.header("x-admin-pin") || req.body?.admin_pin || "").trim();
    if (!providedPin || providedPin !== String(ADMIN_PIN).trim()) {
      return res.status(403).json({ error: "Admin access denied." });
    }

    const deleted = await db.deleteOrder(orderId);
    if (!deleted) {
      return res.status(404).json({ error: "Order not found." });
    }

    invalidateRuntimeCache();
    broadcastEvent("orders_changed", { action: "deleted", order_id: orderId });
    return res.json({ message: "Order deleted." });
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to delete order." });
  }
});

app.get("/stats", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const now = Date.now();
    if (runtimeCache.stats && runtimeCache.statsExpiresAt > now) {
      res.setHeader("Cache-Control", "no-store");
      return res.json(runtimeCache.stats);
    }

    const stats = await db.getStats();
    runtimeCache.stats = stats;
    runtimeCache.statsExpiresAt = now + 2 * 1000;
    res.setHeader("Cache-Control", "no-store");
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats." });
  }
});

app.get("/reports/daily-close", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const report = await db.getDailyCloseReport();
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch daily close report." });
  }
});

app.get("/reports/daily-close/pdf", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    const report = await db.getDailyCloseReport();
    const filename = `daily-close-${report.date || "report"}.pdf`;
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      info: {
        Title: "Daily Close Report",
        Author: "Blazing Barbecue POS"
      }
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);
    doc.pipe(res);
    renderDailyClosePdf(doc, report);
    doc.end();
  } catch (error) {
    res.status(500).json({ error: "Failed to generate daily close PDF." });
  }
});

app.post("/reset-day", async (req, res) => {
  try {
    if (!(await ensureDatabaseReady(res))) return;
    if (READ_ONLY) {
      return res.status(405).json({ error: "Read-only mode is enabled." });
    }
    const result = await db.resetDay();
    invalidateRuntimeCache();
    broadcastEvent("orders_changed", { action: "reset_day" });
    res.json({ message: "Day reset complete.", ...result });
  } catch (error) {
    res.status(500).json({ error: "Failed to reset day." });
  }
});

if (!IS_VERCEL) {
  initPromise
    .then(() => {
      if (initError) {
        process.exit(1);
      }
      app.listen(PORT, () => {
        console.log(`Food order system running at http://localhost:${PORT}`);
      });
    })
    .catch(() => process.exit(1));
}

module.exports = app;
