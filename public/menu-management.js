const logoutBtn = document.getElementById("logout-btn");
const createForm = document.getElementById("create-menu-form");
const createMessage = document.getElementById("create-message");
const itemsMessage = document.getElementById("items-message");
const menuItemsGrid = document.getElementById("menu-items-grid");

function setMessage(target, text = "") {
  if (!target) return;
  target.textContent = text;
}

async function apiFetch(url, options = {}) {
  const requestOptions = { credentials: "same-origin", ...(options || {}) };
  return fetch(url, requestOptions);
}

function boolFlag(value, fallback = false) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return Boolean(fallback);
}

function getFallbackImage(item = {}) {
  const text = `${String(item?.name || "")} ${String(item?.category || "")}`.toLowerCase();
  if (text.includes("sausage")) return "/icons/csausages.png";
  if (text.includes("breast")) return "/icons/cbreast.png";
  if (text.includes("wing")) return "/icons/cwings.png";
  if (text.includes("wrap")) return "/icons/cwrap.png";
  if (text.includes("sandwich")) return "/icons/csub.png";
  if (text.includes("hotdog") || text.includes("hot dog")) return "/icons/chotdog.png";
  if (text.includes("drumstick")) return "/icons/cdrumstick.png";
  if (text.includes("tangdi") || text.includes("full leg") || text.includes("leg")) return "/icons/ctangdi.png";
  if (text.includes("cheese")) return "/icons/cheese.png";
  return "/icons/dip.png";
}

async function readFileAsDataUrl(file) {
  if (!file) return "";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
}

function itemCardTemplate(item) {
  const card = document.createElement("article");
  card.className = "menu-item-card";

  const imageSrc = String(item.image_path || "").trim() || getFallbackImage(item);
  const inStock = boolFlag(item.in_stock, true);

  card.innerHTML = `
    <div class="item-top">
      <img class="item-image" src="${imageSrc}" alt="${String(item.name || "").replaceAll('"', "&quot;")}" />
      <div>
        <div class="item-badges">
          ${boolFlag(item.is_peri_peri) ? '<span class="badge">Peri Peri</span>' : ""}
          ${boolFlag(item.has_cheese) ? '<span class="badge">Cheese</span>' : ""}
          ${boolFlag(item.is_tandoori) ? '<span class="badge">Tandoori</span>' : ""}
          <span class="badge ${inStock ? "" : "stock-out"}">${inStock ? "Available" : "Out of Stock"}</span>
        </div>
      </div>
    </div>
    <form class="item-form" action="javascript:void(0);">
      <input type="text" class="field-name" value="${String(item.name || "").replaceAll('"', "&quot;")}" required />
      <input type="number" class="field-price" min="0" step="0.01" value="${Number(item.price || 0)}" required />
      <select class="field-category">
        <option value="Wraps" ${item.category === "Wraps" ? "selected" : ""}>Wraps</option>
        <option value="Wings" ${item.category === "Wings" ? "selected" : ""}>Wings</option>
        <option value="Sandwiches" ${item.category === "Sandwiches" ? "selected" : ""}>Sandwiches</option>
        <option value="Hot Dogs" ${item.category === "Hot Dogs" ? "selected" : ""}>Hot Dogs</option>
        <option value="Full Leg" ${item.category === "Full Leg" ? "selected" : ""}>Full Leg</option>
        <option value="Drumsticks" ${item.category === "Drumsticks" ? "selected" : ""}>Drumsticks</option>
        <option value="Extras" ${item.category === "Extras" ? "selected" : ""}>Extras</option>
      </select>
      <input type="number" class="field-prep-time" min="0" step="1" value="${Number(item.prep_time_minutes || 0)}" required />
      <textarea class="field-description" rows="2" placeholder="Description (optional)">${String(item.description || "")}</textarea>
      <input type="file" class="field-image" accept="image/*" />

      <div class="flag-grid">
        <label><input type="checkbox" class="field-peri" ${boolFlag(item.is_peri_peri) ? "checked" : ""} /> Peri Peri</label>
        <label><input type="checkbox" class="field-cheese" ${boolFlag(item.has_cheese) ? "checked" : ""} /> Cheese</label>
        <label><input type="checkbox" class="field-tandoori" ${boolFlag(item.is_tandoori) ? "checked" : ""} /> Tandoori</label>
        <label><input type="checkbox" class="field-in-stock" ${inStock ? "checked" : ""} /> Available</label>
        <label><input type="checkbox" class="field-clear-image" /> Remove Current Image</label>
      </div>

      <div class="item-actions">
        <button class="row-btn save" type="submit">Save</button>
        <button class="row-btn delete" type="button" data-action="delete">Delete</button>
      </div>
    </form>
  `;

  card.dataset.id = String(item.id);
  return card;
}

