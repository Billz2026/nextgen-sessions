(function () {
  "use strict";

  const header = document.querySelector(".site-header");
  const navigation = header?.querySelector(".nav");
  const headerInner = header?.querySelector(".header-inner");
  if (!header || !navigation || !headerInner) return;

  document.documentElement.classList.add("has-navigation");
  navigation.id = navigation.id || "primary-navigation";

  const toggle = document.createElement("button");
  toggle.className = "nav-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-controls", navigation.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-label", "Open navigation");
  toggle.innerHTML = '<span aria-hidden="true"></span><span aria-hidden="true"></span><span aria-hidden="true"></span>';
  headerInner.insertBefore(toggle, navigation);

  function setOpen(open) {
    navigation.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  }

  toggle.addEventListener("click", () => {
    setOpen(toggle.getAttribute("aria-expanded") !== "true");
  });

  navigation.addEventListener("click", event => {
    if (event.target.closest("a")) setOpen(false);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      setOpen(false);
      toggle.focus();
    }
  });

  document.addEventListener("click", event => {
    if (!header.contains(event.target)) setOpen(false);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) setOpen(false);
  });
})();
