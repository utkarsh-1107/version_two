const logoutBtn = document.getElementById("logout-btn");
const createForm = document.getElementById("create-menu-form");
const createMessage = document.getElementById("create-message");
const itemsMessage = document.getElementById("items-message");
const categorySectionsEl = document.getElementById("menu-category-sections");
const categoryGridEl = document.getElementById("category-grid");
const activeCategoryItemsWrapEl = document.getElementById("active-category-items-wrap");
const activeCategoryItemsTitleEl = document.getElementById("active-category-items-title");
const activeCategoryItemsEl = document.getElementById("active-category-items");
const structuredPanelEl = document.getElementById("menu-structured-panel");
const fallbackPanelEl = document.getElementById("menu-fallback-panel");
const viewTabButtons = Array.from(document.querySelectorAll("[data-menu-view]"));
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
const ADD_CATEGORY_OPTION_VALUE = "__add_category__";
let menuItems = [];
let activeCategory = "";
let activeView = "structured";
let appetizerGroupsById = new Map();
let availableCategories = [...CATEGORY_ORDER];
let softToastTimer = null;
let softToastStartedAt = 0;
let softToastRemainingMs = 0;
let softToastHideTimer = null;
let softToastActionHandler = null;

const CATEGORY_ICON_MAP = {
  Appetizers: "/icons/cbreast.png",
  Wraps: "/icons/cwrap.png",
  Wings: "/icons/cwings.png",
  Sandwiches: "/icons/csub.png",
  "Hot Dogs": "/icons/chotdog.png",
  "Full Leg": "/icons/ctangdi.png",
  Drumsticks: "/icons/cdrumstick.png",
  Extras: "/icons/dip.png"
};

function setMessage(target, text = "") {
  if (!target) return;
  target.textContent = text;
}

function clearMessages() {
  setMessage(createMessage, "");
  setMessage(itemsMessage, "");
}

function getSoftToastEl() {
  let toast = document.getElementById("soft-toast");
  if (toast) {
    toast.classList.remove("hidden");
    if (toast.parentElement !== document.body) {
      document.body.appendChild(toast);
    }
    if (!toast.querySelector(".soft-toast-title")) {
      toast.innerHTML = "";
    }
    return toast;
  }
  toast = document.createElement("div");
  toast.id = "soft-toast";
  toast.className = "soft-toast";
  toast.setAttribute("aria-live", "polite");
  toast.setAttribute("aria-atomic", "true");
  toast.innerHTML = "";
  toast.style.display = "none";
  toast.style.opacity = "0";
  toast.style.transform = "translateY(8px)";
  document.body.appendChild(toast);
  return toast;
}

function clearSoftToastTimers() {
  if (softToastTimer) {
    clearTimeout(softToastTimer);
    softToastTimer = null;
  }
  if (softToastHideTimer) {
    clearTimeout(softToastHideTimer);
    softToastHideTimer = null;
  }
}

function hideSoftToast() {
  const softToastEl = getSoftToastEl();
  clearSoftToastTimers();
  softToastActionHandler = null;
  softToastEl.style.opacity = "0";
  softToastEl.style.transform = "translateY(8px)";
  softToastHideTimer = setTimeout(() => {
    softToastEl.style.display = "none";
    softToastEl.classList.remove("error", "success");
  }, 220);
}

function startSoftToastTimer(durationMs = 3600) {
  clearSoftToastTimers();
  softToastRemainingMs = Math.max(400, Number(durationMs) || 3600);
  softToastStartedAt = Date.now();
  softToastTimer = setTimeout(() => {
    hideSoftToast();
  }, softToastRemainingMs);
}

function pauseSoftToastTimer() {
  if (!softToastTimer) return;
  clearTimeout(softToastTimer);
  softToastTimer = null;
  const elapsed = Date.now() - softToastStartedAt;
  softToastRemainingMs = Math.max(250, softToastRemainingMs - elapsed);
}

function resumeSoftToastTimer() {
  if (softToastTimer) return;
  softToastStartedAt = Date.now();
  softToastTimer = setTimeout(() => {
    hideSoftToast();
  }, softToastRemainingMs);
}