async function fetchCurrentUser() {
  const response = await apiFetch("/auth/me", { cache: "no-store" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) {
      window.location.replace("/login");
      return null;
    }
    throw new Error(payload.error || "Failed to resolve user.");
  }
  if (String(payload.role || "").toLowerCase() !== "admin") {
    window.location.replace("/");
    return null;
  }
  return payload;
}

async function fetchItems() {
  const response = await apiFetch("/menu/manage", { cache: "no-store" });
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
    throw new Error(payload.error || "Failed to fetch menu items.");
  }
  return Array.isArray(payload) ? payload : [];
}

async function renderItems() {
  const items = await fetchItems();
  menuItemsGrid.innerHTML = "";
  items.forEach((item) => {
    menuItemsGrid.appendChild(itemCardTemplate(item));
  });
}

async function createItem(event) {
  event.preventDefault();
  const name = String(document.getElementById("create-name")?.value || "").trim();
  const price = Number(document.getElementById("create-price")?.value || 0);
  const category = String(document.getElementById("create-category")?.value || "").trim();
  const prepTime = Number(document.getElementById("create-prep-time")?.value || 0);
  const description = String(document.getElementById("create-description")?.value || "").trim();
  const imageFile = document.getElementById("create-image")?.files?.[0] || null;

  const payload = {
    name,
    price,
    category,
    prep_time_minutes: prepTime,
    description,
    is_peri_peri: Boolean(document.getElementById("create-peri")?.checked),
    has_cheese: Boolean(document.getElementById("create-cheese")?.checked),
    is_tandoori: Boolean(document.getElementById("create-tandoori")?.checked),
    in_stock: Boolean(document.getElementById("create-in-stock")?.checked)
  };

  if (imageFile) {
    payload.image_data_url = await readFileAsDataUrl(imageFile);
    payload.image_filename = imageFile.name || "";
  }

  const response = await apiFetch("/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    setMessage(createMessage, result.error || "Failed to create menu item.");
    return;
  }

  createForm.reset();
  document.getElementById("create-prep-time").value = "10";
  document.getElementById("create-in-stock").checked = true;
  setMessage(createMessage, "Menu item created.");
  await renderItems();
}

async function saveItem(card) {
  const itemId = Number(card.dataset.id);
  if (!Number.isInteger(itemId) || itemId <= 0) return;
  const imageFile = card.querySelector(".field-image")?.files?.[0] || null;
  const payload = {
    name: String(card.querySelector(".field-name")?.value || "").trim(),
    price: Number(card.querySelector(".field-price")?.value || 0),
    category: String(card.querySelector(".field-category")?.value || "").trim(),
    prep_time_minutes: Number(card.querySelector(".field-prep-time")?.value || 0),
    description: String(card.querySelector(".field-description")?.value || "").trim(),
    is_peri_peri: Boolean(card.querySelector(".field-peri")?.checked),
    has_cheese: Boolean(card.querySelector(".field-cheese")?.checked),
    is_tandoori: Boolean(card.querySelector(".field-tandoori")?.checked),
    in_stock: Boolean(card.querySelector(".field-in-stock")?.checked),
    clear_image: Boolean(card.querySelector(".field-clear-image")?.checked)
  };

  if (imageFile) {
    payload.image_data_url = await readFileAsDataUrl(imageFile);
    payload.image_filename = imageFile.name || "";
  }

  const response = await apiFetch(`/menu/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    setMessage(itemsMessage, result.error || "Failed to update menu item.");
    return;
  }
  setMessage(itemsMessage, "Menu item updated.");
  await renderItems();
}

async function deleteItem(card) {
  const itemId = Number(card.dataset.id);
  if (!Number.isInteger(itemId) || itemId <= 0) return;
  if (!window.confirm("Delete this menu item?")) return;
  const response = await apiFetch(`/menu/${itemId}`, { method: "DELETE" });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    setMessage(itemsMessage, result.error || "Failed to delete menu item.");
    return;
  }
  setMessage(itemsMessage, "Menu item deleted.");
  await renderItems();
}

async function handleLogout() {
  await apiFetch("/auth/logout", { method: "POST" });
  window.location.replace("/login");
}

async function init() {
  const user = await fetchCurrentUser();
  if (!user) return;

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await handleLogout();
    });
  }

  if (createForm) {
    createForm.addEventListener("submit", async (event) => {
      await createItem(event);
    });
  }

  if (menuItemsGrid) {
    menuItemsGrid.addEventListener("submit", async (event) => {
      const form = event.target.closest(".item-form");
      if (!form) return;
      event.preventDefault();
      const card = form.closest(".menu-item-card");
      if (!card) return;
      await saveItem(card);
    });

    menuItemsGrid.addEventListener("click", async (event) => {
      const deleteBtn = event.target.closest("button[data-action='delete']");
      if (!deleteBtn) return;
      const card = deleteBtn.closest(".menu-item-card");
      if (!card) return;
      await deleteItem(card);
    });
  }

  await renderItems();
}

init().catch((error) => {
  setMessage(itemsMessage, error.message || "Failed to load menu management.");
});
