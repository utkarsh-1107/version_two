const { spawn } = require("node:child_process");
const assert = require("node:assert/strict");

const baseUrl = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const adminPin = process.env.ADMIN_PIN || "1234";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const raw = await response.text();
  let body = raw;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    // keep raw text body
  }
  return { response, body };
}

async function waitForHealth(timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { response } = await request("/health");
      if (response.status === 200) return;
    } catch {
      // ignore and retry
    }
    await sleep(300);
  }
  throw new Error("Server did not become healthy within timeout.");
}

function toKey(item) {
  if (item.type === "menu_item") return `menu:${item.menu_item_id}`;
  if (item.appetizer_variant_id) return `appv:${item.appetizer_variant_id}`;
  return `app:${item.group_id}:${item.variant_id}`;
}

async function run() {
  const useExternalServer = String(process.env.E2E_EXTERNAL_SERVER || "") === "1";
  const server = useExternalServer
    ? null
    : spawn(process.execPath, ["server.js"], {
        stdio: ["ignore", "pipe", "pipe"],
        env: process.env
      });
  let serverLogs = "";
  if (server) {
    server.stdout.on("data", (chunk) => {
      serverLogs += chunk.toString();
    });
    server.stderr.on("data", (chunk) => {
      serverLogs += chunk.toString();
    });
  }

  const createdOrderIds = [];

  try {
    await waitForHealth();

    const menuResult = await request("/menu");
    assert.equal(menuResult.response.status, 200, `GET /menu failed: ${JSON.stringify(menuResult.body)}`);
    assert.ok(Array.isArray(menuResult.body), "GET /menu did not return an array.");
    assert.ok(menuResult.body.length > 0, "GET /menu returned no items.");

    const menuItems = menuResult.body.filter((item) => item.type === "menu_item");
    const appetizerVariants = menuResult.body.filter((item) => item.type === "appetizer");
    assert.ok(menuItems.length > 0, "No menu_item entries found.");
    assert.ok(appetizerVariants.length > 0, "No appetizer entries found.");

    const allItemsPayload = [
      ...menuItems.map((m) => ({ type: "menu_item", menu_item_id: Number(m.id), quantity: 1 })),
      ...appetizerVariants.map((a) => ({
        type: "appetizer",
        group_id: Number(a.group_id),
        variant_id: Number(a.variant_id),
        quantity: 1
      }))
    ];

    const expectedTotal = menuResult.body.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const createAll = await request("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: allItemsPayload,
        payment_mode: "cash",
        order_type: "dine_in",
        customer_name: "E2E Full Catalog"
      })
    });
    assert.equal(createAll.response.status, 201, `POST /orders (all items) failed: ${JSON.stringify(createAll.body)}`);
    assert.ok(createAll.body?.id, "Order creation did not return id.");
    createdOrderIds.push(Number(createAll.body.id));

    const createdAllItems = Array.isArray(createAll.body.items) ? createAll.body.items : [];
    assert.equal(
      createdAllItems.length,
      allItemsPayload.length,
      `Created order items mismatch. expected=${allItemsPayload.length}, got=${createdAllItems.length}`
    );

    const returnedTotal = Number(createAll.body.total_amount || 0);
    const diff = Math.abs(returnedTotal - expectedTotal);
    assert.ok(diff < 0.01, `Total mismatch for all-items order. expected=${expectedTotal}, got=${returnedTotal}`);

    const createEditBase = await request("/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ type: "menu_item", menu_item_id: Number(menuItems[0].id), quantity: 1 }],
        payment_mode: "upi",
        order_type: "parcel",
        customer_name: "E2E Edit Base"
      })
    });
    assert.equal(createEditBase.response.status, 201, `POST /orders (edit base) failed: ${JSON.stringify(createEditBase.body)}`);
    const editOrderId = Number(createEditBase.body.id);
    createdOrderIds.push(editOrderId);

    const editPayloadItems = [
      { type: "menu_item", menu_item_id: Number(menuItems[1]?.id || menuItems[0].id), quantity: 2 },
      {
        type: "appetizer",
        appetizer_variant_id: Number(appetizerVariants[0].variant_id),
        quantity: 1
      }
    ];

    const editResponse = await request(`/orders/${editOrderId}/edit`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: editPayloadItems })
    });
    assert.equal(editResponse.response.status, 200, `PUT /orders/:id/edit failed: ${JSON.stringify(editResponse.body)}`);
    const editedItems = Array.isArray(editResponse.body.items) ? editResponse.body.items : [];
    assert.equal(editedItems.length, editPayloadItems.length, "Edited order item count mismatch.");

    const menuLookup = new Map(menuItems.map((m) => [Number(m.id), Number(m.price || 0)]));
    const appLookup = new Map(appetizerVariants.map((a) => [`${a.group_id}:${a.variant_id}`, Number(a.price || 0)]));
    const expectedEditedTotal = editPayloadItems.reduce((sum, item) => {
      if (item.type === "menu_item") return sum + Number(item.quantity) * (menuLookup.get(Number(item.menu_item_id)) || 0);
      const variant = appetizerVariants.find((entry) => Number(entry.variant_id) === Number(item.appetizer_variant_id));
      if (!variant) return sum;
      return sum + Number(item.quantity) * (appLookup.get(`${variant.group_id}:${variant.variant_id}`) || 0);
    }, 0);
    const editedTotal = Number(editResponse.body.total_amount || 0);
    assert.ok(Math.abs(editedTotal - expectedEditedTotal) < 0.01, "Edited order total mismatch.");

    const expectedKeys = new Set(editPayloadItems.map(toKey));
    const returnedKeys = new Set(
      editedItems.map((item) =>
        item.type === "menu_item" ? `menu:${item.menu_item_id}` : `appv:${item.variant_id}`
      )
    );
    assert.equal(expectedKeys.size, returnedKeys.size, "Edited order product binding size mismatch.");
    for (const key of expectedKeys) {
      assert.ok(returnedKeys.has(key), `Edited order missing item binding for ${key}`);
    }

    for (const status of ["preparing", "ready", "completed"]) {
      const statusResponse = await request(`/orders/${editOrderId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      assert.equal(
        statusResponse.response.status,
        200,
        `PUT /orders/:id/status (${status}) failed: ${JSON.stringify(statusResponse.body)}`
      );
      assert.equal(statusResponse.body.status, status, `Status transition failed for ${status}`);
    }

    console.log("E2E API check passed.");
  } finally {
    for (const orderId of createdOrderIds) {
      try {
        await request(`/orders/${orderId}`, {
          method: "DELETE",
          headers: { "x-admin-pin": adminPin }
        });
      } catch {
        // best effort cleanup
      }
    }

    if (server && !server.killed) {
      server.kill("SIGTERM");
      await sleep(400);
      if (!server.killed) {
        server.kill("SIGKILL");
      }
    }

    if (server && server.exitCode && server.exitCode !== 0) {
      console.error(serverLogs);
    }
  }
}

run().catch((error) => {
  console.error(`E2E API check failed: ${error.message || error}`);
  process.exit(1);
});
