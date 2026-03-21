(function setupAppLayout() {
  function mount(options = {}) {
    const root = document.querySelector("[data-page-root]") || document.querySelector("main");
    if (!root) return;
    if (document.querySelector(".app-layout-header")) return;

    const header = window.AppHeader?.render(options || {});
    if (!header) return;

    document.body.classList.add("app-layout-page");
    root.classList.add("app-layout-content");
    document.body.insertBefore(header, root);
  }

  window.AppLayout = { mount };
})();
