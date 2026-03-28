const BASE_URL = process.env.E2E_BASE_URL || "http://localhost:3000";

class SessionClient {
  constructor() {
    this.cookie = "";
  }

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.cookie) headers.Cookie = this.cookie;
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";

    const response = await fetch(`${BASE_URL}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      redirect: "manual"
    });

    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      const cookiePart = String(setCookie).split(";")[0].trim();
      if (cookiePart) this.cookie = cookiePart;
    }

    const text = await response.text();
    return { status: response.status, text };
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function has(text, token) {
  return String(text || "").includes(token);
}

function pass(label) {
  console.log(`PASS: ${label}`);
}

function fail(label) {
  console.log(`FAIL: ${label}`);
}

async function checkRoute(client, label, path, expectedStatus, checks = []) {
  const res = await client.request(path);
  assert(res.status === expectedStatus, `${label} status expected ${expectedStatus} got ${res.status}`);
  for (const check of checks) {
    const ok = check.fn(res.text);
    if (ok) pass(`${label} - ${check.name}`);
    else {
      fail(`${label} - ${check.name}`);
      throw new Error(`${label} failed check: ${check.name}`);
    }
  }
  return res;
}

async function run() {
  const admin = new SessionClient();
  const user = new SessionClient();

  const adminLogin = await admin.request("/auth/login", {
    method: "POST",
    body: { username: "admin", password: "admin" }
  });
  assert(adminLogin.status === 200, `Admin login failed (${adminLogin.status})`);

  await checkRoute(admin, "Admin POS /", "/", 200, [
    { name: "layout router mounted", fn: (t) => has(t, "AppLayoutRouter.mount()") },
    { name: "shared layout css linked", fn: (t) => has(t, "/components/layout/layout.css") },
    { name: "no hardcoded old header block", fn: (t) => !has(t, 'class="app-header"') }
  ]);

  await checkRoute(admin, "Admin Menu Management", "/menu-management", 200, [
    { name: "layout router mounted", fn: (t) => has(t, "AppLayoutRouter.mount()") },
    { name: "sidebar script included", fn: (t) => has(t, "/components/layout/Sidebar.js") },
    { name: "no Back to POS button markup", fn: (t) => !has(t, "Back to POS") },
    { name: "no page-specific menu-header", fn: (t) => !has(t, 'class="menu-header"') }
  ]);

  await checkRoute(admin, "Admin Daily Close", "/daily-close-report", 200, [
    { name: "layout router mounted", fn: (t) => has(t, "AppLayoutRouter.mount()") },
    { name: "sidebar script included", fn: (t) => has(t, "/components/layout/Sidebar.js") },
    { name: "no Back to POS button markup", fn: (t) => !has(t, "Back to POS") },
    { name: "no page-specific report-header", fn: (t) => !has(t, 'class="report-header"') }
  ]);

  await checkRoute(admin, "Admin Users", "/users", 200, [
    { name: "layout router mounted", fn: (t) => has(t, "AppLayoutRouter.mount()") },
    { name: "sidebar script included", fn: (t) => has(t, "/components/layout/Sidebar.js") },
    { name: "no Back to POS button markup", fn: (t) => !has(t, "Back to POS") },
    { name: "no page-specific users-header", fn: (t) => !has(t, 'class="users-header"') }
  ]);

  const createdUsername = `layout_user_${Date.now()}`;
  const createdPassword = "Layout@12345";
  const createUser = await admin.request("/users", {
    method: "POST",
    body: { name: "Layout Test", username: createdUsername, password: createdPassword, role: "user" }
  });
  assert(createUser.status === 201, `Create test user failed (${createUser.status})`);
  const createdUser = JSON.parse(createUser.text);
  const createdUserId = Number(createdUser.id);

  const userLogin = await user.request("/auth/login", {
    method: "POST",
    body: { username: createdUsername, password: createdPassword }
  });
  assert(userLogin.status === 200, `User login failed (${userLogin.status})`);

  await checkRoute(user, "User POS /", "/", 200, [
    { name: "layout router mounted", fn: (t) => has(t, "AppLayoutRouter.mount()") },
    { name: "shared layout css linked", fn: (t) => has(t, "/components/layout/layout.css") }
  ]);

  await checkRoute(user, "User blocked menu-management", "/menu-management", 403);
  await checkRoute(user, "User blocked daily-close-report", "/daily-close-report", 403);
  await checkRoute(user, "User blocked users", "/users", 403);

  const userLogout = await user.request("/auth/logout", { method: "POST" });
  assert(userLogout.status === 200, `User logout failed (${userLogout.status})`);

  const deleteUser = await admin.request(`/users/${createdUserId}`, { method: "DELETE" });
  assert(deleteUser.status === 200, `Cleanup user delete failed (${deleteUser.status})`);
  const adminLogout = await admin.request("/auth/logout", { method: "POST" });
  assert(adminLogout.status === 200, `Admin logout failed (${adminLogout.status})`);

  console.log("LAYOUT_E2E_PASS");
}

run().catch((error) => {
  console.error(`LAYOUT_E2E_FAIL: ${error.message || String(error)}`);
  process.exit(1);
});
