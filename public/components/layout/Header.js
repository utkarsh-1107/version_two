(function setupGlobalHeader() {
  function buildPosActions() {
    return `
      <div class="layout-header-actions layout-header-actions-pos">
        <button id="user-menu-btn" class="layout-user-menu-btn" type="button" aria-haspopup="true" aria-expanded="false" title="Account Menu">
          <span class="layout-user-menu-icon" aria-hidden="true">&#128100;</span>
          <span id="current-user-role" class="layout-user-menu-role">Admin</span>
        </button>
        <div id="user-menu-dropdown" class="layout-user-menu-dropdown hidden" role="menu" aria-hidden="true">
          <a id="manage-menu-link" href="/menu" class="layout-user-menu-item" role="menuitem">Manage Menu</a>
          <a id="daily-close-report-link" href="/daily-close-report" class="layout-user-menu-item" role="menuitem">Daily Close Report</a>
          <a id="manage-users-link" href="/users" class="layout-user-menu-item" role="menuitem">User Management</a>
          <button id="logout-btn" class="layout-user-menu-item" type="button" role="menuitem">Logout</button>
        </div>
      </div>
    `;
  }

  function buildAdminActions() {
    return `
      <div class="layout-header-actions">
        <button id="logout-btn" class="layout-btn layout-btn-secondary" type="button">Logout</button>
      </div>
    `;
  }

  function render(options = {}) {
    const variant = String(options.variant || "pos").toLowerCase();
    const header = document.createElement("header");
    header.id = "top";
    header.className = "app-layout-header";
    header.innerHTML = `
      <div class="layout-header-inner">
        <a href="/" class="layout-brand" aria-label="Go to POS">BLAZING BARBECUE</a>
        ${variant === "pos" ? buildPosActions() : buildAdminActions()}
      </div>
    `;
    return header;
  }

  window.AppHeader = { render };
})();
