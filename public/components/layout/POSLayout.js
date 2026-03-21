(function setupPosLayout() {
  function mount(root) {
    if (!root) return;
    if (!document.querySelector(".app-layout-header")) {
      const header = window.AppHeader?.render({ variant: "pos" });
      if (header) document.body.insertBefore(header, root);
    }
    document.body.classList.add("app-layout-page", "layout-pos-page");
    root.classList.add("app-layout-content", "app-layout-content-pos");
  }

  window.POSLayout = { mount };
})();
