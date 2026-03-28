const tableBodyEl = document.getElementById("history-table-body");
const historyDateInput = document.getElementById("history-date");
const applyFilterBtn = document.getElementById("apply-filter-btn");
const clearFilterBtn = document.getElementById("clear-filter-btn");
const prevPageBtn = document.getElementById("prev-page-btn");
const nextPageBtn = document.getElementById("next-page-btn");
const pageMetaEl = document.getElementById("page-meta");
const messageEl = document.getElementById("history-message");
const logoutBtn = document.getElementById("logout-btn");
const detailModalEl = document.getElementById("order-detail-modal");
const closeDetailModalBtn = document.getElementById("close-detail-modal-btn");
const detailContentEl = document.getElementById("order-detail-content");

let currentPage = 1;
let totalPages = 1;
let currentDateFilter = "";
let currentOrders = [];
const PAGE_LIMIT = 20;

function todayIN() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

function showMessage(text = "") {
  if (!messageEl) return;
  messageEl.textContent = text;
}

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function formatTime(value = "") {
  const parsed = new Date(String(value || ""));
  if (Number.isNaN(parsed.getTime())) return String(value || "-");
  return parsed.toLocaleString("en-IN", { hour12: true });
}

function formatOrderType(type = "") {
  return String(type || "").trim() === "parcel" ? "Parcel" : "Dine In";
}

function getOrderCode(order) {
  const code = String(order?.order_code || "").trim();
  if (code) return code;
  const token = Number(order?.token_number || 0);
  return Number.isInteger(token) && token > 0 ? `#${token}` : "-";
}

async function apiFetch(url, options = {}) {
  return fetch(url, { credentials: "same-origin", ...(options || {}) });
}

async function readJsonOrThrow(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;
  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error("Unauthorized.");
  }
  throw new Error(payload.error || fallbackMessage);
}

