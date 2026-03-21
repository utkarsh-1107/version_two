(function setupAdminLayout() {
  function mount(root) {
    if (!root) return;
    const parent = root.parentNode;
    if (!parent) return;
    if (!document.querySelector(".app-layout-header")) {
      const header = window.AppHeader?.render({ variant: "admin" });
      if (header) document.body.insertBefore(header, root);
    }

    const shell = document.createElement("div");
    shell.className = "admin-layout";

    const sidebar = window.AppSidebar?.render(window.location.pathname);
    if (sidebar) shell.appendChild(sidebar);

    const contentWrap = document.createElement("div");
    contentWrap.className = "admin-layout-content";
    shell.appendChild(contentWrap);

    parent.insertBefore(shell, root);
    contentWrap.appendChild(root);
    document.body.classList.add("app-layout-page", "layout-admin-page");
    root.classList.add("app-layout-content", "app-layout-content-admin");
  }

  window.AdminLayout = { mount };
})();
