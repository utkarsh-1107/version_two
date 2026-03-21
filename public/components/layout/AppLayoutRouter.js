(function setupAppLayoutRouter() {
  function isPosRoute(pathname) {
    return pathname === "/";
  }

  function mount() {
    const root = document.querySelector("[data-page-root]") || document.querySelector("main");
    if (!root) return;
    if (document.querySelector(".admin-layout") || document.querySelector(".app-layout-header")) return;

    const pathname = window.location.pathname;
    if (isPosRoute(pathname)) {
      window.POSLayout?.mount(root);
      return;
    }
    window.AdminLayout?.mount(root);
  }

  window.AppLayoutRouter = { mount };
})();
