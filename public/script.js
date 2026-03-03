const menuContainer = document.getElementById("menu-container");
const orderForm = document.getElementById("order-form");
const orderTotalEl = document.getElementById("order-total");
const messageEl = document.getElementById("message");
const customerNameInput = document.getElementById("customer-name");

const queuedList = document.getElementById("queued-list");
const preparingList = document.getElementById("preparing-list");
const readyList = document.getElementById("ready-list");
const completedList = document.getElementById("completed-list");

const activeTabBtn = document.getElementById("active-tab-btn");
const completedTabBtn = document.getElementById("completed-tab-btn");
const activeBoardView = document.getElementById("active-board-view");
const completedBoardView = document.getElementById("completed-board-view");

const statOrders = document.getElementById("stat-orders");
const statCash = document.getElementById("stat-cash");
const statUpi = document.getElementById("stat-upi");
const statGrand = document.getElementById("stat-grand");
const resetDayBtn = document.getElementById("reset-day-btn");
const clearCartBtn = document.getElementById("clear-cart-btn");

const MAX_QTY_PER_ITEM = 10;
let menuItems = [];
let allOrders = [];
let currentBoardTab = "active";
let cachedAdminPin = "";

const categoryOrder = [
  "Appetizers",
  "Wraps",
  "Wings",
  "Sandwiches",
  "Hotdogs",
  "Hot Dogs",
  "Full Leg",
  "Drumsticks",
  "Extras"
];

function formatCurrency(value) {
  return `Rs ${Number(value).toFixed(2)}`;
}

function formatTime(timestamp) {
  return timestamp;
}

function formatOrderType(orderType) {
  if (orderType === "parcel") return "Parcel";
  return "Dine In";
}

function showMessage(text, type = "success") {
  messageEl.textContent = text;
  messageEl.classList.remove("success", "error");
  if (!text) return;
  messageEl.classList.add(type);
}

function getNextStatus(status) {
  if (status === "queued") return "preparing";
  if (status === "preparing") return "ready";
  if (status === "ready") return "completed";
  return null;
}

function getNextStatusLabel(status) {
  if (status === "queued") return "Move to Preparing";
  if (status === "preparing") return "Move to Ready";
  if (status === "ready") return "Mark Completed";
  return "";
}

function groupByCategory(items) {
  return items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});
}

function parseAppetizerVariantName(itemName) {
  const splitIndex = itemName.lastIndexOf(" - ");
  if (splitIndex === -1) {
    return { groupName: itemName, portionLabel: "Variant" };
  }
  return {
    groupName: itemName.slice(0, splitIndex),
    portionLabel: itemName.slice(splitIndex + 3)
  };
}

function updateAppetizerRowPrice(rowEl) {
  const checked = rowEl.querySelector(".portion-radio:checked");
  const priceEl = rowEl.querySelector(".appetizer-price");
  if (!checked || !priceEl) return;
  priceEl.textContent = formatCurrency(Number(checked.dataset.price || 0));
}

function renderAppetizerRows(appetizers, sectionEl) {
  const groupedAppetizers = new Map();

  appetizers.forEach((item) => {
    const parsed = parseAppetizerVariantName(item.name);
    if (!groupedAppetizers.has(parsed.groupName)) {
      groupedAppetizers.set(parsed.groupName, []);
    }
    groupedAppetizers.get(parsed.groupName).push({
      ...item,
      groupName: parsed.groupName,
      portionLabel: parsed.portionLabel
    });
  });

  Array.from(groupedAppetizers.entries()).forEach(([groupName, variants], rowIndex) => {
    const row = document.createElement("div");
    row.className = "appetizer-row";
    row.dataset.groupKey = groupName;

    const main = document.createElement("div");
    main.className = "appetizer-main";

    const title = document.createElement("div");
    title.className = "appetizer-row-title";
    title.textContent = groupName;

    const tabs = document.createElement("div");
    tabs.className = "portion-tabs";
    const radioGroupName = `portion-${rowIndex}-${groupName.replace(/\s+/g, "-").toLowerCase()}`;

    variants.forEach((variant, index) => {
      const tabLabel = document.createElement("label");
      tabLabel.className = "portion-tab";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.className = "portion-radio";
      radio.name = radioGroupName;
      radio.value = String(variant.variant_id || variant.id);
      radio.dataset.price = String(variant.price);
      radio.dataset.groupId = String(variant.group_id || "");
      if (index === 0) radio.checked = true;
      radio.addEventListener("change", () => {
        updateAppetizerRowPrice(row);
        calculateTotal();
      });

      const text = document.createElement("span");
      text.textContent = variant.portionLabel;

      tabLabel.appendChild(radio);
      tabLabel.appendChild(text);
      tabs.appendChild(tabLabel);
    });

    const price = document.createElement("div");
    price.className = "appetizer-price";
    price.textContent = formatCurrency(variants[0].price);

    const controls = document.createElement("div");
    controls.className = "appetizer-controls";

    const qtyWrap = document.createElement("div");
    qtyWrap.className = "qty-control";
    qtyWrap.innerHTML = "<label>Qty</label>";

    const qtyInput = document.createElement("input");
    qtyInput.type = "number";
    qtyInput.min = "0";
    qtyInput.max = String(MAX_QTY_PER_ITEM);
    qtyInput.value = "0";
    qtyInput.className = "appetizer-qty";
    qtyInput.addEventListener("input", () => {
      const raw = Number(qtyInput.value) || 0;
      if (raw < 0) qtyInput.value = "0";
      if (raw > MAX_QTY_PER_ITEM) qtyInput.value = String(MAX_QTY_PER_ITEM);
      calculateTotal();
    });

    qtyWrap.appendChild(qtyInput);

    main.appendChild(title);
    main.appendChild(tabs);
    controls.appendChild(price);
    controls.appendChild(qtyWrap);

    row.appendChild(main);
    row.appendChild(controls);

    sectionEl.appendChild(row);
  });
}

