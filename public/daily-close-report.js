const reportDateInput = document.getElementById("report-date");
const refreshReportBtn = document.getElementById("refresh-report-btn");
const downloadPdfBtn = document.getElementById("download-pdf-btn");
const printReportBtn = document.getElementById("print-report-btn");
const summaryCardsEl = document.getElementById("summary-cards");
const businessInsightsEl = document.getElementById("business-insights");
const topItemsListEl = document.getElementById("top-items-list");
const mostConsumedEl = document.getElementById("most-consumed");
const recommendationListEl = document.getElementById("recommendation-list");
const reportMessageEl = document.getElementById("report-message");
const logoutBtn = document.getElementById("logout-btn");

const statusCanvas = document.getElementById("status-chart");
const typeCanvas = document.getElementById("type-chart");
const paymentCanvas = document.getElementById("payment-chart");

const charts = {
  status: null,
  type: null,
  payment: null
};

function formatCurrency(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function showMessage(text = "") {
  if (!reportMessageEl) return;
  reportMessageEl.textContent = text;
}

function todayIN() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(new Date());
}

async function apiFetch(url, options = {}) {
  const mergedOptions = { credentials: "same-origin", ...(options || {}) };
  return fetch(url, mergedOptions);
}

async function readJsonOrThrow(response, fallbackMessage) {
  const payload = await response.json().catch(() => ({}));
  if (response.ok) return payload;
  if (response.status === 401) {
    window.location.replace("/login");
    throw new Error("Unauthorized.");
  }
  if (response.status === 403) {
    window.location.replace("/");
    throw new Error("Access denied.");
  }
  throw new Error(payload.error || fallbackMessage);
}

async function fetchCurrentUser() {
  const response = await apiFetch("/auth/me", { cache: "no-store" });
  const user = await readJsonOrThrow(response, "Failed to verify user.");
  if (String(user?.role || "").toLowerCase() !== "admin") {
    window.location.replace("/");
    return null;
  }
  return user;
}

function normalizeReport(raw = {}, selectedDate = "") {
  const summary = raw.summary || {};
  const byStatus = raw.by_status || {};
  const byOrderType = raw.by_order_type || {};
  const topItems = Array.isArray(raw.top_items) ? raw.top_items : [];
  const businessInsights = raw.business_insights || {};
  const paymentSplit = raw.payment_split || {};
  const totalItemsSold = Number(businessInsights.total_items_sold || 0);

  const normalizedTopItems = topItems.map((item) => {
    const qty = Number(item.quantity || 0);
    const share = totalItemsSold > 0 ? (qty / totalItemsSold) * 100 : 0;
    return {
      name: String(item.name || "-"),
      quantity: qty,
      contribution_percent: Number(item.contribution_percent || share)
    };
  });

  return {
    date: String(raw.date || selectedDate || todayIN()),
    generated_at: raw.generated_at || "",
    summary: {
      total_orders: Number(summary.total_orders || 0),
      cash_total: Number(summary.cash_total || 0),
      upi_total: Number(summary.upi_total || 0),
      grand_total: Number(summary.grand_total || 0)
    },
    by_status: {
      queued: Number(byStatus.queued || 0) + Number(byStatus.preparing || 0),
      ready: Number(byStatus.ready || 0),
      completed: Number(byStatus.completed || 0)
    },
    by_order_type: {
      dine_in: Number(byOrderType.dine_in || 0),
      parcel: Number(byOrderType.parcel || 0)
    },
    payment_split: {
      cash_total: Number(paymentSplit.cash_total || summary.cash_total || 0),
      upi_total: Number(paymentSplit.upi_total || summary.upi_total || 0)
    },
    top_items: normalizedTopItems,
    business_insights: {
      average_order_value: Number(businessInsights.average_order_value || 0),
      total_items_sold: totalItemsSold,
      peak_order_time: String(businessInsights.peak_order_time || "N/A"),
      top_item_contribution_percent: Number(businessInsights.top_item_contribution_percent || 0)
    }
  };
}

function renderSummaryCards(report) {
  if (!summaryCardsEl) return;
  const cards = [
    { label: "Total Orders", value: String(report.summary.total_orders) },
    { label: "Cash Total", value: formatCurrency(report.summary.cash_total) },
    { label: "UPI Total", value: formatCurrency(report.summary.upi_total) },
    { label: "Grand Total", value: formatCurrency(report.summary.grand_total) }
  ];

  summaryCardsEl.innerHTML = cards
    .map(
      (card) => `
      <article class="summary-card">
        <p>${card.label}</p>
        <strong>${card.value}</strong>
      </article>
    `
    )
    .join("");
}

function renderBusinessInsights(report) {
  if (!businessInsightsEl) return;
  const data = report.business_insights;
  businessInsightsEl.innerHTML = `
    <div class="insight-row">
      <strong>Average Order Value (AOV)</strong>
      <span>${formatCurrency(data.average_order_value)}</span>
    </div>
    <div class="insight-row">
      <strong>Total Items Sold</strong>
      <span>${data.total_items_sold} units</span>
    </div>
    <div class="insight-row">
      <strong>Peak Order Time</strong>
      <span>${data.peak_order_time}</span>
    </div>
    <div class="insight-row">
      <strong>Top Item Contribution</strong>
      <span>${data.top_item_contribution_percent.toFixed(1)}% of total items</span>
    </div>
  `;
}