function showSoftToast(input, type = "success") {
  const normalized =
    typeof input === "string"
      ? {
          type,
          title: type === "error" ? "Update Failed" : "Saved",
          message: input
        }
      : {
          type: String(input?.type || "success"),
          title: String(input?.title || (input?.type === "error" ? "Update Failed" : "Saved")),
          message: String(input?.message || ""),
          duration: Number(input?.duration || 0),
          action: input?.action || null
        };

  const softToastEl = getSoftToastEl();
  const iconChar = normalized.type === "error" ? "!" : "&#10003;";
  const safeTitle = normalized.title.replace(/[<>]/g, "");
  const safeMessage = normalized.message.replace(/[<>]/g, "");
  const hasAction = normalized.action && typeof normalized.action.onClick === "function";
  const actionLabel = hasAction ? String(normalized.action.label || "Undo").replace(/[<>]/g, "") : "";
  softToastActionHandler = hasAction ? normalized.action.onClick : null;

  softToastEl.classList.remove("error", "success");
  softToastEl.classList.add(normalized.type === "error" ? "error" : "success");
  softToastEl.innerHTML = `
    <span class="soft-toast-icon" aria-hidden="true">${iconChar}</span>
    <div class="soft-toast-content">
      <strong class="soft-toast-title">${safeTitle}</strong>
      <span class="soft-toast-text">${safeMessage}</span>
    </div>
    ${
      hasAction
        ? `<button type="button" class="soft-toast-action" data-toast-action="primary">${actionLabel}</button>`
        : ""
    }
  `;

  const actionBtn = softToastEl.querySelector("[data-toast-action='primary']");
  if (actionBtn) {
    actionBtn.addEventListener("click", (event) => {
      event.stopPropagation();
      const action = softToastActionHandler;
      hideSoftToast();
      if (typeof action === "function") action();
    });
  }

  softToastEl.onmouseenter = pauseSoftToastTimer;
  softToastEl.onmouseleave = resumeSoftToastTimer;
  softToastEl.onclick = (event) => {
    if (event.target?.closest?.("[data-toast-action='primary']")) return;
    hideSoftToast();
  };

  softToastEl.style.display = "grid";
  requestAnimationFrame(() => {
    softToastEl.style.opacity = "1";
    softToastEl.style.transform = "translateY(0)";
  });
  const duration = normalized.duration > 0 ? normalized.duration : hasAction ? 5000 : 3600;
  startSoftToastTimer(duration);
}

function highlightUpdatedCard(cardEl) {
  if (!cardEl) return;
  cardEl.classList.remove("item-updated");
  void cardEl.offsetWidth;
  cardEl.classList.add("item-updated");
  setTimeout(() => {
    cardEl.classList.remove("item-updated");
  }, 1000);
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
  const rawValue = String(category || "").trim().replace(/\s+/g, " ");
  const raw = rawValue.toLowerCase();
  if (!raw) return "Extras";
  if (raw === "hotdogs") return "Hot Dogs";
  for (const known of CATEGORY_ORDER) {
    if (String(known).toLowerCase() === raw) return known;
  }
  const byTitleCase = raw
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  return byTitleCase;
}

function getOrderedAvailableCategories() {
  const normalized = new Set(
    (Array.isArray(availableCategories) ? availableCategories : [])
      .map((category) => normalizeCategoryName(category))
      .filter(Boolean)
  );
  CATEGORY_ORDER.forEach((category) => normalized.add(category));
  const custom = Array.from(normalized)
    .filter((category) => !CATEGORY_SET.has(category))
    .sort((a, b) => a.localeCompare(b));
  return [...CATEGORY_ORDER, ...custom];
}

function syncAvailableCategoriesFromItems(items = []) {
  const merged = new Set(getOrderedAvailableCategories());
  (Array.isArray(items) ? items : []).forEach((item) => {
    merged.add(normalizeCategoryName(item?.category || ""));
  });
  availableCategories = Array.from(merged);
}