function renderRows() {
  if (!tableBodyEl) return;
  tableBodyEl.innerHTML = "";
  if (!Array.isArray(currentOrders) || currentOrders.length === 0) {
    tableBodyEl.innerHTML = `<tr><td colspan="5">No completed orders found.</td></tr>`;
    return;
  }
  currentOrders.forEach((order) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td data-label="Order ID">${getOrderCode(order)}</td>
      <td data-label="Date">${formatTime(order.completed_at || order.created_at)}</td>
      <td data-label="Total">${formatCurrency(order.total_amount)}</td>
      <td data-label="Type">${formatOrderType(order.order_type)}</td>
      <td data-label="Action">
        <div class="action-buttons">
          <button class="btn btn-secondary" type="button" data-action="view" data-id="${order.id}">View</button>
        </div>
      </td>
    `;
    tableBodyEl.appendChild(row);
  });
}

function renderPager(page = 1, pages = 1, total = 0) {
  currentPage = page;
  totalPages = Math.max(1, pages);
  if (pageMetaEl) {
    pageMetaEl.textContent = `Page ${currentPage} of ${totalPages} (${total} orders)`;
  }
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= totalPages;
}

async function fetchHistory(page = 1) {
  const params = new URLSearchParams({
    format: "json",
    page: String(page),
    limit: String(PAGE_LIMIT)
  });
  if (currentDateFilter) {
    params.set("date", currentDateFilter);
  }
  const response = await apiFetch(`/orders/history?${params.toString()}`, { cache: "no-store" });
  const payload = await readJsonOrThrow(response, "Failed to fetch order history.");
  currentOrders = Array.isArray(payload.orders) ? payload.orders : [];
  renderRows();
  renderPager(Number(payload.page || 1), Number(payload.total_pages || 1), Number(payload.total || 0));
}

function closeOrderDetailModal() {
  if (!detailModalEl) return;
  detailModalEl.classList.add("hidden");
  detailModalEl.setAttribute("aria-hidden", "true");
  if (detailContentEl) detailContentEl.innerHTML = "";
}

function openOrderDetailModal(order, orderDetail) {
  if (!detailModalEl || !detailContentEl) return;
  const items = Array.isArray(orderDetail?.items) ? orderDetail.items : [];
  const itemHtml = items
    .map((item) => `<li>${item.name} x ${item.quantity} (${formatCurrency(item.line_total)})</li>`)
    .join("");
  detailContentEl.innerHTML = `
    <div class="detail-grid">
      <div class="detail-card"><strong>Order</strong>${getOrderCode(order)}</div>
      <div class="detail-card"><strong>Date</strong>${formatTime(order.completed_at || order.created_at)}</div>
      <div class="detail-card"><strong>Total</strong>${formatCurrency(order.total_amount)}</div>
      <div class="detail-card"><strong>Type</strong>${formatOrderType(order.order_type)}</div>
      <div class="detail-card"><strong>Customer</strong>${order.customer_name || "-"}</div>
      <div class="detail-card"><strong>Address</strong>${order.customer_address || "-"}</div>
    </div>
    <h3>Items</h3>
    <ul class="items-list">${itemHtml || "<li>No items</li>"}</ul>
    <div class="modal-actions">
      <button class="btn btn-primary modal-print-btn" type="button" data-action="print" data-id="${order.id}">Print</button>
    </div>
  `;
  detailModalEl.classList.remove("hidden");
  detailModalEl.setAttribute("aria-hidden", "false");
}

async function printOrderInvoice(orderId) {
  const response = await apiFetch(`/orders/${orderId}/print`, { method: "POST" });
  const payload = await readJsonOrThrow(response, "Failed to prepare print.");
  const printUrl = String(payload.print_url || "").trim();
  if (!printUrl) throw new Error("Print URL unavailable.");
  const anchor = document.createElement("a");
  anchor.href = printUrl;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function handleTableAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  const action = String(button.dataset.action || "");
  const orderId = Number(button.dataset.id || 0);
  if (!Number.isInteger(orderId) || orderId <= 0) return;
  const order = currentOrders.find((entry) => Number(entry.id) === orderId) || null;
  if (!order) return;

  try {
    if (action === "view") {
      const response = await apiFetch(`/orders/${orderId}`, { cache: "no-store" });
      const detail = await readJsonOrThrow(response, "Failed to fetch order details.");
      openOrderDetailModal(order, detail);
      return;
    }
  } catch (error) {
    showMessage(error.message || "Action failed.");
  }
}

async function init() {
  try {
    showMessage("");
    const meResponse = await apiFetch("/auth/me", { cache: "no-store" });
    await readJsonOrThrow(meResponse, "Failed to verify user.");
    if (historyDateInput) {
      historyDateInput.value = todayIN();
    }
    await fetchHistory(1);

    if (applyFilterBtn) {
      applyFilterBtn.addEventListener("click", async () => {
        currentDateFilter = String(historyDateInput?.value || "").trim();
        await fetchHistory(1);
      });
    }
    if (clearFilterBtn) {
      clearFilterBtn.addEventListener("click", async () => {
        currentDateFilter = "";
        if (historyDateInput) historyDateInput.value = "";
        await fetchHistory(1);
      });
    }
    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", async () => {
        if (currentPage <= 1) return;
        await fetchHistory(currentPage - 1);
      });
    }
    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", async () => {
        if (currentPage >= totalPages) return;
        await fetchHistory(currentPage + 1);
      });
    }
    if (tableBodyEl) {
      tableBodyEl.addEventListener("click", handleTableAction);
    }
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await apiFetch("/auth/logout", { method: "POST" });
        window.location.replace("/login");
      });
    }
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener("click", () => {
        closeOrderDetailModal();
      });
    }
    if (detailModalEl) {
      detailModalEl.addEventListener("click", (event) => {
        if (event.target === detailModalEl) closeOrderDetailModal();
      });
    }
    if (detailContentEl) {
      detailContentEl.addEventListener("click", async (event) => {
        const button = event.target.closest("button[data-action='print']");
        if (!button) return;
        const orderId = Number(button.dataset.id || 0);
        if (!Number.isInteger(orderId) || orderId <= 0) return;
        try {
          await printOrderInvoice(orderId);
        } catch (error) {
          showMessage(error.message || "Failed to print invoice.");
        }
      });
    }
  } catch (error) {
    showMessage(error.message || "Failed to load history.");
  }
}

init();