function renderTopItems(report) {
  if (!topItemsListEl || !mostConsumedEl) return;
  const items = report.top_items;
  if (items.length === 0) {
    mostConsumedEl.textContent = "No sales data for selected date.";
    topItemsListEl.innerHTML = "";
    return;
  }

  const top = items[0];
  mostConsumedEl.textContent = `Most consumed item: ${top.name} (${top.quantity} units)`;

  topItemsListEl.innerHTML = items
    .map(
      (item, index) => `
      <article class="top-item-row">
        <span class="item-name">${index + 1}. ${item.name}</span>
        <span class="item-qty">${item.quantity} units</span>
        <span class="item-share">${item.contribution_percent.toFixed(1)}%</span>
      </article>
    `
    )
    .join("");
}

function renderRecommendations(report) {
  if (!recommendationListEl) return;
  const suggestions = [];
  const topItem = report.top_items[0];
  if (topItem) {
    suggestions.push(
      `${topItem.name} contributed ${topItem.contribution_percent.toFixed(1)}% of total item movement today.`
    );
  }
  if (report.by_order_type.parcel > report.by_order_type.dine_in) {
    suggestions.push("Parcel demand is higher than dine-in. Keep packing prep stock ready during peak windows.");
  } else {
    suggestions.push("Dine-in demand is leading. Prioritize table-turn speed and plating workflow.");
  }
  if (report.summary.upi_total > report.summary.cash_total) {
    suggestions.push("UPI is dominating payments. Keep QR stands visible and fallback payment links ready.");
  } else {
    suggestions.push("Cash volume is still strong. Keep change-float and shift-close cash checks tight.");
  }
  if ((report.by_status.queued || 0) > 0) {
    suggestions.push("Pending queue exists. Consider adding an extra prep hand during your peak order hour.");
  }
  recommendationListEl.innerHTML = suggestions.map((item) => `<li>${item}</li>`).join("");
}

function upsertChart(key, canvas, config) {
  if (!canvas) return;
  if (charts[key]) {
    charts[key].destroy();
    charts[key] = null;
  }
  charts[key] = new Chart(canvas, config);
}

function renderCharts(report) {
  const status = report.by_status;
  const orderType = report.by_order_type;
  const payment = report.payment_split;

  upsertChart("status", statusCanvas, {
    type: "doughnut",
    data: {
      labels: ["Queued", "Ready", "Completed"],
      datasets: [
        {
          data: [status.queued, status.ready, status.completed],
          backgroundColor: ["#F59E0B", "#9333EA", "#16A34A"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, font: { size: 11 } }
        }
      }
    }
  });

  upsertChart("type", typeCanvas, {
    type: "pie",
    data: {
      labels: ["Dine In", "Parcel"],
      datasets: [
        {
          data: [orderType.dine_in, orderType.parcel],
          backgroundColor: ["#DC2626", "#EA580C"]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 10, font: { size: 11 } }
        }
      }
    }
  });

  upsertChart("payment", paymentCanvas, {
    type: "bar",
    data: {
      labels: ["Cash", "UPI"],
      datasets: [
        {
          label: "Amount",
          data: [payment.cash_total, payment.upi_total],
          backgroundColor: ["#0F766E", "#1D4ED8"],
          categoryPercentage: 0.58,
          barPercentage: 0.72,
          maxBarThickness: 92,
          borderRadius: 8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 16,
          right: 16
        }
      },
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { font: { size: 11 } } },
        x: { ticks: { font: { size: 11 } } }
      }
    }
  });
}

async function fetchReport(dateValue) {
  const date = String(dateValue || "").trim() || todayIN();
  const response = await apiFetch(`/reports/daily-close?date=${encodeURIComponent(date)}`, {
    cache: "no-store"
  });
  const raw = await readJsonOrThrow(response, "Failed to fetch daily close report.");
  return normalizeReport(raw, date);
}

function getSelectedDate() {
  return String(reportDateInput?.value || "").trim() || todayIN();
}

function openUrlInNewTab(url) {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.target = "_blank";
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

async function refreshDashboard() {
  try {
    showMessage("");
    const report = await fetchReport(getSelectedDate());
    renderSummaryCards(report);
    renderCharts(report);
    renderTopItems(report);
    renderBusinessInsights(report);
    renderRecommendations(report);
  } catch (error) {
    showMessage(error.message || "Failed to render report.");
  }
}

async function handleLogout() {
  await apiFetch("/auth/logout", { method: "POST" });
  window.location.replace("/login");
}

async function init() {
  await fetchCurrentUser();
  if (reportDateInput) {
    reportDateInput.value = todayIN();
  }

  if (refreshReportBtn) {
    refreshReportBtn.addEventListener("click", async () => {
      await refreshDashboard();
    });
  }

  if (reportDateInput) {
    reportDateInput.addEventListener("change", async () => {
      await refreshDashboard();
    });
  }

  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener("click", () => {
      const date = getSelectedDate();
      openUrlInNewTab(`/reports/daily-close/pdf?date=${encodeURIComponent(date)}&download=1`);
    });
  }

  if (printReportBtn) {
    printReportBtn.addEventListener("click", () => {
      window.print();
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await handleLogout();
    });
  }

  await refreshDashboard();
}

init().catch((error) => {
  showMessage(error.message || "Failed to initialize dashboard.");
});
