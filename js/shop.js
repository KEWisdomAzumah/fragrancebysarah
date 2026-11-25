/* Sarahs' Fragrance — storefront: catalogue, bag, WhatsApp checkout. */

(function (SF) {
  "use strict";

  const cfg = SF.config || {};
  const ui = SF.ui;
  const store = SF.store;
  const { money, esc, toast, closeDialog } = ui;

  const CART_KEY = "sf.cart.v1";

  const state = {
    products: [],
    filter: "All",
    cart: new Map(),
  };

  const els = {};

  /* ---------- WhatsApp ---------- */
  function waUrl(text) {
    const digits = String(cfg.whatsappNumber || "").replace(/\D/g, "");
    return `https://wa.me/${digits}?text=${encodeURIComponent(text || "")}`;
  }

  function wireWaLinks() {
    document.querySelectorAll("[data-wa-link]").forEach((link) => {
      const text = link.getAttribute("data-wa-link") || cfg.whatsappGreeting || "";
      link.href = waUrl(text);
      link.target = "_blank";
      link.rel = "noopener";
    });
  }

  function openExternal(url) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  /* ---------- Catalogue helpers ---------- */
  const activeProducts = () => state.products.filter((product) => product.active);
  const productById = (id) => state.products.find((product) => product.id === id);
  const unitsIn = (lines) => lines.reduce((total, line) => total + line.qty, 0);
  const subtotalIn = (lines) => lines.reduce((total, line) => total + line.lineTotal, 0);

  function availableQty(product) {
    const inBag = state.cart.get(product.id) || 0;
    return Math.max(0, product.stock - inBag);
  }

  function cartLines() {
    const lines = [];
    state.cart.forEach((qty, id) => {
      const product = productById(id);
      if (!product || !product.active) return;
      const capped = Math.min(qty, product.stock);
      if (capped <= 0) return;
      lines.push({ product, qty: capped, lineTotal: capped * product.price });
    });
    return lines;
  }

  /* ---------- Cart persistence ---------- */
  function saveCart() {
    const data = {};
    cartLines().forEach((line) => {
      data[line.product.id] = line.qty;
    });
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(data));
    } catch (err) {
      /* bag still works for this page view */
    }
  }

  function loadCart() {
    let data = {};
    try {
      data = JSON.parse(localStorage.getItem(CART_KEY) || "{}") || {};
    } catch (err) {
      data = {};
    }
    if (!data || typeof data !== "object") return;
    Object.keys(data).forEach((id) => {
      const qty = Math.trunc(Number(data[id]) || 0);
      const product = productById(id);
      if (product && product.active && product.stock > 0 && qty > 0) {
        state.cart.set(id, Math.min(qty, product.stock));
      }
    });
  }

  /* ---------- Rendering ---------- */
  function renderSkeletons() {
    if (!els.grid) return;
    const block = `
      <div class="card skeleton">
        <div class="skeleton__media shimmer"></div>
        <div class="card__body">
          <div class="skeleton__line shimmer w-40"></div>
          <div class="skeleton__line shimmer w-70"></div>
          <div class="skeleton__line shimmer"></div>
        </div>
      </div>`;
    els.grid.innerHTML = block.repeat(6);
    els.grid.setAttribute("aria-busy", "true");
  }

  function renderFilters() {
    const categories = [];
    activeProducts().forEach((product) => {
      if (categories.indexOf(product.category) === -1) categories.push(product.category);
    });
    if (state.filter !== "All" && categories.indexOf(state.filter) === -1) state.filter = "All";
    els.filters.hidden = categories.length === 0;
    els.filters.innerHTML = ["All"]
      .concat(categories)
      .map(
        (category) =>
          `<button class="chip" type="button" data-cat="${esc(category)}" aria-pressed="${
            state.filter === category
          }">${esc(category)}</button>`
      )
      .join("");
  }

  function cardHTML(product) {
    const out = product.stock <= 0;
    const low = !out && product.stock <= 5;
    const badge = out
      ? '<span class="badge badge--out">Sold out</span>'
      : low
      ? `<span class="badge badge--low">Only ${product.stock} left</span>`
      : "";
    const image = product.image_url
      ? `<img src="${esc(product.image_url)}" alt="${esc(product.name)}" loading="lazy" decoding="async" />`
      : "";

    return `
      <article class="card reveal${out ? " is-out" : ""}" data-id="${esc(product.id)}">
        <div class="card__media${product.image_url ? "" : " is-missing"}">
          ${image}
          ${badge}
        </div>
        <div class="card__body">
          <p class="card__cat">${esc(product.category)}</p>
          <h3 class="card__name">${esc(product.name)}</h3>
          <p class="card__desc">${esc(product.description)}</p>
          <div class="card__price-row">
            <span class="price">${money(product.price)}</span>
            <span class="stock-hint">${out ? "Restocking soon" : `${product.stock} in stock`}</span>
          </div>
          <div class="card__actions">
            <div class="qty" role="group" aria-label="Quantity for ${esc(product.name)}">
              <button type="button" data-qty="down" aria-label="Decrease quantity" ${out ? "disabled" : ""}>
                <svg class="icon icon--sm" aria-hidden="true"><use href="#i-minus"></use></svg>
              </button>
              <output data-qty-out>1</output>
              <button type="button" data-qty="up" aria-label="Increase quantity" ${out ? "disabled" : ""}>
                <svg class="icon icon--sm" aria-hidden="true"><use href="#i-plus"></use></svg>
              </button>
            </div>
            <button class="btn btn--primary btn--sm" type="button" data-add ${out ? "disabled" : ""}>
              ${out ? "Sold out" : "Add to bag"}
            </button>
          </div>
        </div>
      </article>`;
  }

  function renderProducts() {
    const all = activeProducts();
    const list = state.filter === "All" ? all : all.filter((product) => product.category === state.filter);
    els.grid.removeAttribute("aria-busy");

    if (!list.length) {
      els.grid.innerHTML = "";
      if (!all.length) {
        els.empty.hidden = false;
      } else {
        els.empty.hidden = true;
      }
      return;
    }
    els.empty.hidden = true;
    els.grid.innerHTML = list.map(cardHTML).join("");
    observeReveals();
  }

  function renderCart() {
    const lines = cartLines();
    const units = unitsIn(lines);
    const label = units
      ? `${units} item${units === 1 ? "" : "s"} · ${lines.length} product${lines.length === 1 ? "" : "s"}`
      : "Nothing added yet";
    els.cartSub.textContent = label;

    if (!lines.length) {
      els.cartBody.innerHTML = `
        <div class="cart-empty">
          <svg class="icon" aria-hidden="true"><use href="#i-bag"></use></svg>
          <h3>Your bag is empty</h3>
          <p>Add a diffuser, spray or essence oil to start your order.</p>
          <button class="btn btn--outline btn--sm" type="button" data-close-cart>Browse products</button>
        </div>`;
      els.cartFoot.hidden = true;
      els.cartTotal.textContent = money(0);
      return;
    }

    els.cartBody.innerHTML = lines
      .map(
        ({ product, qty, lineTotal }) => `
        <div class="cart-line" data-id="${esc(product.id)}">
          <div class="cart-line__media">
            ${product.image_url ? `<img src="${esc(product.image_url)}" alt="" loading="lazy" />` : ""}
          </div>
          <div>
            <p class="cart-line__name">${esc(product.name)}</p>
            <p class="cart-line__price">${money(product.price)} each</p>
            <div class="cart-line__controls">
              <div class="qty" role="group" aria-label="Quantity for ${esc(product.name)}">
                <button type="button" data-line-qty="down" aria-label="Decrease quantity">
                  <svg class="icon icon--sm" aria-hidden="true"><use href="#i-minus"></use></svg>
                </button>
                <output>${qty}</output>
                <button type="button" data-line-qty="up" aria-label="Increase quantity" ${
                  qty >= product.stock ? "disabled" : ""
                }>
                  <svg class="icon icon--sm" aria-hidden="true"><use href="#i-plus"></use></svg>
                </button>
              </div>
              <button type="button" class="link-btn" data-line-remove>Remove</button>
            </div>
          </div>
          <output class="cart-line__total">${money(lineTotal)}</output>
        </div>`
      )
      .join("");

    els.cartFoot.hidden = false;
    els.cartTotal.textContent = money(subtotalIn(lines));
  }

  function refreshBadge() {
    const units = unitsIn(cartLines());
    els.count.textContent = String(units);
    els.count.classList.toggle("is-live", units > 0);
    if (units > 0) {
      els.count.classList.remove("is-bump");
      void els.count.offsetWidth;
      els.count.classList.add("is-bump");
    }
  }

  function observeReveals() {
    const items = document.querySelectorAll(".reveal:not(.is-in)");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-in"));
      return;
    }
    if (!state.observer) {
      state.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-in");
              state.observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.05, rootMargin: "0px 0px -30px" }
      );
    }
    items.forEach((item, index) => {
      item.style.transitionDelay = `${Math.min(index, 6) * 45}ms`;
      state.observer.observe(item);
    });
  }

  /* ---------- Bag actions ---------- */
  function openCart() {
    renderCart();
    ui.openDialog(els.cartLayer, {
      initialFocus: els.cartLayer.querySelector(".drawer [data-close-cart]"),
    });
  }

  function addToCart(product, qty) {
    const inBag = state.cart.get(product.id) || 0;
    const room = product.stock - inBag;
    if (room <= 0) {
      toast(`All ${product.stock} of this scent are already in your bag.`, { type: "error" });
      openCart();
      return;
    }
    const added = Math.min(qty, room);
    state.cart.set(product.id, inBag + added);
    saveCart();
    refreshBadge();
    renderCart();
    if (added < qty) {
      toast(`Only ${added} left — added what's available.`, { type: "error" });
    } else {
      toast(`Added ${product.name} ×${added}`);
    }
    openCart();
  }

  function setLineQty(id, qty) {
    if (qty <= 0) state.cart.delete(id);
    else state.cart.set(id, qty);
    saveCart();
    refreshBadge();
    renderCart();
  }

  /* ---------- Order confirmation ---------- */
  function makeRef() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let tail = "";
    for (let i = 0; i < 3; i += 1) tail += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return `SF-${Date.now().toString(36).slice(-4).toUpperCase()}${tail}`;
  }

  function buildOrderMessage({ lines, name, phone, area, note, ref }) {
    const rows = [`*New order — ${cfg.storeName || "Sarahs' Fragrance"}*`, "", `Ref: ${ref}`, ""];
    lines.forEach((line, index) => {
      rows.push(`${index + 1}. ${line.product.name} ×${line.qty} — ${money(line.lineTotal)}`);
    });
    rows.push("", `Subtotal: ${money(subtotalIn(lines))}`, "Delivery: to be agreed in chat");
    rows.push("", `Name: ${name}`, `Phone: ${phone}`, `Delivery area: ${area}`);
    if (note) rows.push(`Note: ${note}`);
    rows.push("", "Payment will be confirmed here on WhatsApp. Thank you!");
    return rows.join("\n");
  }

  function saveOrder({ lines, name, phone, area, note, ref }) {
    store
      .createOrder({
        ref,
        customer_name: name,
        customer_phone: phone,
        customer_area: area,
        note,
        items: lines.map((line) => ({
          name: line.product.name,
          qty: line.qty,
          price: line.product.price,
          total: line.lineTotal,
        })),
        subtotal: subtotalIn(lines),
      })
      .catch((err) => {
        console.warn("[Sarahs' Fragrance] Order wasn't saved to the admin dashboard:", err);
      });
  }

  function renderSummary(lines) {
    els.summary.innerHTML =
      lines
        .map(
          ({ product, qty, lineTotal }) => `
          <div class="order-list__row">
            <span>${esc(product.name)}</span>
            <span class="q">×${qty}</span>
            <span class="line">${money(lineTotal)}</span>
          </div>`
        )
        .join("") +
      `<div class="order-list__total"><span>Subtotal</span><strong>${money(subtotalIn(lines))}</strong></div>`;
  }

  function openOrder() {
    const lines = cartLines();
    if (!lines.length) {
      toast("Your bag is empty. Add a product first.", { type: "error" });
      return;
    }
    renderSummary(lines);
    els.form.hidden = false;
    els.done.hidden = true;
    els.summary.hidden = false;
    els.error.hidden = true;
    els.form.reset();

    closeDialog(els.cartLayer);
    els.cartBtn.focus({ preventScroll: true });
    ui.openDialog(els.orderLayer, { initialFocus: els.name });
  }

  function showDone(ref, url) {
    els.form.hidden = true;
    els.done.hidden = false;
    els.summary.hidden = true;
    els.doneRef.textContent = `Order ${ref}`;
    els.doneLink.href = url;
    state.cart.clear();
    saveCart();
    refreshBadge();
    renderCart();
    els.form.reset();
    els.done.querySelector("[data-close-order]").focus({ preventScroll: true });
  }

  function onSubmit(event) {
    event.preventDefault();
    const lines = cartLines();
    if (!lines.length) {
      els.error.textContent = "Your bag is empty. Add a product first.";
      els.error.hidden = false;
      return;
    }
    if (String(cfg.whatsappNumber || "").replace(/\D/g, "").length < 7) {
      els.error.textContent = "Ordering isn't connected yet — please check back shortly.";
      els.error.hidden = false;
      console.warn("[Sarahs' Fragrance] Set whatsappNumber in js/config.js to receive orders.");
      return;
    }
    const data = new FormData(els.form);
    const name = String(data.get("name") || "").trim();
    const phone = String(data.get("phone") || "").trim();
    const area = String(data.get("area") || "").trim();
    const note = String(data.get("note") || "").trim();

    if (!name || !phone || !area) {
      els.error.textContent = "Please add your name, phone number and delivery area.";
      els.error.hidden = false;
      return;
    }
    if (phone.replace(/\D/g, "").length < 7) {
      els.error.textContent = "That phone number looks too short.";
      els.error.hidden = false;
      els.phone.focus();
      return;
    }

    els.error.hidden = true;
    const ref = makeRef();
    const url = waUrl(buildOrderMessage({ lines, name, phone, area, note, ref }));
    openExternal(url);
    showDone(ref, url);
    saveOrder({ lines, name, phone, area, note, ref });
  }

  /* ---------- Events ---------- */
  function onGridClick(event) {
    const card = event.target.closest(".card");
    if (!card || !els.grid.contains(card)) return;
    const product = productById(card.dataset.id);
    if (!product) return;

    const output = card.querySelector("[data-qty-out]");
    let qty = Number(output && output.textContent) || 1;

    const step = event.target.closest("[data-qty]");
    if (step) {
      const next = step.dataset.qty === "up" ? qty + 1 : qty - 1;
      qty = Math.min(Math.max(1, next), Math.max(1, product.stock));
      if (output) output.textContent = String(qty);
      return;
    }

    if (event.target.closest("[data-add]")) {
      const inBag = state.cart.get(product.id) || 0;
      const room = product.stock - inBag;
      if (room <= 0) {
        toast("You've added all the available stock for this item.", { type: "error" });
        return;
      }
      addToCart(product, Math.min(qty, room));
    }
  }

  function onCartClick(event) {
    const line = event.target.closest(".cart-line");
    if (!line) return;
    const product = productById(line.dataset.id);
    if (!product) return;
    const current = state.cart.get(product.id) || 0;

    const step = event.target.closest("[data-line-qty]");
    if (step) {
      const next = step.dataset.lineQty === "up" ? Math.min(product.stock, current + 1) : current - 1;
      setLineQty(product.id, next);
      return;
    }
    if (event.target.closest("[data-line-remove]")) {
      setLineQty(product.id, 0);
      toast(`Removed ${product.name}`);
    }
  }

  function bindEvents() {
    els.grid.addEventListener("click", onGridClick);
    els.cartBody.addEventListener("click", onCartClick);
    els.filters.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-cat]");
      if (!chip) return;
      state.filter = chip.dataset.cat;
      renderFilters();
      renderProducts();
    });
    els.cartBtn.addEventListener("click", openCart);
    els.confirmBtn.addEventListener("click", openOrder);
    els.form.addEventListener("submit", onSubmit);

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-cart]")) {
        event.preventDefault();
        closeDialog(els.cartLayer);
      } else if (event.target.closest("[data-close-order]")) {
        event.preventDefault();
        closeDialog(els.orderLayer);
      }
    });

    document.addEventListener(
      "error",
      (event) => {
        const image = event.target;
        if (!image || image.tagName !== "IMG") return;
        const frame = image.parentElement;
        if (frame) frame.classList.add("is-missing");
        image.remove();
      },
      true
    );
  }

  /* ---------- Boot ---------- */
  function cache() {
    els.grid = document.getElementById("productsGrid");
    els.filters = document.getElementById("filters");
    els.empty = document.getElementById("shopEmpty");
    els.cartBtn = document.getElementById("cartBtn");
    els.count = document.getElementById("cartCount");
    els.cartLayer = document.getElementById("cartLayer");
    els.cartBody = document.getElementById("cartBody");
    els.cartSub = document.getElementById("cartSub");
    els.cartFoot = document.getElementById("cartFoot");
    els.cartTotal = document.getElementById("cartTotal");
    els.confirmBtn = document.getElementById("confirmOrderBtn");
    els.orderLayer = document.getElementById("orderLayer");
    els.summary = document.getElementById("orderSummary");
    els.form = document.getElementById("orderForm");
    els.name = document.getElementById("customerName");
    els.phone = document.getElementById("customerPhone");
    els.error = document.getElementById("orderError");
    els.done = document.getElementById("orderDone");
    els.doneRef = document.getElementById("doneRef");
    els.doneLink = document.getElementById("doneLink");
  }

  async function loadCatalogue() {
    try {
      state.products = await store.listProducts();
      loadCart();
      renderFilters();
      renderProducts();
      renderCart();
      refreshBadge();
      observeReveals();
    } catch (err) {
      els.grid.innerHTML = "";
      els.grid.removeAttribute("aria-busy");
      els.filters.hidden = true;
      els.empty.hidden = false;
      els.empty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-alert"></use></svg>
        <h3>Couldn't load the collection</h3>
        <p>${esc(store.errorMessage(err))}</p>
        <button class="btn btn--outline btn--sm" type="button" id="retryBtn">Try again</button>`;
      const retry = document.getElementById("retryBtn");
      if (retry) {
        retry.addEventListener("click", () => {
          els.empty.hidden = true;
          renderSkeletons();
          loadCatalogue();
        });
      }
    }
  }

  function start() {
    cache();
    wireWaLinks();
    bindEvents();
    const year = document.getElementById("year");
    if (year) year.textContent = String(new Date().getFullYear());
    renderSkeletons();
    loadCatalogue();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})((window.SF = window.SF || {}));
