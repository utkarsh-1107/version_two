const logoutBtn = document.getElementById("logout-btn");
const createForm = document.getElementById("create-menu-form");
const createMessage = document.getElementById("create-message");
const itemsMessage = document.getElementById("items-message");
const categorySectionsEl = document.getElementById("menu-category-sections");
const modalEl = document.getElementById("menu-item-modal");
const modalTitleEl = document.getElementById("modal-title");
const modalBodyEl = document.getElementById("modal-body");
const modalCloseBtn = document.getElementById("modal-close-btn");
const createNameInput = document.getElementById("create-name");
const createPriceInput = document.getElementById("create-price");
const createCategorySelect = document.getElementById("create-category");
const createPrepTimeInput = document.getElementById("create-prep-time");
const createDescriptionInput = document.getElementById("create-description");
const createImageInput = document.getElementById("create-image");
const createPeriInput = document.getElementById("create-peri");
const createCheeseInput = document.getElementById("create-cheese");
const createTandooriInput = document.getElementById("create-tandoori");
const createInStockInput = document.getElementById("create-in-stock");

const CATEGORY_ORDER = [
  "Appetizers",
  "Wraps",
  "Wings",
  "Sandwiches",
  "Hot Dogs",
  "Full Leg",
  "Drumsticks",
  "Extras"
];

const CATEGORY_SET = new Set(CATEGORY_ORDER);
let menuItems = [];

function setMessage(target, text = "") {
  if (!target) return;
  target.textContent = text;
}

function clearMessages() {
  setMessage(createMessage, "");
  setMessage(itemsMessage, "");
}

async function apiFetch(url, options = {}) {
  const requestOptions = { credentials: "same-origin", ...(options || {}) };
  return fetch(url, requestOptions);
}

async function readJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;
  if (response.status === 401) {
    window.location.replace("/login");
    return null;
  }
  if (response.status === 403) {
    window.location.replace("/");
    return null;
  }
  throw new Error(payload.error || "Request failed.");
}

