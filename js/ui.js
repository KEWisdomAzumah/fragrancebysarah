/* Sarahs' Fragrance — shared UI: theme, icons, toasts, dialogs, formatting. */

(function (SF) {
  const cfg = window.SF_CONFIG || {};
  const root = document.documentElement;
  const THEME_KEY = "sf.theme";

  /* ---------- Icons ---------- */
  const SPRITE = `
<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false">
  <symbol id="i-bag" viewBox="0 0 24 24"><path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></symbol>
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="m4.5 12.5 5 5 10-11"/></symbol>
  <symbol id="i-x" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></symbol>
  <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></symbol>
  <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5 12h14"/></symbol>
  <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></symbol>
  <symbol id="i-edit" viewBox="0 0 24 24"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17l-1 3Z"/><path d="m14 6 3 3"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m20 20-3.8-3.8"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></symbol>
  <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></symbol>
  <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3.6 7 8.4 6 8.4-6"/></symbol>
  <symbol id="i-chat" viewBox="0 0 24 24"><path d="M20.5 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.6-4.7A8.5 8.5 0 1 1 20.5 11.5Z"/><path d="M8.5 11.6h.01M12 11.6h.01M15.5 11.6h.01"/></symbol>
  <symbol id="i-spark" viewBox="0 0 24 24"><path d="M12 21c.2-5 3-9 8.5-9.5-.9 5.4-4.2 8.8-8.5 9.5Z"/><path d="M12 21c-.2-4-2.2-7-6.5-7.8.6 4 2.7 6.8 6.5 7.8Z"/></symbol>
  <symbol id="i-tag" viewBox="0 0 24 24"><path d="M20 13 13 20 4 11V4h7l9 9Z"/><circle cx="8.5" cy="8.5" r="1"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></symbol>
  <symbol id="i-image" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m4 17 5-5 4 4 3-3 4 4"/></symbol>
  <symbol id="i-arrow-left" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></symbol>
  <symbol id="i-arrow-right" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><path d="M12 4 2.8 20h18.4L12 4Z"/><path d="M12 10v4M12 17h.01"/></symbol>
  <symbol id="i-store" viewBox="0 0 24 24"><path d="M4 10v9h16v-9"/><path d="M3 10 5 4h14l2 6a3 3 0 0 1-5 1 3 3 0 0 1-4 0 3 3 0 0 1-4 0 3 3 0 0 1-5-1Z"/></symbol>
</svg>`;

  function injectSprite() {
    if (document.getElementById("sf-sprite")) return;
    const holder = document.createElement("div");
    holder.id = "sf-sprite";
    holder.innerHTML = SPRITE.trim();
    const svg = holder.firstElementChild;
    if (svg) document.body.appendChild(svg);
  }

  /* ---------- Theme ---------- */
  function currentTheme() {
    return root.getAttribute("data-theme") === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#191114" : "#fbf4ee");
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      const next = theme === "dark" ? "light" : "dark";
      btn.setAttribute("aria-label", `Switch to ${next} mode`);
      btn.setAttribute("title", `Switch to ${next} mode`);
      btn.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    });
  }

  function toggleTheme() {
    const next = currentTheme() === "dark" ? "light" : "dark";
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch (err) {
      /* theme still applies for this page view */
    }
    applyTheme(next);
  }

  function initTheme() {
    document.querySelectorAll("[data-theme-toggle]").forEach((btn) => {
      if (btn.dataset.themeBound) return;
      btn.dataset.themeBound = "1";
      btn.addEventListener("click", toggleTheme);
    });
    applyTheme(currentTheme());

    let saved = null;
    try {
      saved = localStorage.getItem(THEME_KEY);
    } catch (err) {
      saved = null;
    }
    if (!saved && window.matchMedia) {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = (event) => applyTheme(event.matches ? "dark" : "light");
      if (query.addEventListener) query.addEventListener("change", onChange);
      else if (query.addListener) query.addListener(onChange);
    }
  }

  /* ---------- Formatting ---------- */
  const numberFormat = (() => {
    try {
      return new Intl.NumberFormat("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (err) {
      return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  })();

  function money(value) {
    return `${cfg.currency || "GH₵"} ${numberFormat.format(Math.max(0, Number(value) || 0))}`;
  }

  const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
  }

  function debounce(fn, wait) {
    let timer = 0;
    return function debounced(...args) {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => fn.apply(this, args), wait);
    };
  }

  function icon(name, extraClass) {
    return `<svg class="icon${extraClass ? " " + extraClass : ""}" aria-hidden="true" focusable="false"><use href="#i-${name}"></use></svg>`;
  }

  /* ---------- Toasts ---------- */
  function toast(message, options = {}) {
    let host = document.querySelector(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = "toast" + (options.type === "error" ? " toast--error" : "");
    el.innerHTML = icon(options.type === "error" ? "alert" : "check", "icon--sm");
    const text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);
    host.appendChild(el);

    window.setTimeout(() => {
      el.classList.add("is-out");
      window.setTimeout(() => el.remove(), 280);
    }, options.duration || 3400);
  }

  /* ---------- Dialogs ---------- */
  const stack = [];

  function isVisible(el) {
    if (!el) return false;
    if (typeof el.checkVisibility === "function") {
      try {
        return el.checkVisibility({ checkVisibilityCSS: true, visibilityProperty: true });
      } catch (err) {
        /* fall through */
      }
    }
    return el.offsetParent !== null;
  }

  function focusables(container) {
    const selector =
      'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    return Array.prototype.filter.call(container.querySelectorAll(selector), isVisible);
  }

  function trapFocus(container, event) {
    const items = focusables(container);
    if (!items.length) {
      event.preventDefault();
      if (container.focus) container.focus({ preventScroll: true });
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (!container.contains(active)) {
      event.preventDefault();
      first.focus({ preventScroll: true });
      return;
    }
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    }
  }

  document.addEventListener("keydown", (event) => {
    const top = stack[stack.length - 1];
    if (!top) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeDialog(top);
    } else if (event.key === "Tab") {
      trapFocus(top, event);
    }
  });

  function openDialog(layer, options = {}) {
    if (!layer || stack.indexOf(layer) !== -1) return;
    const active = document.activeElement;
    layer._returnFocus = active && active.focus ? active : null;
    layer._onClose = options.onClose || null;
    layer.hidden = false;
    layer.removeAttribute("aria-hidden");
    document.body.classList.add("no-scroll");
    stack.push(layer);
    void layer.offsetWidth;
    layer.classList.add("is-open");

    let target = options.initialFocus || layer.querySelector("[data-autofocus]");
    if (!target) target = focusables(layer)[0] || layer;
    if (target === layer && !layer.hasAttribute("tabindex")) layer.setAttribute("tabindex", "-1");
    window.requestAnimationFrame(() => {
      if (target.focus) target.focus({ preventScroll: true });
    });
  }

  function closeDialog(layer) {
    const target = layer || stack[stack.length - 1];
    if (!target) return;
    const index = stack.indexOf(target);
    if (index !== -1) stack.splice(index, 1);

    target.classList.remove("is-open");
    const returnFocus = target._returnFocus;
    target._returnFocus = null;
    if (returnFocus && document.contains(returnFocus) && returnFocus.focus) {
      returnFocus.focus({ preventScroll: true });
    }
    target.setAttribute("aria-hidden", "true");

    if (!stack.length) document.body.classList.remove("no-scroll");

    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (err) {
      reduce = false;
    }
    window.setTimeout(() => {
      if (!target.classList.contains("is-open")) {
        target.hidden = true;
        target.removeAttribute("aria-hidden");
      }
    }, reduce ? 0 : 400);

    const onClose = target._onClose;
    target._onClose = null;
    if (onClose) onClose();
  }

  function closeAllDialogs() {
    stack.slice().forEach(closeDialog);
  }

  /* ---------- Boot ---------- */
  function boot() {
    injectSprite();
    initTheme();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  SF.ui = {
    icon,
    money,
    esc,
    debounce,
    toast,
    openDialog,
    closeDialog,
    closeAllDialogs,
    isVisible,
    focusables,
  };
})((window.SF = window.SF || {}));