function getOrderedGroupedItems(items) {
  const grouped = new Map();

  items.forEach((item) => {
    const category = normalizeCategoryName(item?.category || "");
    if (!grouped.has(category)) grouped.set(category, []);
    grouped.get(category).push(item);
  });

  const orderedCategories = [
    ...CATEGORY_ORDER.filter((category) => grouped.has(category)),
    ...Array.from(grouped.keys())
      .filter((category) => !CATEGORY_SET.has(category))
      .sort((a, b) => a.localeCompare(b))
  ];

  orderedCategories.forEach((category) => {
    (grouped.get(category) || []).sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  });

  return orderedCategories.map((category) => ({
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
  const dbPeri = boolFlag(item.is_peri_peri, false);
  const dbCheese = boolFlag(item.has_cheese, false);
  const dbTandoori = boolFlag(item.is_tandoori, false);
  return {
    // Keep visual state consistent with ordering cards:
    // explicit DB flag OR name-based inference.
    isPeriPeri: dbPeri || inferred.isPeriPeri,
    hasCheese: dbCheese || inferred.hasCheese,
    isTandoori: dbTandoori || inferred.isTandoori
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

function parseAppetizerGroupId(item = {}) {
  const raw = String(item?.id || "").trim();
  const match = raw.match(/^a-(\d+)$/i);
  return match ? Number(match[1]) : null;
}

function closeAllCardMenus() {
  document.querySelectorAll(".card-menu").forEach((menu) => {
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

  const groupId = parseAppetizerGroupId(item);
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  const variantsMarkup = groupId && variants.length > 0
    ? `
      <div class="variant-editor" data-group-id="${groupId}">
        ${variants
          .map(
            (variant) => `
              <div class="variant-row" data-variant-id="${variant.id}">
                <span class="variant-label">${String(variant.portion || "").trim() || "Variant"}</span>
                <input class="variant-price-input" type="number" min="0" step="10" value="${Number(variant.price || 0)}" />
                <button class="variant-save-btn" data-action="save-variant" type="button">Save</button>
              </div>
            `
          )
          .join("")}
      </div>
    `
    : "";

  card.innerHTML = `
    ${cornerAccentMarkup}
    ${isAppetizerGroup ? "" : `
      <button class="card-menu-btn" type="button" aria-label="Open actions">&#8942;</button>
      <div class="card-menu hidden">
        <button class="card-menu-item" data-action="view-details" type="button">View Details</button>
        <button class="card-menu-item" data-action="edit-item" type="button">Edit Item</button>
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
    ${variantsMarkup}
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
  const sections = getOrderedGroupedItems(menuItems);
  renderFallbackItems(sections);
  renderCategoryGrid(sections);
  renderActiveCategoryItems(sections);
  refreshCategorySelectOptions();
}

function renderFallbackItems(sections) {
  if (!categorySectionsEl) return;
  categorySectionsEl.innerHTML = "";
  if (sections.length === 0) {
    categorySectionsEl.innerHTML = '<p class="message">No menu items found.</p>';
    return;
  }
  sections.forEach((section) => {
    categorySectionsEl.appendChild(sectionTemplate(section.category, section.items));
  });
}

function renderCategoryGrid(sections) {
  if (!categoryGridEl) return;
  categoryGridEl.innerHTML = "";
  if (!sections.length) {
    categoryGridEl.innerHTML = '<p class="message">No categories found.</p>';
    return;
  }
  const markup = sections
    .map((section) => {
      const isActive = section.category === activeCategory;
      const iconSrc = CATEGORY_ICON_MAP[section.category] || "/icons/dip.png";
      const count = Number(section.items?.length || 0);
      return `
        <article class="category-card ${isActive ? "active" : ""}" data-category="${section.category}">
          <div class="category-card-top">
            <span class="category-icon" aria-hidden="true">
              <img src="${iconSrc}" alt="" />
            </span>
            <h3 class="category-name">${section.category}</h3>
          </div>
          <p class="category-count">${count} ${count === 1 ? "item" : "items"}</p>
        </article>
      `;
    })
    .join("");
  categoryGridEl.innerHTML = markup;
}

function renderActiveCategoryItems(sections) {
  if (!activeCategoryItemsWrapEl || !activeCategoryItemsTitleEl || !activeCategoryItemsEl) return;
  const activeSection = sections.find((section) => section.category === activeCategory);
  if (!activeSection) {
    activeCategoryItemsWrapEl.classList.add("hidden");
    activeCategoryItemsTitleEl.textContent = "";
    activeCategoryItemsEl.innerHTML = "";
    return;
  }

  activeCategoryItemsTitleEl.textContent = activeSection.category;
  activeCategoryItemsEl.innerHTML = "";
  activeSection.items.forEach((item) => {
    activeCategoryItemsEl.appendChild(cardTemplate(item));
  });
  activeCategoryItemsWrapEl.classList.remove("hidden");
}

function toggleCategory(category) {
  const normalized = normalizeCategoryName(category || "");
  if (activeCategory === normalized) {
    activeCategory = "";
  } else {
    activeCategory = normalized;
  }
  renderItems();
}

function setMenuView(view) {
  activeView = view === "fallback" ? "fallback" : "structured";
  viewTabButtons.forEach((button) => {
    const isActive = button.dataset.menuView === activeView;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", isActive ? "true" : "false");
  });
  if (structuredPanelEl) structuredPanelEl.classList.toggle("hidden", activeView !== "structured");
  if (fallbackPanelEl) fallbackPanelEl.classList.toggle("hidden", activeView !== "fallback");
}

function buildCategoryOptions(selectedCategory = "Extras", includeAddOption = false) {
  const normalizedSelected = normalizeCategoryName(selectedCategory);
  const categories = getOrderedAvailableCategories();
  const options = categories.map((category) => {
    const selected = normalizedSelected === category ? "selected" : "";
    return `<option value="${category}" ${selected}>${category}</option>`;
  });
  if (includeAddOption) {
    options.push(`<option value="${ADD_CATEGORY_OPTION_VALUE}">+ Add Category</option>`);
  }
  return options.join("");
}

function refreshCategorySelectOptions() {
  if (!createCategorySelect) return;
  const current = String(createCategorySelect.value || "").trim() || "Appetizers";
  createCategorySelect.innerHTML = buildCategoryOptions(current, true);
}

async function ensureCategoryExists(name) {
  const normalized = normalizeCategoryName(name);
  if (!normalized) throw new Error("Category name is required.");
  const payload = await requestJson("/menu/categories", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: normalized })
  });
  const savedName = normalizeCategoryName(payload?.name || normalized);
  availableCategories = Array.from(new Set([...availableCategories, savedName]));
  refreshCategorySelectOptions();
  return savedName;
}

async function handleAddCategorySelection(selectEl) {
  const rawName = window.prompt("Enter new category name");
  if (!rawName || !String(rawName).trim()) {
    selectEl.value = "Extras";
    return;
  }
  try {
    const savedName = await ensureCategoryExists(rawName);
    selectEl.value = savedName;
    showSoftToast({
      type: "success",
      title: "Category Added",
      message: `${savedName} is ready to use`
    });
  } catch (error) {
    selectEl.value = "Extras";
    showSoftToast({
      type: "error",
      title: "Category Add Failed",
      message: error.message || "Failed to add category. Try again."
    });
  }
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
  try {
    const categoriesPayload = await requestJson("/menu/categories", { cache: "no-store" });
    if (Array.isArray(categoriesPayload)) {
      availableCategories = categoriesPayload
        .map((entry) => normalizeCategoryName(entry?.name || entry))
        .filter(Boolean);
    }
  } catch (_error) {
    // Keep working with categories inferred from loaded menu items.
  }

  const [itemsPayload, appetizerPayload] = await Promise.all([
    requestJson("/menu/manage", { cache: "no-store" }),
    requestJson("/appetizers", { cache: "no-store" })
  ]);
  if (!itemsPayload) return;
  const appetizerGroups = Array.isArray(appetizerPayload) ? appetizerPayload : [];
  appetizerGroupsById = new Map(
    appetizerGroups.map((group) => [Number(group.group_id), group])
  );

  const rawItems = Array.isArray(itemsPayload) ? itemsPayload : [];
  menuItems = rawItems.map((item) => {
    if (String(item?.entity_type || "") !== "appetizer_group") return item;
    const groupId = parseAppetizerGroupId(item);
    const group = appetizerGroupsById.get(Number(groupId));
    return {
      ...item,
      variants: Array.isArray(group?.variants) ? group.variants : []
    };
  });
  syncAvailableCategoriesFromItems(menuItems);
  renderItems();
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
        <select id="modal-category">${buildCategoryOptions(item.category || "Extras", true)}</select>
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
  if (!imageOnly) {
    const modalCategorySelect = document.getElementById("modal-category");
    if (modalCategorySelect) {
      modalCategorySelect.addEventListener("change", async (event) => {
        const select = event.target;
        if (String(select?.value || "") !== ADD_CATEGORY_OPTION_VALUE) return;
        await handleAddCategorySelection(select);
      });
    }
  }
}

async function updateAvailability(itemId, inStock) {
  const target = getItemById(itemId);
  const previousInStock = boolFlag(target?.in_stock, true);
  const payload = await requestJson(`/menu/${itemId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ in_stock: Boolean(inStock) })
  });
  if (!payload) return;
  if (target) target.in_stock = Boolean(inStock);
  renderItems();
  showSoftToast({
    type: "success",
    title: "Availability Updated",
    message: `${String(target?.name || "Item")} marked ${Boolean(inStock) ? "Available" : "Out of Stock"}`,
    duration: 5000,
    action: {
      label: "Undo",
      onClick: async () => {
        try {
          await requestJson(`/menu/${itemId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ in_stock: previousInStock })
          });
          await fetchItems();
          showSoftToast({
            type: "success",
            title: "Change Reverted",
            message: `${String(target?.name || "Item")} restored to ${
              previousInStock ? "Available" : "Out of Stock"
            }`
          });
        } catch (_undoError) {
          showSoftToast({
            type: "error",
            title: "Undo Failed",
            message: "Failed to update availability. Try again."
          });
        }
      }
    }
  });
}

