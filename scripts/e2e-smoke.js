const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

function todayIN() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

class SessionClient {
  constructor(name) {
    this.name = name;
    this.cookie = "";
  }

  async request(path, options = {}) {
    const method = options.method || "GET";
    const headers = { ...(options.headers || {}) };
    if (this.cookie) headers.Cookie = this.cookie;
    if (options.body !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      redirect: options.redirect || "manual"
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const cookiePart = String(setCookie).split(";")[0].trim();
      if (cookiePart) this.cookie = cookiePart;
    }

    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch (_error) {
      json = null;
    }

    return { status: response.status, text, json };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function logStep(step, detail) {
  console.log(`[${step}] ${detail}`);
}

async function run() {
  const admin = new SessionClient("admin");
  const user = new SessionClient("user");

  const stamp = Date.now();
  const testMenuName = `E2E Test Item ${stamp}`;
  const testUsername = `e2e_user_${stamp}`;
  const testPassword = "E2E@12345";

  let createdMenuItemId = null;
  let createdOrderId = null;
  let createdUserId = null;

  logStep("0", "Checking health endpoint");
  const health = await admin.request("/health");
  assert(health.status === 200, `Health check failed (${health.status}).`);

  logStep("1", "Admin login");
  const adminLogin = await admin.request("/auth/login", {
    method: "POST",
    body: { username: "admin", password: "admin" }
  });
  assert(adminLogin.status === 200, `Admin login failed (${adminLogin.status}).`);

  const adminMe = await admin.request("/auth/me");
  assert(adminMe.status === 200, `/auth/me for admin failed (${adminMe.status}).`);
  assert(adminMe.json?.role === "admin", "Admin role mismatch.");

  logStep("2", "Admin route accessibility");
  const adminPos = await admin.request("/");
  assert(adminPos.status === 200, `Admin POS route failed (${adminPos.status}).`);
  const adminMenuPage = await admin.request("/menu-management");
  assert(adminMenuPage.status === 200, `Admin menu-management route failed (${adminMenuPage.status}).`);
  const adminReportPage = await admin.request("/daily-close-report");
  assert(adminReportPage.status === 200, `Admin daily-close-report route failed (${adminReportPage.status}).`);
  const adminUsersPage = await admin.request("/users");
  assert(adminUsersPage.status === 200, `Admin users route failed (${adminUsersPage.status}).`);

  logStep("3", "Admin menu management CRUD");
  const createMenu = await admin.request("/menu", {
    method: "POST",
    body: {
      name: testMenuName,
      price: 111,
      prep_time_minutes: 5,
      description: "E2E smoke item",
      category: "Extras",
      is_peri_peri: 1,
      has_cheese: 0,
      is_tandoori: 0,
      in_stock: 1
    }
  });
  assert(createMenu.status === 201, `Create menu failed (${createMenu.status}) ${createMenu.text}`);
  createdMenuItemId = Number(createMenu.json?.id);
  assert(Number.isInteger(createdMenuItemId) && createdMenuItemId > 0, "Invalid created menu item id.");

  const updateMenuOut = await admin.request(`/menu/${createdMenuItemId}`, {
    method: "PUT",
    body: {
      price: 119,
      is_peri_peri: 1,
      has_cheese: 1,
      is_tandoori: 1,
      in_stock: 0
    }
  });
  assert(updateMenuOut.status === 200, `Update menu out-of-stock failed (${updateMenuOut.status}).`);

  const orderBlocked = await admin.request("/orders", {
    method: "POST",
    body: {
      items: [{ menu_item_id: createdMenuItemId, quantity: 1 }],
      payment_mode: "cash",
      order_type: "dine_in"
    }
  });
  assert(orderBlocked.status === 400, `Out-of-stock order was not blocked (${orderBlocked.status}).`);

  const updateMenuIn = await admin.request(`/menu/${createdMenuItemId}`, {
    method: "PUT",
    body: { in_stock: 1 }
  });
  assert(updateMenuIn.status === 200, `Update menu in-stock failed (${updateMenuIn.status}).`);

  logStep("4", "Admin creates a normal user");
  const createUser = await admin.request("/users", {
    method: "POST",
    body: {
      name: "E2E User",
      username: testUsername,
      password: testPassword,
      role: "user"
    }
  });
  assert(createUser.status === 201, `Create user failed (${createUser.status}) ${createUser.text}`);
  createdUserId = Number(createUser.json?.id);

  const adminLogout = await admin.request("/auth/logout", { method: "POST" });
  assert(adminLogout.status === 200, `Admin logout failed (${adminLogout.status}).`);

  logStep("5", "User login and authorization checks");
  const userLogin = await user.request("/auth/login", {
    method: "POST",
    body: { username: testUsername, password: testPassword }
  });
  assert(userLogin.status === 200, `User login failed (${userLogin.status}).`);

  const userMe = await user.request("/auth/me");
  assert(userMe.status === 200, `/auth/me for user failed (${userMe.status}).`);
  assert(userMe.json?.role === "user", "User role mismatch.");

  const userPos = await user.request("/");
  assert(userPos.status === 200, `User POS route failed (${userPos.status}).`);
  const userMenuMgmtDenied = await user.request("/menu-management");
  assert(userMenuMgmtDenied.status === 403, `User should be denied menu-management (${userMenuMgmtDenied.status}).`);
  const userUsersDenied = await user.request("/users");
  assert(userUsersDenied.status === 403, `User should be denied users page (${userUsersDenied.status}).`);
  const userReportDenied = await user.request("/daily-close-report");
  assert(userReportDenied.status === 403, `User should be denied daily-close-report (${userReportDenied.status}).`);

  logStep("6", "User order placement");
  const userCreateOrder = await user.request("/orders", {
    method: "POST",
    body: {
      items: [{ menu_item_id: createdMenuItemId, quantity: 2 }],
      payment_mode: "upi",
      order_type: "parcel"
    }
  });
  assert(userCreateOrder.status === 201, `User create order failed (${userCreateOrder.status}) ${userCreateOrder.text}`);
  createdOrderId = Number(userCreateOrder.json?.id);
  assert(Number.isInteger(createdOrderId) && createdOrderId > 0, "Invalid order id from create.");

  const userOrderDetails = await user.request(`/orders/${createdOrderId}`);
  assert(userOrderDetails.status === 200, `User cannot fetch own order (${userOrderDetails.status}).`);

  const userStatusDenied = await user.request(`/orders/${createdOrderId}/status`, {
    method: "PUT",
    body: { status: "preparing" }
  });
  assert(userStatusDenied.status === 403, `User should be denied order status update (${userStatusDenied.status}).`);

  const userLogout = await user.request("/auth/logout", { method: "POST" });
  assert(userLogout.status === 200, `User logout failed (${userLogout.status}).`);

  logStep("7", "Admin updates order lifecycle and checks reports");
  const adminLoginAgain = await admin.request("/auth/login", {
    method: "POST",
    body: { username: "admin", password: "admin" }
  });
  assert(adminLoginAgain.status === 200, `Admin re-login failed (${adminLoginAgain.status}).`);

  for (const status of ["preparing", "ready", "completed"]) {
    const stepRes = await admin.request(`/orders/${createdOrderId}/status`, {
      method: "PUT",
      body: { status }
    });
    assert(stepRes.status === 200, `Admin status update to ${status} failed (${stepRes.status}).`);
  }

  const report = await admin.request(`/reports/daily-close?date=${encodeURIComponent(todayIN())}`);
  assert(report.status === 200, `Daily close report fetch failed (${report.status}).`);
  assert(report.json?.summary && report.json?.top_items, "Daily close report payload missing expected sections.");

  const reportPdf = await admin.request(`/reports/daily-close/pdf?date=${encodeURIComponent(todayIN())}&download=1`);
  assert(reportPdf.status === 200, `Daily close PDF failed (${reportPdf.status}).`);

  logStep("8", "Cleanup test data");
  if (createdOrderId) {
    const delOrder = await admin.request(`/orders/${createdOrderId}`, { method: "DELETE" });
    assert(delOrder.status === 200, `Delete order failed (${delOrder.status}).`);
  }
  if (createdMenuItemId) {
    const delMenu = await admin.request(`/menu/${createdMenuItemId}`, { method: "DELETE" });
    assert(delMenu.status === 200, `Delete menu item failed (${delMenu.status}) ${delMenu.text}`);
  }
  if (createdUserId) {
    const delUser = await admin.request(`/users/${createdUserId}`, { method: "DELETE" });
    assert(delUser.status === 200, `Delete test user failed (${delUser.status}) ${delUser.text}`);
  }

  logStep("PASS", "E2E smoke test completed successfully.");
}

run().catch((error) => {
  console.error(`[FAIL] ${error.message || String(error)}`);
  process.exitCode = 1;
});