function renderRegularCategory(items, sectionEl) {
  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "menu-item";

    const info = document.createElement("div");
    info.className = "menu-item-info";
    info.innerHTML = `<strong>${item.name}</strong><small>${formatCurrency(item.price)} | Prep ${item.prep_time_minutes} mins</small>`;

    const qty = document.createElement("div");
    qty.className = "qty-control";
    qty.innerHTML = "<label>Qty</label>";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = String(MAX_QTY_PER_ITEM);
    input.value = "0";
    input.className = "menu-item-qty";
    input.dataset.id = String(item.id);
    input.dataset.price = String(item.price);
    input.dataset.type = item.type || "menu_item";
    if (item.group_id) input.dataset.groupId = String(item.group_id);
    if (item.variant_id) input.dataset.variantId = String(item.variant_id);

    input.addEventListener("input", () => {
      const raw = Number(input.value) || 0;
      if (raw < 0) input.value = "0";
      if (raw > MAX_QTY_PER_ITEM) input.value = String(MAX_QTY_PER_ITEM);
      calculateTotal();
    });

    qty.appendChild(input);
    row.appendChild(info);
    row.appendChild(qty);
    sectionEl.appendChild(row);
  });
}

function renderMenu() {
  const grouped = groupByCategory(menuItems);
  const categories = Object.keys(grouped);
  const knownOrder = categoryOrder.filter((c) => categories.includes(c));
  const unknownOrder = categories.filter((c) => !knownOrder.includes(c));
  const orderedCategories = [...knownOrder, ...unknownOrder];

  menuContainer.innerHTML = "";

  orderedCategories.forEach((category) => {
    const groupEl = document.createElement("section");
    groupEl.className = "menu-group";

    const heading = document.createElement("h3");
    heading.textContent = category;
    groupEl.appendChild(heading);

    if (category === "Appetizers") {
      renderAppetizerRows(grouped[category], groupEl);
    } else {
      renderRegularCategory(grouped[category], groupEl);
    }

    menuContainer.appendChild(groupEl);
  });
}

function calculateTotal() {
  let total = 0;

  const regularInputs = menuContainer.querySelectorAll(".menu-item-qty");
  regularInputs.forEach((input) => {
    const quantity = Number(input.value) || 0;
    const price = Number(input.dataset.price) || 0;
    if (quantity > 0) total += quantity * price;
  });

  const appetizerRows = menuContainer.querySelectorAll(".appetizer-row");
  appetizerRows.forEach((row) => {
    const qtyInput = row.querySelector(".appetizer-qty");
    const checked = row.querySelector(".portion-radio:checked");
    const quantity = Number(qtyInput?.value) || 0;
    const price = Number(checked?.dataset.price) || 0;
    if (quantity > 0) total += quantity * price;
  });

  orderTotalEl.textContent = formatCurrency(total);
  return total;
}

