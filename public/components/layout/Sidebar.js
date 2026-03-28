(function setupSidebar() {
  const navItems = [
    { label: "POS", path: "/", icon: "\u{1F6D2}" },
    { label: "Menu Management", path: "/menu", icon: "\u{1F374}" },
    { label: "Order History", path: "/orders/history", icon: "\u{1F9FE}" },
    { label: "Daily Close Report", path: "/daily-close-report", icon: "\u{1F4CA}" },
    { label: "User Management", path: "/users", icon: "\u{1F465}" }
  ];

  function isActive(pathname, itemPath) {
    if (itemPath === "/") return pathname === "/";
    return pathname === itemPath;
  }

  function render(pathname = window.location.pathname) {
    const aside = document.createElement("aside");
    aside.className = "layout-sidebar";
    aside.setAttribute("aria-label", "Admin Navigation");

    const nav = document.createElement("nav");
    nav.className = "layout-sidebar-nav";

    nav.innerHTML = navItems
      .map((item) => {
        const activeClass = isActive(pathname, item.path) ? " active" : "";
        return `
          <a class="layout-sidebar-item${activeClass}" href="${item.path}">
            <span class="layout-sidebar-icon" aria-hidden="true">${item.icon}</span>
            <span class="layout-sidebar-label">${item.label}</span>
          </a>
        `;
      })
      .join("");

    aside.appendChild(nav);
    return aside;
  }

  window.AppSidebar = { render };
})();