async function createItem(event) {
  event.preventDefault();
  clearMessages();
  const name = String(createNameInput?.value || "").trim();
  const price = Number(createPriceInput?.value || 0);
  let category = normalizeCategoryName(createCategorySelect?.value || "Extras");
  if (String(createCategorySelect?.value || "") === ADD_CATEGORY_OPTION_VALUE) {
    await handleAddCategorySelection(createCategorySelect);
    category = normalizeCategoryName(createCategorySelect?.value || "Extras");
  }
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
  setMessage(createMessage, "");
  showSoftToast({
    type: "success",
    title: "Item Created",
    message: `${name} added under ${category}`
  });
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
  setMessage(itemsMessage, "");
  showSoftToast({
    type: "success",
    title: "Item Duplicated",
    message: `${String(payload.name || "Item")} created`
  });
  await fetchItems();
}

async function deleteItem(item) {
  if (!window.confirm(`Delete "${item.name}"?`)) return;
  const result = await requestJson(`/menu/${item.id}`, { method: "DELETE" });
  if (!result) return;
  setMessage(itemsMessage, "");
  showSoftToast({
    type: "success",
    title: "Item Deleted",
    message: `${String(item.name || "Item")} removed`
  });
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
      setMessage(itemsMessage, "");
      showSoftToast({
        type: "success",
        title: "Image Updated",
        message: `${String(item.name || "Item")} image saved`
      });
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
    const canUndo = !imageFile && !payload.clear_image;
    const previousSnapshot = {
      name: String(item.name || ""),
      price: Number(item.price || 0),
      category: normalizeCategoryName(item.category || "Extras"),
      prep_time_minutes: Number(item.prep_time_minutes || 0),
      description: String(item.description || ""),
      is_peri_peri: boolFlag(item.is_peri_peri, false),
      has_cheese: boolFlag(item.has_cheese, false),
      is_tandoori: boolFlag(item.is_tandoori, false),
      in_stock: boolFlag(item.in_stock, true)
    };
    closeModal();
    setMessage(itemsMessage, "");
    const updatedName = String(payload.name || item.name || "Item");
    const updatedPrice = Number(payload.price || item.price || 0);
    if (canUndo) {
      showSoftToast({
        type: "success",
        title: "Item Updated",
        message: `${updatedName} - Rs ${updatedPrice.toFixed(2)}`,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await requestJson(`/menu/${item.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(previousSnapshot)
              });
              await fetchItems();
              showSoftToast({
                type: "success",
                title: "Change Reverted",
                message: `${previousSnapshot.name} restored`
              });
            } catch (_undoError) {
              showSoftToast({
                type: "error",
                title: "Undo Failed",
                message: "Failed to revert item changes. Try again."
              });
            }
          }
        }
      });
    } else {
      showSoftToast({
        type: "success",
        title: "Item Updated",
        message: `${updatedName} - Rs ${updatedPrice.toFixed(2)}`
      });
    }
    await fetchItems();
  } catch (error) {
    setMessage(itemsMessage, error.message || "Failed to update item.");
    showSoftToast(error.message || "Update failed", "error");
  }
}

async function handleGridClick(event) {
  const variantSaveBtn = event.target.closest("[data-action='save-variant']");
  if (variantSaveBtn) {
    const row = variantSaveBtn.closest(".variant-row");
    const editor = variantSaveBtn.closest(".variant-editor");
    const card = variantSaveBtn.closest(".menu-item-card");
    const variantId = Number(row?.dataset.variantId || 0);
    const groupId = Number(editor?.dataset.groupId || 0);
    const nextPrice = Number(row?.querySelector(".variant-price-input")?.value || 0);
    if (!Number.isInteger(variantId) || variantId <= 0 || !Number.isInteger(groupId) || groupId <= 0) return;
    if (!Number.isFinite(nextPrice) || nextPrice < 0) {
      setMessage(itemsMessage, "Variant price must be a non-negative number.");
      return;
    }
    const groupItem = getItemById(card?.dataset.id || "");
    const variants = Array.isArray(groupItem?.variants) ? groupItem.variants : [];
    const variant = variants.find((entry) => Number(entry?.id) === variantId);
    const previousPrice = Number(variant?.price || 0);
    const variantLabel = String(variant?.portion || "").trim() || "Variant";
    const itemName = String(groupItem?.name || "Menu Item").trim();
    const applyVariantPrice = async (priceValue) => {
      const updatePayload = {
        variants: [
          {
            id: variantId,
            portion_name: String(variant?.portion || "").trim(),
            price: Number(priceValue),
            prep_time_minutes: Number(variant?.prep_time_minutes || 0)
          }
        ]
      };
      await requestJson(`/menu/a-${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });
    };
    const payload = {
      variants: [
        {
          id: variantId,
          portion_name: String(variant?.portion || "").trim(),
          price: nextPrice,
          prep_time_minutes: Number(variant?.prep_time_minutes || 0)
        }
      ]
    };
    try {
      await requestJson(`/menu/a-${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      setMessage(itemsMessage, "");
      highlightUpdatedCard(card);
      showSoftToast({
        type: "success",
        title: "Price Updated",
        message: `${itemName} - ${variantLabel} Rs ${Number(nextPrice).toFixed(2)}`,
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              await applyVariantPrice(previousPrice);
              await fetchItems();
              showSoftToast({
                type: "success",
                title: "Change Reverted",
                message: `${itemName} - ${variantLabel} restored to Rs ${Number(previousPrice).toFixed(2)}`
              });
            } catch (_undoError) {
              showSoftToast({
                type: "error",
                title: "Undo Failed",
                message: "Failed to update price. Try again."
              });
            }
          }
        }
      });
      await fetchItems();
    } catch (error) {
      setMessage(itemsMessage, error.message || "Failed to update variant.");
      showSoftToast({
        type: "error",
        title: "Update Failed",
        message: "Failed to update price. Try again."
      });
    }
    return;
  }

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
    setMessage(itemsMessage, "");
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

  if (createCategorySelect) {
    createCategorySelect.innerHTML = buildCategoryOptions(createCategorySelect.value || "Appetizers", true);
    createCategorySelect.addEventListener("change", async (event) => {
      const select = event.target;
      if (String(select?.value || "") !== ADD_CATEGORY_OPTION_VALUE) return;
      await handleAddCategorySelection(select);
    });
  }

  if (viewTabButtons.length > 0) {
    viewTabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        setMenuView(button.dataset.menuView || "structured");
      });
    });
  }

  if (categoryGridEl) {
    categoryGridEl.addEventListener("click", (event) => {
      const categoryCard = event.target.closest(".category-card");
      if (!categoryCard) return;
      toggleCategory(categoryCard.dataset.category || "");
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

  if (activeCategoryItemsEl) {
    activeCategoryItemsEl.addEventListener("click", async (event) => {
      await handleGridClick(event);
    });
    activeCategoryItemsEl.addEventListener("change", async (event) => {
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

  setMenuView("structured");
  await fetchItems();
}

init().catch((error) => {
  setMessage(itemsMessage, error.message || "Failed to load menu management.");
});