function collectItems() {
  const items = [];

  const regularInputs = menuContainer.querySelectorAll(".menu-item-qty");
  regularInputs.forEach((input) => {
    const quantity = Number(input.value) || 0;
    if (quantity <= 0) return;

    const itemType = input.dataset.type || "menu_item";
    if (itemType === "appetizer") {
      items.push({
        type: "appetizer",
        group_id: Number(input.dataset.groupId),
        variant_id: Number(input.dataset.variantId || input.dataset.id),
        quantity
      });
      return;
    }

    items.push({
      type: "menu_item",
      menu_item_id: Number(input.dataset.id),
      quantity
    });
  });

  const appetizerRows = menuContainer.querySelectorAll(".appetizer-row");
  appetizerRows.forEach((row) => {
    const qtyInput = row.querySelector(".appetizer-qty");
    const checked = row.querySelector(".portion-radio:checked");
    const quantity = Number(qtyInput?.value) || 0;
    if (!checked || quantity <= 0) return;

    items.push({
      type: "appetizer",
      group_id: Number(checked.dataset.groupId),
      variant_id: Number(checked.value),
      quantity
    });
  });

  return items;
}

function clearForm() {
  const inputs = menuContainer.querySelectorAll("input[type='number']");
  inputs.forEach((input) => {
    input.value = "0";
  });

  const radioGroups = new Set();
  const radios = menuContainer.querySelectorAll(".portion-radio");
  radios.forEach((radio) => {
    if (radioGroups.has(radio.name)) return;
    radioGroups.add(radio.name);
    const first = menuContainer.querySelector(`.portion-radio[name="${radio.name}"]`);
    if (first) first.checked = true;
  });

  menuContainer.querySelectorAll(".appetizer-row").forEach((row) => {
    updateAppetizerRowPrice(row);
  });

  orderForm.querySelector("input[name='payment_mode'][value='cash']").checked = true;
  orderForm.querySelector("input[name='order_type'][value='dine_in']").checked = true;
  customerNameInput.value = "";
  calculateTotal();
}

function renderOrderCard(order) {
  const card = document.createElement("article");
  card.className = `order-card status-${order.status}`;

  const itemsList = order.items.map((item) => `<li>${item.name} x ${item.quantity}</li>`).join("");
  const customerMeta = order.customer_name ? `<p class="order-meta">Customer: ${order.customer_name}</p>` : "";

  card.innerHTML = `
    <p class="order-token">#${order.token_number}</p>
    <ul class="order-items">${itemsList}</ul>
    <p class="order-total">${formatCurrency(order.total_amount)}</p>
    <p class="order-meta">Payment: ${order.payment_mode.toUpperCase()}</p>
    <p class="order-meta">Type: ${formatOrderType(order.order_type)}</p>
    ${customerMeta}
    <p class="order-meta">Time: ${formatTime(order.created_at)}</p>
  `;

  const nextStatus = getNextStatus(order.status);
  const buttonLabel = getNextStatusLabel(order.status);
  if (nextStatus && buttonLabel) {
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn stage-btn";
    actionBtn.textContent = buttonLabel;
    actionBtn.addEventListener("click", async () => {
      try {
        await updateStatus(order.id, nextStatus);
      } catch (error) {
        showMessage(error.message, "error");
      }
    });
    card.appendChild(actionBtn);
  }

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "btn btn-delete";
  deleteBtn.type = "button";
  deleteBtn.textContent = "Delete Order";
  deleteBtn.addEventListener("click", async () => {
    try {
      await deleteOrder(order.id);
    } catch (error) {
      showMessage(error.message, "error");
    }
  });
  card.appendChild(deleteBtn);

  return card;
}

function renderColumn(targetEl, data) {
  targetEl.innerHTML = "";
  if (data.length === 0) {
    const emptyEl = document.createElement("p");
    emptyEl.className = "empty";
    emptyEl.textContent = "No orders";
    targetEl.appendChild(emptyEl);
    return;
  }

  data.forEach((order) => {
    targetEl.appendChild(renderOrderCard(order));
  });
}

function renderBoards() {
  const byTokenAsc = (a, b) => Number(a.token_number) - Number(b.token_number);
  const queued = allOrders.filter((order) => order.status === "queued").sort(byTokenAsc);
  const preparing = allOrders.filter((order) => order.status === "preparing").sort(byTokenAsc);
  const ready = allOrders.filter((order) => order.status === "ready").sort(byTokenAsc);
  const completed = allOrders.filter((order) => order.status === "completed").sort(byTokenAsc);

  renderColumn(queuedList, queued);
  renderColumn(preparingList, preparing);
  renderColumn(readyList, ready);
  renderColumn(completedList, completed);

  if (currentBoardTab === "completed") {
    activeBoardView.classList.add("hidden");
    completedBoardView.classList.remove("hidden");
    activeTabBtn.classList.remove("active");
    completedTabBtn.classList.add("active");
  } else {
    completedBoardView.classList.add("hidden");
    activeBoardView.classList.remove("hidden");
    completedTabBtn.classList.remove("active");
    activeTabBtn.classList.add("active");
  }
}

