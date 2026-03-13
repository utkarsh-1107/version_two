const usersTbody = document.getElementById("users-tbody");
const usersMessage = document.getElementById("users-message");
const createMessage = document.getElementById("create-message");
const createForm = document.getElementById("create-user-form");
const logoutBtn = document.getElementById("logout-btn");

function setMessage(target, text = "") {
  if (!target) return;
  target.textContent = text;
}

async function apiFetch(url, options = {}) {
  const requestOptions = { credentials: "same-origin", ...(options || {}) };
  return fetch(url, requestOptions);
}

function userRowTemplate(user) {
  const tr = document.createElement("tr");
  tr.dataset.id = String(user.id);
  tr.innerHTML = `
    <td>${user.id}</td>
    <td><input type="text" class="name-input" value="${String(user.name || "").replaceAll('"', "&quot;")}" /></td>
    <td>${user.username || "-"}</td>
    <td>
      <select class="role-select">
        <option value="user" ${user.role === "user" ? "selected" : ""}>User</option>
        <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
      </select>
    </td>
    <td><input type="password" class="password-input" placeholder="Leave empty to keep" /></td>
    <td>
      <div class="row-actions">
        <button class="row-btn save" data-action="save">Save</button>
        <button class="row-btn delete" data-action="delete">Delete</button>
      </div>
    </td>
  `;
  return tr;
}

async function fetchUsers() {
  const response = await apiFetch("/users/list", { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      window.location.replace("/login");
      return [];
    }
    if (response.status === 403) {
      window.location.replace("/");
      return [];
    }
    throw new Error(payload.error || "Failed to fetch users.");
  }
  return Array.isArray(payload) ? payload : [];
}

async function renderUsers() {
  const users = await fetchUsers();
  usersTbody.innerHTML = "";
  users.forEach((user) => {
    usersTbody.appendChild(userRowTemplate(user));
  });
}

async function createUser(event) {
  event.preventDefault();
  const name = String(document.getElementById("new-name")?.value || "").trim();
  const username = String(document.getElementById("new-username")?.value || "").trim();
  const password = String(document.getElementById("new-password")?.value || "").trim();
  const role = String(document.getElementById("new-role")?.value || "user");
  if (!username || !password) {
    setMessage(createMessage, "Username and password are required.");
    return;
  }

  const response = await apiFetch("/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, username, password, role })
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    setMessage(createMessage, payload.error || "Failed to create user.");
    return;
  }
  setMessage(createMessage, "User created.");
  createForm.reset();
  await renderUsers();
}

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const row = button.closest("tr");
  if (!row) return;
  const userId = Number(row.dataset.id);
  if (!Number.isInteger(userId) || userId <= 0) return;

  const action = button.dataset.action;
  if (action === "save") {
    const name = String(row.querySelector(".name-input")?.value || "").trim();
    const role = String(row.querySelector(".role-select")?.value || "user");
    const password = String(row.querySelector(".password-input")?.value || "").trim();
    const response = await apiFetch(`/users/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, role, password })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(usersMessage, payload.error || "Failed to update user.");
      return;
    }
    setMessage(usersMessage, "User updated.");
    await renderUsers();
    return;
  }

  if (action === "delete") {
    if (!window.confirm("Delete this user?")) return;
    const response = await apiFetch(`/users/${userId}`, { method: "DELETE" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      setMessage(usersMessage, payload.error || "Failed to delete user.");
      return;
    }
    setMessage(usersMessage, "User deleted.");
    await renderUsers();
  }
}

async function handleLogout() {
  await apiFetch("/auth/logout", { method: "POST" });
  window.location.replace("/login");
}

async function init() {
  if (createForm) {
    createForm.addEventListener("submit", async (event) => {
      await createUser(event);
    });
  }
  if (usersTbody) {
    usersTbody.addEventListener("click", async (event) => {
      await handleTableAction(event);
    });
  }
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await handleLogout();
    });
  }
  await renderUsers();
}

init().catch((error) => {
  setMessage(usersMessage, error.message || "Failed to load user management.");
});