async function requestJson(url, options = {}) {
  const response = await apiFetch(url, options);
  return readJsonResponse(response);
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

function normalizeCategoryName(category = "") {
  const raw = String(category || "").trim().toLowerCase();
  if (!raw) return "Extras";
  if (raw === "hotdogs") return "Hot Dogs";
  const byTitleCase = raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return CATEGORY_SET.has(byTitleCase) ? byTitleCase : "Extras";
}

function getOrderedGroupedItems(items) {
  const grouped = new Map();
  CATEGORY_ORDER.forEach((category) => grouped.set(category, []));

  items.forEach((item) => {
    const category = normalizeCategoryName(item?.category || "");
    grouped.get(category).push(item);
  });

  CATEGORY_ORDER.forEach((category) => {
    grouped.get(category).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  });

  return CATEGORY_ORDER.map((category) => ({
    category,
    items: grouped.get(category) || []
  })).filter((section) => section.items.length > 0);
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

function inferFlagsFromItemName(name = "") {
  const text = String(name || "").trim().toLowerCase();
  return {
    isPeriPeri:
      text.includes("peri peri") ||
      text.includes("peri-peri") ||
      text.includes("piri piri") ||
      text.includes("piri-peri"),
    hasCheese: text.includes("cheese"),
    isTandoori: text.includes("tandoori") || text.includes("tandoor")
  };
}

function getResolvedVisualFlags(item = {}) {
  const inferred = inferFlagsFromItemName(item.name || "");
  return {
    isPeriPeri: boolFlag(item.is_peri_peri, inferred.isPeriPeri),
    hasCheese: boolFlag(item.has_cheese, inferred.hasCheese),
    isTandoori: boolFlag(item.is_tandoori, inferred.isTandoori)
  };
}

function getCardAccentType(item = {}) {
  const { isPeriPeri: isPeri, hasCheese } = getResolvedVisualFlags(item);
  if (isPeri && hasCheese) return "peri-cheese";
  if (isPeri) return "peri";
  if (hasCheese) return "cheese";
  return "";
}

function getItemById(itemId) {
  const id = String(itemId || "").trim();
  return menuItems.find((entry) => String(entry.id) === id) || null;
}

function closeAllCardMenus() {
  if (!categorySectionsEl) return;
  categorySectionsEl.querySelectorAll(".card-menu").forEach((menu) => {
    menu.classList.add("hidden");
  });
}

function toggleCardMenu(menuEl) {
  const willOpen = menuEl.classList.contains("hidden");
  closeAllCardMenus();
  menuEl.classList.toggle("hidden", !willOpen);
}

function cardTemplate(item) {
  const card = document.createElement("article");
  card.className = "menu-item-card";
  card.dataset.id = String(item.id);
  const inStock = boolFlag(item.in_stock, true);
  const imageSrc = String(item.image_path || "").trim() || getFallbackImage(item);
  const isAppetizerGroup = String(item.entity_type || "") === "appetizer_group";
  const visualFlags = getResolvedVisualFlags(item);
  const accentType = getCardAccentType(item);
  if (visualFlags.isTandoori) {
    card.classList.add("menu-item-card-tandoori");
  }
  if (accentType) {
    card.classList.add("menu-item-card-corner-accent", `menu-item-card-corner-${accentType}`);
  }
  const cornerAccentMarkup = accentType
    ? `<span class="card-corner-accent card-corner-accent-${accentType}" aria-hidden="true"></span>`
    : "";

  card.innerHTML = `
    ${cornerAccentMarkup}
    ${isAppetizerGroup ? "" : `
      <button class="card-menu-btn" type="button" aria-label="Open actions">&#8942;</button>
      <div class="card-menu hidden">
        <button class="card-menu-item" data-action="view-details" type="button">View Details</button>
        <button class="card-menu-item" data-action="edit-item" type="button">Edit Item</button>
        <button class="card-menu-item" data-action="update-image" type="button">Update Image</button>
        <button class="card-menu-item" data-action="duplicate-item" type="button">Duplicate Item</button>
        <button class="card-menu-item" data-action="delete-item" type="button">Delete Item</button>
      </div>
    `}

    <div class="card-top">
      <img class="item-image" src="${imageSrc}" alt="${String(item.name || "").replaceAll('"', "&quot;")}" />
      <div>
        <h4 class="item-name">${String(item.name || "")}</h4>
        <p class="item-price">Rs ${Number(item.price || 0).toFixed(2)}</p>
      </div>
    </div>

    <div class="item-badges">
      ${visualFlags.isPeriPeri ? '<span class="badge badge-peri">Peri Peri</span>' : ""}
      ${visualFlags.hasCheese ? '<span class="badge badge-cheese">Cheese</span>' : ""}
      ${visualFlags.isTandoori ? '<span class="badge badge-tandoori">Tandoori</span>' : ""}
    </div>

    <div class="stock-row">
      <label class="stock-label">
        <input class="availability-toggle" data-item-id="${item.id}" type="checkbox" ${inStock ? "checked" : ""} />
        <span>${inStock ? "Available" : "Out of Stock"}</span>
      </label>
    </div>
  `;

  return card;
}

function sectionTemplate(category, items) {
  const section = document.createElement("section");
  section.className = "category-section";
  const title = document.createElement("h3");
  title.className = "category-title";
  title.textContent = category;

  const grid = document.createElement("div");
  grid.className = "cards-grid";
  items.forEach((item) => {
    grid.appendChild(cardTemplate(item));
  });

  section.appendChild(title);
  section.appendChild(grid);
  return section;
}

function renderItems() {
  if (!categorySectionsEl) return;
  categorySectionsEl.innerHTML = "";
  const sections = getOrderedGroupedItems(menuItems);
  if (sections.length === 0) {
    categorySectionsEl.innerHTML = '<p class="message">No menu items found.</p>';
    return;
  }
  sections.forEach((section) => {
    categorySectionsEl.appendChild(sectionTemplate(section.category, section.items));
  });
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

async function optimizeImageDataUrl(file, maxSize = 720, quality = 0.82) {
  if (!file) return "";
  if (String(file.type || "").toLowerCase() === "image/gif") {
    return readFileAsDataUrl(file);
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const longestSide = Math.max(img.naturalWidth || img.width || 0, img.naturalHeight || img.height || 0) || 1;
      const scale = Math.min(1, maxSize / longestSide);
      const targetWidth = Math.max(1, Math.round((img.naturalWidth || img.width || 1) * scale));
      const targetHeight = Math.max(1, Math.round((img.naturalHeight || img.height || 1) * scale));

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(sourceDataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      try {
        resolve(canvas.toDataURL("image/webp", quality));
      } catch (_error) {
        resolve(sourceDataUrl);
      }
    };
    img.onerror = () => reject(new Error("Failed to process image file."));
    img.src = sourceDataUrl;
  });
}

function openModal(title, bodyHtml) {
  if (!modalEl || !modalTitleEl || !modalBodyEl) return;
  modalTitleEl.textContent = title;
  modalBodyEl.innerHTML = bodyHtml;
  modalEl.classList.remove("hidden");
  modalEl.setAttribute("aria-hidden", "false");
}

function closeModal() {
  if (!modalEl || !modalBodyEl) return;
  modalBodyEl.innerHTML = "";
  modalEl.classList.add("hidden");
  modalEl.setAttribute("aria-hidden", "true");
}

async function fetchCurrentUser() {
  const payload = await requestJson("/auth/me", { cache: "no-store" });
  if (!payload) return null;
  if (String(payload.role || "").toLowerCase() !== "admin") {
    window.location.replace("/");
    return null;
  }
  return payload;
}

async function fetchItems() {
  const payload = await requestJson("/menu/manage", { cache: "no-store" });
  if (!payload) return;
  menuItems = Array.isArray(payload) ? payload : [];
  renderItems();
}

function buildCategoryOptions(selectedCategory = "Extras") {
  return CATEGORY_ORDER.map((category) => {
    const selected = normalizeCategoryName(selectedCategory) === category ? "selected" : "";
    return `<option value="${category}" ${selected}>${category}</option>`;
  }).join("");
}

function openDetailsModal(item) {
  const imageSrc = String(item.image_path || "").trim() || getFallbackImage(item);
  const html = `
    <div class="details-grid">
      <img class="item-image" src="${imageSrc}" alt="${String(item.name || "").replaceAll('"', "&quot;")}" />
      <div class="details-row"><strong>Name:</strong> ${String(item.name || "")}</div>
      <div class="details-row"><strong>Category:</strong> ${normalizeCategoryName(item.category || "")}</div>
      <div class="details-row"><strong>Price:</strong> Rs ${Number(item.price || 0).toFixed(2)}</div>
      <div class="details-row"><strong>Description:</strong> ${String(item.description || "-")}</div>
      <div class="details-row"><strong>Peri Peri:</strong> ${boolFlag(item.is_peri_peri) ? "Yes" : "No"}</div>
      <div class="details-row"><strong>Cheese:</strong> ${boolFlag(item.has_cheese) ? "Yes" : "No"}</div>
      <div class="details-row"><strong>Tandoori:</strong> ${boolFlag(item.is_tandoori) ? "Yes" : "No"}</div>
      <div class="details-row"><strong>Status:</strong> ${boolFlag(item.in_stock, true) ? "Available" : "Out of Stock"}</div>
    </div>
  `;
  openModal("Item Details", html);
}

function openEditModal(item, imageOnly = false) {
  const html = imageOnly
    ? `
      <form id="modal-image-form" class="modal-form" action="javascript:void(0);">
        <input id="modal-image-file" type="file" accept="image/*" required />
        <label class="stock-label"><input id="modal-clear-image" type="checkbox" /> Remove existing image</label>
        <div class="modal-actions">
          <button class="btn create-btn" type="submit">Save Image</button>
        </div>
      </form>
    `
    : `
      <form id="modal-edit-form" class="modal-form" action="javascript:void(0);">
        <input id="modal-name" type="text" value="${String(item.name || "").replaceAll('"', "&quot;")}" required />
        <input id="modal-price" type="number" min="0" step="0.01" value="${Number(item.price || 0)}" required />
        <select id="modal-category">${buildCategoryOptions(item.category || "Extras")}</select>
        <input id="modal-prep-time" type="number" min="0" step="1" value="${Number(item.prep_time_minutes || 0)}" required />
        <textarea id="modal-description" rows="2" placeholder="Description (optional)">${String(item.description || "")}</textarea>
        <input id="modal-image-file" type="file" accept="image/*" />

        <div class="flag-grid">
          <label><input id="modal-peri" type="checkbox" ${boolFlag(item.is_peri_peri) ? "checked" : ""} /> Peri Peri</label>
          <label><input id="modal-cheese" type="checkbox" ${boolFlag(item.has_cheese) ? "checked" : ""} /> Cheese</label>
          <label><input id="modal-tandoori" type="checkbox" ${boolFlag(item.is_tandoori) ? "checked" : ""} /> Tandoori</label>
          <label><input id="modal-in-stock" type="checkbox" ${boolFlag(item.in_stock, true) ? "checked" : ""} /> Available</label>
          <label><input id="modal-clear-image" type="checkbox" /> Remove image</label>
        </div>

        <div class="modal-actions">
          <button class="btn create-btn" type="submit">Save Changes</button>
        </div>
      </form>
    `;
  openModal(imageOnly ? "Update Item Image" : "Edit Item", html);
  modalBodyEl.dataset.itemId = String(item.id);
  modalBodyEl.dataset.mode = imageOnly ? "image" : "edit";
}

async function updateAvailability(itemId, inStock) {
  const payload = await requestJson(`/menu/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ in_stock: Boolean(inStock) })
  });
  if (!payload) return;
  const target = getItemById(itemId);
  if (target) target.in_stock = Boolean(inStock);
  renderItems();
}

async function createItem(event) {
  event.preventDefault();
  clearMessages();
  const name = String(createNameInput?.value || "").trim();
  const price = Number(createPriceInput?.value || 0);
  const category = normalizeCategoryName(createCategorySelect?.value || "Extras");
  const prepTime = Number(createPrepTimeInput?.value || 0);
  const description = String(createDescriptionInput?.value || "").trim();
  const imageFile = createImageInput?.files?.[0] || null;

  const payload = {
    name,
    price,
    category,
    prep_time_minutes: prepTime,
    description,
    is_peri_peri: Boolean(createPeriInput?.checked),
    has_cheese: Boolean(createCheeseInput?.checked),
    is_tandoori: Boolean(createTandooriInput?.checked),
    in_stock: Boolean(createInStockInput?.checked)
  };

  if (imageFile) {
    payload.image_data_url = await optimizeImageDataUrl(imageFile);
    payload.image_filename = imageFile.name || "";
  }

  const result = await requestJson("/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!result) return;

  createForm.reset();
  if (createPrepTimeInput) createPrepTimeInput.value = "10";
  if (createInStockInput) createInStockInput.checked = true;
  setMessage(createMessage, "Menu item created.");
  await fetchItems();
}

async function duplicateItem(item) {
  const payload = {
    name: `${String(item.name || "").trim()} (Copy)`,
    price: Number(item.price || 0),
    category: normalizeCategoryName(item.category || "Extras"),
    prep_time_minutes: Number(item.prep_time_minutes || 0),
    description: String(item.description || ""),
    image_path: item.image_path ? String(item.image_path) : null,
    is_peri_peri: boolFlag(item.is_peri_peri),
    has_cheese: boolFlag(item.has_cheese),
    is_tandoori: boolFlag(item.is_tandoori),
    in_stock: boolFlag(item.in_stock, true)
  };
  const result = await requestJson("/menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!result) return;
  setMessage(itemsMessage, "Item duplicated.");
  await fetchItems();
}

async function deleteItem(item) {
  if (!window.confirm(`Delete "${item.name}"?`)) return;
  const result = await requestJson(`/menu/${item.id}`, { method: "DELETE" });
  if (!result) return;
  setMessage(itemsMessage, "Item deleted.");
  await fetchItems();
}

async function handleCardMenuAction(action, item) {
  clearMessages();
  if (!item) return;
  if (action === "view-details") {
    openDetailsModal(item);
    return;
  }
  if (action === "edit-item") {
    openEditModal(item, false);
    return;
  }
  if (action === "update-image") {
    openEditModal(item, true);
    return;
  }
  if (action === "duplicate-item") {
    await duplicateItem(item);
    return;
  }
  if (action === "delete-item") {
    await deleteItem(item);
  }
}

async function handleModalSubmit(event) {
  const imageForm = event.target.closest("#modal-image-form");
  const editForm = event.target.closest("#modal-edit-form");
  if (!imageForm && !editForm) return;
  event.preventDefault();

  const itemId = Number(modalBodyEl.dataset.itemId || 0);
  const item = getItemById(itemId);
  if (!item) {
    setMessage(itemsMessage, "Item not found.");
    closeModal();
    return;
  }
  try {
    if (imageForm) {
      const payload = {};
      const imageFile = document.getElementById("modal-image-file")?.files?.[0] || null;
      const clearImage = Boolean(document.getElementById("modal-clear-image")?.checked);
      if (imageFile) {
        payload.image_data_url = await optimizeImageDataUrl(imageFile);
        payload.image_filename = imageFile.name || "";
      }
      if (clearImage) payload.clear_image = true;
      if (!payload.image_data_url && !payload.clear_image) {
        setMessage(itemsMessage, "Please select an image or choose remove image.");
        return;
      }
      const result = await requestJson(`/menu/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!result) return;
      closeModal();
      setMessage(itemsMessage, "Item image updated.");
      await fetchItems();
      return;
    }

    const payload = {
      name: String(document.getElementById("modal-name")?.value || "").trim(),
      price: Number(document.getElementById("modal-price")?.value || 0),
      category: normalizeCategoryName(document.getElementById("modal-category")?.value || "Extras"),
      prep_time_minutes: Number(document.getElementById("modal-prep-time")?.value || 0),
      description: String(document.getElementById("modal-description")?.value || "").trim(),
      is_peri_peri: Boolean(document.getElementById("modal-peri")?.checked),
      has_cheese: Boolean(document.getElementById("modal-cheese")?.checked),
      is_tandoori: Boolean(document.getElementById("modal-tandoori")?.checked),
      in_stock: Boolean(document.getElementById("modal-in-stock")?.checked),
      clear_image: Boolean(document.getElementById("modal-clear-image")?.checked)
    };

    const imageFile = document.getElementById("modal-image-file")?.files?.[0] || null;
    if (imageFile) {
      payload.image_data_url = await optimizeImageDataUrl(imageFile);
      payload.image_filename = imageFile.name || "";
    }

    const result = await requestJson(`/menu/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!result) return;
    closeModal();
    setMessage(itemsMessage, "Item updated.");
    await fetchItems();
  } catch (error) {
    setMessage(itemsMessage, error.message || "Failed to update item.");
  }
}

async function handleGridClick(event) {
  const menuBtn = event.target.closest(".card-menu-btn");
  if (menuBtn) {
    const card = menuBtn.closest(".menu-item-card");
    const menu = card?.querySelector(".card-menu");
    if (!menu) return;
    toggleCardMenu(menu);
    return;
  }

  const actionBtn = event.target.closest(".card-menu-item");
  if (actionBtn) {
    const action = actionBtn.dataset.action;
    const card = actionBtn.closest(".menu-item-card");
    closeAllCardMenus();
    const item = getItemById(card?.dataset.id);
    try {
      await handleCardMenuAction(action, item);
    } catch (error) {
      setMessage(itemsMessage, error.message || "Action failed.");
    }
    return;
  }

  if (!event.target.closest(".card-menu")) {
    closeAllCardMenus();
  }
}

async function handleGridChange(event) {
  const toggle = event.target.closest(".availability-toggle");
  if (!toggle) return;
  const itemId = String(toggle.dataset.itemId || "").trim();
  try {
    await updateAvailability(itemId, toggle.checked);
    setMessage(itemsMessage, `Item marked as ${toggle.checked ? "Available" : "Out of Stock"}.`);
  } catch (error) {
    toggle.checked = !toggle.checked;
    setMessage(itemsMessage, error.message || "Failed to update availability.");
  }
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
      try {
        await createItem(event);
      } catch (error) {
        setMessage(createMessage, error.message || "Failed to create item.");
      }
    });
  }

  if (categorySectionsEl) {
    categorySectionsEl.addEventListener("click", async (event) => {
      await handleGridClick(event);
    });
    categorySectionsEl.addEventListener("change", async (event) => {
      await handleGridChange(event);
    });
  }

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      closeModal();
    });
  }

  if (modalEl) {
    modalEl.addEventListener("click", (event) => {
      if (event.target === modalEl) {
        closeModal();
      }
    });
  }

  if (modalBodyEl) {
    modalBodyEl.addEventListener("submit", async (event) => {
      await handleModalSubmit(event);
    });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".menu-item-card")) {
      closeAllCardMenus();
    }
  });

  await fetchItems();
}

init().catch((error) => {
  setMessage(itemsMessage, error.message || "Failed to load menu management.");
});