function setBoardTab(tab) {
  currentBoardTab = tab;
  renderBoards();
}

async function fetchMenu() {
  const response = await fetch("/menu");
  if (!response.ok) throw new Error("Failed to fetch menu.");
  menuItems = await response.json();
  renderMenu();
}

async function fetchOrders() {
  const response = await fetch("/orders?includeCompleted=true");
  if (!response.ok) throw new Error("Failed to fetch orders.");
  allOrders = await response.json();
  renderBoards();
}

async function fetchStats() {
  const response = await fetch("/stats");
  if (!response.ok) throw new Error("Failed to fetch stats.");
  const stats = await response.json();
  statOrders.textContent = String(stats.total_orders || 0);
  statCash.textContent = formatCurrency(stats.cash_total || 0);
  statUpi.textContent = formatCurrency(stats.upi_total || 0);
  statGrand.textContent = formatCurrency(stats.grand_total || 0);
}

async function createOrder(event) {
  event.preventDefault();
  const items = collectItems();
  if (items.length === 0) {
    showMessage("Please select at least one item.", "error");
    return;
  }

  const overLimitItem = items.find((item) => item.quantity > MAX_QTY_PER_ITEM);
  if (overLimitItem) {
    showMessage(`Maximum ${MAX_QTY_PER_ITEM} quantity allowed per item.`, "error");
    return;
  }

  const paymentMode = orderForm.querySelector("input[name='payment_mode']:checked").value;
  const orderType = orderForm.querySelector("input[name='order_type']:checked").value;
  const customerName = customerNameInput.value.trim();

  const response = await fetch("/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items,
      payment_mode: paymentMode,
      order_type: orderType,
      customer_name: customerName
    })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Failed to create order.");

  showMessage(`Order created successfully. Token #${payload.token_number}`, "success");
  clearForm();
  await Promise.all([fetchOrders(), fetchStats()]);
}

async function updateStatus(orderId, status) {
  const response = await fetch(`/orders/${orderId}/status`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });

  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Failed to update status.");
  await Promise.all([fetchOrders(), fetchStats()]);
}

async function resetDay() {
  const confirmed = window.confirm("Reset current day orders? This cannot be undone.");
  if (!confirmed) return;

  const response = await fetch("/reset-day", { method: "POST" });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Failed to reset day.");

  showMessage(`Day reset complete. Deleted ${payload.deleted_orders} orders.`, "success");
  await Promise.all([fetchOrders(), fetchStats()]);
}

async function deleteOrder(orderId) {
  const confirmed = window.confirm("Delete this order permanently? This action cannot be undone.");
  if (!confirmed) return;

  let pin = cachedAdminPin;
  if (!pin) {
    pin = window.prompt("Enter admin PIN to delete order:");
  }
  if (!pin) return;

  const response = await fetch(`/orders/${orderId}`, {
    method: "DELETE",
    headers: { "x-admin-pin": pin }
  });

  const raw = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(raw);
  } catch {
    payload = { error: raw };
  }

  if (response.status === 404 && String(payload.error || "").includes("Cannot DELETE")) {
    throw new Error("Delete endpoint is unavailable on running server. Please restart server.");
  }

  if (!response.ok) {
    if (response.status === 403) {
      cachedAdminPin = "";
      throw new Error("Invalid admin PIN.");
    }
    throw new Error(payload.error || "Failed to delete order.");
  }

  cachedAdminPin = pin;
  showMessage("Order deleted successfully.", "success");
  await Promise.all([fetchOrders(), fetchStats()]);
}

async function refreshDashboard() {
  await Promise.all([fetchOrders(), fetchStats()]);
}

async function init() {
  try {
    await fetchMenu();
    await refreshDashboard();

    orderForm.addEventListener("submit", async (event) => {
      try {
        await createOrder(event);
      } catch (error) {
        showMessage(error.message, "error");
      }
    });

    activeTabBtn.addEventListener("click", () => {
      setBoardTab("active");
    });

    completedTabBtn.addEventListener("click", () => {
      setBoardTab("completed");
    });

    resetDayBtn.addEventListener("click", async () => {
      try {
        await resetDay();
      } catch (error) {
        showMessage(error.message, "error");
      }
    });

    clearCartBtn.addEventListener("click", () => {
      clearForm();
      showMessage("Cart cleared.", "success");
    });

    setInterval(async () => {
      try {
        await refreshDashboard();
      } catch (error) {
        showMessage(error.message, "error");
      }
    }, 5000);
  } catch (error) {
    showMessage(error.message, "error");
  }
}

init();
