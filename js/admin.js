/* Sarahs' Fragrance — admin: sign in, stock, listings. */

(function (SF) {
  "use strict";

  const cfg = SF.config || {};
  const ui = SF.ui;
  const store = SF.store;
  const { esc, money, toast, closeDialog } = ui;

  const state = {
    products: [],
    orders: [],
    session: null,
    editingId: null,
    pendingDelete: null,
    search: "",
    orderFilter: "all",
    ordersProblem: null,
    log: [],
    logProblem: null,
    stockTimers: new Map(),
  };

  const els = {};
  const byId = (id) => state.products.find((product) => product.id === id);

  /* ---------- Rendering ---------- */
  function rowHTML(product) {
    const image = product.image_url
      ? `<img src="${esc(product.image_url)}" alt="" loading="lazy" />`
      : "";

    return `
      <tr data-id="${esc(product.id)}" class="${product.active ? "" : "is-draft"}">
        <td data-cell="product">
          <div class="prod-cell">
            <div class="prod-cell__media${product.image_url ? "" : " is-missing"}">${image}</div>
            <div>
              <p class="prod-cell__name">${esc(product.name)}</p>
              <p class="prod-cell__cat">${esc(product.category)}${product.active ? "" : " · hidden"}</p>
            </div>
          </div>
        </td>
        <td data-label="Price"><span class="cell-price">${money(product.price)}</span></td>
        <td data-label="Stock">
          <div class="stock-ctl">
            <button type="button" data-stock="down" aria-label="Decrease stock for ${esc(product.name)}" ${
      product.stock <= 0 ? "disabled" : ""
    }>
              <svg class="icon icon--sm" aria-hidden="true"><use href="#i-minus"></use></svg>
            </button>
            <input
              type="number"
              min="0"
              max="99999"
              step="1"
              inputmode="numeric"
              value="${product.stock}"
              data-stock-input
              aria-label="Stock for ${esc(product.name)}"
            />
            <button type="button" data-stock="up" aria-label="Increase stock for ${esc(product.name)}">
              <svg class="icon icon--sm" aria-hidden="true"><use href="#i-plus"></use></svg>
            </button>
          </div>
        </td>
        <td data-label="Live">
          <label class="switch">
            <input type="checkbox" data-active ${
              product.active ? "checked" : ""
            } aria-label="Show ${esc(product.name)} in the shop" />
            <span class="switch__track"></span>
          </label>
        </td>
        <td data-cell="actions">
          <div class="row-actions">
            <button type="button" class="icon-btn icon-btn--sm" data-edit="${esc(product.id)}" aria-label="Edit ${
      esc(product.name)
    }" title="Edit">
              <svg class="icon icon--sm" aria-hidden="true"><use href="#i-edit"></use></svg>
            </button>
            <button type="button" class="icon-btn icon-btn--sm icon-btn--danger" data-delete="${esc(product.id)}" aria-label="Remove ${
      esc(product.name)
    }" title="Remove">
              <svg class="icon icon--sm" aria-hidden="true"><use href="#i-trash"></use></svg>
            </button>
          </div>
        </td>
      </tr>`;
  }

  function renderStats() {
    const live = state.products.filter((product) => product.active);
    const units = live.reduce((total, product) => total + product.stock, 0);
    const low = live.filter((product) => product.stock > 0 && product.stock <= 5).length;
    const out = live.filter((product) => product.stock === 0).length;

    els.statListings.textContent = String(state.products.length);
    els.statUnits.textContent = String(units);
    els.statLow.innerHTML = `${low} <small>5 or fewer</small>`;
    els.statOut.textContent = String(out);
  }

  function renderTable() {
    state.stockTimers.forEach((timer) => window.clearTimeout(timer));
    state.stockTimers.clear();

    const term = state.search.trim().toLowerCase();
    const rows = state.products.filter((product) => {
      if (!term) return true;
      return (
        product.name.toLowerCase().indexOf(term) !== -1 ||
        product.category.toLowerCase().indexOf(term) !== -1
      );
    });

    if (!rows.length) {
      els.body.innerHTML = "";
      els.tableEmpty.hidden = false;
      if (!state.products.length) {
        els.tableEmpty.innerHTML = `
          <svg class="icon" aria-hidden="true"><use href="#i-spark"></use></svg>
          <h3>No listings yet</h3>
          <p>Add your first diffuser, spray or essence oil to open the shop.</p>
          <button class="btn btn--outline btn--sm" type="button" id="emptyNewBtn">Add a listing</button>`;
        const emptyNew = document.getElementById("emptyNewBtn");
        if (emptyNew) emptyNew.addEventListener("click", () => openProduct(null));
      } else {
        els.tableEmpty.innerHTML = `
          <svg class="icon" aria-hidden="true"><use href="#i-search"></use></svg>
          <h3>Nothing matches “${esc(state.search.trim())}”</h3>
          <p>Try another name or category.</p>`;
      }
    } else {
      els.tableEmpty.hidden = true;
      els.body.innerHTML = rows.map(rowHTML).join("");
    }

    els.listCount.textContent = term
      ? `${rows.length} of ${state.products.length} listings`
      : `${state.products.length} listing${state.products.length === 1 ? "" : "s"}`;
  }

  function renderAll() {
    renderStats();
    renderTable();
  }

  /* ---------- Orders ---------- */
  const orderDate = new Intl.DateTimeFormat("en-GH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  function statusLabel(status) {
    if (status === "paid") return "Paid";
    if (status === "processed") return "Processed";
    return "New";
  }

  /* Plain sentence for everyone, technical detail folded away for the admin. */
  function problemHTML(problem) {
    const date = new Date(problem.when);
    const when = Number.isNaN(date.getTime()) ? problem.when : orderDate.format(date);
    return `
      <p>${esc(problem.message)}</p>
      <details class="err-detail">
        <summary>Technical details</summary>
        <dl>
          <div><dt>Reference</dt><dd><code>${esc(problem.code)}</code></dd></div>
          <div><dt>What happened</dt><dd>${esc(problem.detail)}</dd></div>
          <div><dt>When</dt><dd>${esc(when)}</dd></div>
        </dl>
        <p class="err-detail__note">Also saved in the system log below.</p>
      </details>`;
  }

  function orderCardHTML(order) {
    const items = order.items
      .map(
        (item) => `
        <li class="order-item">
          <span class="order-item__name">${esc(item.name)}</span>
          <span class="order-item__qty">×${item.qty}</span>
          <span class="order-item__total">${money(item.total)}</span>
        </li>`
      )
      .join("");
    const date = new Date(order.created_at);
    const when = Number.isNaN(date.getTime()) ? "" : orderDate.format(date);
    const selected = (value) => (order.status === value ? " selected" : "");

    return `
      <article class="order-card" data-order="${esc(order.id)}" data-status="${esc(order.status)}">
        <div class="order-card__head">
          <div>
            <p class="order-card__ref">${esc(order.ref || "Order")}</p>
            <p class="order-card__time">${esc(when)}</p>
          </div>
          <span class="status-pill status-pill--${esc(order.status)}">${statusLabel(order.status)}</span>
        </div>
        <ul class="order-items">${items}</ul>
        <dl class="order-card__meta">
          <div><dt>Customer</dt><dd>${esc(order.customer_name)}</dd></div>
          <div><dt>Phone</dt><dd><a href="tel:${esc(
            order.customer_phone.replace(/[^\d+]/g, "")
          )}">${esc(order.customer_phone)}</a></dd></div>
          <div><dt>Deliver to</dt><dd>${esc(order.customer_area)}</dd></div>
          ${
            order.note
              ? `<div><dt>Note</dt><dd class="order-card__note">${esc(order.note)}</dd></div>`
              : ""
          }
        </dl>
        <div class="order-card__foot">
          <p class="order-card__sum">Total <strong>${money(order.subtotal)}</strong></p>
          <label class="order-status">
            <span class="visually-hidden">Change status for order ${esc(order.ref)}</span>
            <select data-order-status aria-label="Status for order ${esc(order.ref)}">
              <option value="new"${selected("new")}>New order</option>
              <option value="paid"${selected("paid")}>Paid</option>
              <option value="processed"${selected("processed")}>Processed</option>
            </select>
          </label>
        </div>
      </article>`;
  }

  function renderOrders() {
    const counts = { all: state.orders.length, new: 0, paid: 0, processed: 0 };
    state.orders.forEach((order) => {
      counts[order.status] += 1;
    });
    document.querySelectorAll("[data-order-count]").forEach((el) => {
      el.textContent = String(counts[el.dataset.orderCount] || 0);
    });

    if (state.ordersProblem) {
      els.ordersList.innerHTML = "";
      els.ordersEmpty.hidden = false;
      els.ordersEmpty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-alert"></use></svg>
        <h3>We couldn't load the orders</h3>
        ${problemHTML(state.ordersProblem)}
        <button class="btn btn--outline btn--sm" type="button" id="ordersRetryBtn">Try again</button>`;
      const retry = document.getElementById("ordersRetryBtn");
      if (retry) retry.addEventListener("click", loadOrders);
      els.orderCount.textContent = "";
      return;
    }

    const filtered =
      state.orderFilter === "all"
        ? state.orders
        : state.orders.filter((order) => order.status === state.orderFilter);

    if (!state.orders.length) {
      els.ordersList.innerHTML = "";
      els.ordersEmpty.hidden = false;
      els.ordersEmpty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-chat"></use></svg>
        <h3>No orders yet</h3>
        <p>Orders sent from the shop checkout will appear here, ready to mark paid and processed.</p>`;
      els.orderCount.textContent = "";
      return;
    }

    els.orderCount.textContent =
      state.orderFilter === "all"
        ? `${state.orders.length} order${state.orders.length === 1 ? "" : "s"}`
        : `${filtered.length} of ${state.orders.length} orders`;

    if (!filtered.length) {
      els.ordersList.innerHTML = "";
      els.ordersEmpty.hidden = false;
      els.ordersEmpty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>
        <h3>No ${statusLabel(state.orderFilter).toLowerCase()} orders</h3>
        <p>Orders you move to this status will show up here.</p>`;
      return;
    }

    els.ordersEmpty.hidden = true;
    els.ordersList.innerHTML = filtered.map(orderCardHTML).join("");
  }

  async function loadOrders() {
    state.ordersProblem = null;
    els.ordersEmpty.hidden = true;
    els.ordersList.innerHTML = '<p class="orders-loading">Loading orders…</p>';
    try {
      state.orders = await store.listOrders();
    } catch (err) {
      state.orders = [];
      state.ordersProblem = store.problem("admin.orders", err, {
        message: "We couldn't load the orders just now. Please try again.",
      });
    }
    renderOrders();
  }

  /* ---------- System log ---------- */
  const AREA_LABELS = {
    "shop.catalogue": "Shop · catalogue",
    "shop.checkout": "Shop · checkout save",
    "admin.orders": "Admin · orders",
    "admin.listings": "Admin · listings",
    "admin.order_status": "Admin · order status",
    "admin.stock": "Admin · stock",
    "admin.listing_save": "Admin · listing form",
    "admin.listing_delete": "Admin · remove listing",
    "admin.listing_visibility": "Admin · visibility",
    "admin.sign_in": "Admin · sign in",
    "admin.sign_out": "Admin · sign out",
    "admin.access": "Admin · access check",
    "admin.log": "Admin · system log",
  };

  function logRowHTML(entry) {
    const date = new Date(entry.created_at);
    const when = Number.isNaN(date.getTime()) ? entry.created_at : orderDate.format(date);
    const detail = JSON.stringify(entry.details || {}, null, 2);
    const flagged = entry.details && entry.details.security;
    return `
      <tr>
        <td data-label="When">${esc(when)}</td>
        <td data-label="Reference"><code>${esc(entry.code)}</code></td>
        <td data-label="Where">${esc(AREA_LABELS[entry.area] || entry.area)}${
      flagged ? ' <span class="log-flag">Access</span>' : ""
    }</td>
        <td data-label="Message" class="log-msg">${esc(entry.message)}</td>
        <td data-label="Details">
          <details class="log-detail"><summary>View</summary><pre>${esc(detail)}</pre></details>
        </td>
      </tr>`;
  }

  function renderLogs() {
    if (state.logProblem) {
      els.logBody.innerHTML = "";
      els.logEmpty.hidden = false;
      els.logEmpty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-alert"></use></svg>
        <h3>We couldn't open the system log</h3>
        ${problemHTML(state.logProblem)}
        <button class="btn btn--outline btn--sm" type="button" id="logRetryBtn">Try again</button>`;
      const retry = document.getElementById("logRetryBtn");
      if (retry) retry.addEventListener("click", loadLogs);
      els.logCount.textContent = "";
      return;
    }

    if (!state.log.length) {
      els.logBody.innerHTML = "";
      els.logEmpty.hidden = false;
      els.logEmpty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-check"></use></svg>
        <h3>Nothing logged</h3>
        <p>If anything goes wrong, the details are saved here with the reference shown to the shopper.</p>`;
      els.logCount.textContent = "";
      return;
    }

    els.logEmpty.hidden = true;
    els.logBody.innerHTML = state.log.map(logRowHTML).join("");
    els.logCount.textContent = `${state.log.length} entr${state.log.length === 1 ? "y" : "ies"}`;
  }

  async function loadLogs() {
    state.logProblem = null;
    els.logEmpty.hidden = true;
    els.logBody.innerHTML = '<tr><td class="table-message" colspan="5">Loading log…</td></tr>';
    try {
      state.log = await store.listErrorLogs(50);
    } catch (err) {
      state.log = [];
      state.logProblem = store.problem("admin.log", err, {
        message: "We couldn't open the system log just now. Please try again.",
      });
    }
    renderLogs();
  }

  async function onOrderStatusChange(event) {
    const select = event.target.closest("[data-order-status]");
    if (!select) return;
    const card = select.closest("[data-order]");
    const order = card ? state.orders.find((row) => row.id === card.dataset.order) : null;
    if (!card || !order) return;

    const next = select.value;
    if (next === order.status) return;
    const previous = order.status;
    select.disabled = true;
    card.classList.add("is-saving");
    try {
      const fresh = await store.updateOrderStatus(order.id, next);
      Object.assign(order, fresh);
      renderOrders();
      toast(`${order.ref} marked ${statusLabel(order.status).toLowerCase()}`);
    } catch (err) {
      select.value = previous;
      select.disabled = false;
      card.classList.remove("is-saving");
      const problem = store.problem("admin.order_status", err, {
        message: "The status didn't save. Please try again.",
      });
      toast(problem.message, { type: "error" });
    }
  }

  /* ---------- Stock ---------- */
  function queueStockSave(row, product, value) {
    const timer = state.stockTimers.get(product.id);
    if (timer) window.clearTimeout(timer);
    state.stockTimers.set(
      product.id,
      window.setTimeout(() => {
        state.stockTimers.delete(product.id);
        if (row.classList.contains("is-saving")) return;
        applyStock(row, product, value);
      }, 650)
    );
  }

  function applyStock(row, product, value) {
    if (!row || row.classList.contains("is-saving")) return;
    const next = Math.max(0, Math.min(99999, Math.trunc(Number(value) || 0)));
    if (next === product.stock) return;

    product.stock = next;
    const input = row.querySelector("[data-stock-input]");
    if (input && Number(input.value) !== next) input.value = String(next);
    const down = row.querySelector('[data-stock="down"]');
    if (down) down.disabled = next <= 0;
    renderStats();
    saveStock(row, product, next);
  }

  async function saveStock(row, product, value) {
    row.classList.add("is-saving");
    try {
      const fresh = await store.updateProduct(product.id, { stock: value });
      Object.assign(product, fresh);
      const input = row.querySelector("[data-stock-input]");
      if (input) input.value = String(fresh.stock);
      renderStats();
    } catch (err) {
      const problem = store.problem("admin.stock", err, {
        message: "The stock change didn't save. Please try again.",
      });
      toast(problem.message, { type: "error" });
      try {
        state.products = await store.listProducts();
        renderAll();
        return;
      } catch (reloadError) {
        /* leave the previous values in place */
      }
    } finally {
      row.classList.remove("is-saving");
    }
  }

  function commitStockInput(row, product) {
    const input = row.querySelector("[data-stock-input]");
    if (!input) return;
    const raw = input.value.trim();
    if (raw === "" || Number(raw) < 0) {
      input.value = String(product.stock);
      return;
    }
    const next = Math.min(99999, Math.trunc(Number(raw)));
    if (next !== product.stock) applyStock(row, product, next);
    else input.value = String(product.stock);
  }

  /* ---------- Listing form ---------- */
  function updatePreview() {
    const url = els.pImage.value.trim();
    els.previewFrame.innerHTML = "";
    if (!url) {
      els.previewNote.textContent = "Paste an image link. Leave empty to use the soft placeholder.";
      return;
    }
    const image = document.createElement("img");
    image.alt = "";
    image.addEventListener("error", () => {
      els.previewFrame.innerHTML = "";
      els.previewNote.textContent = "That image link didn't load — check the URL.";
    });
    image.src = url;
    els.previewFrame.appendChild(image);
    els.previewNote.textContent = "Preview — the shop will show this photo.";
  }

  function openProduct(product) {
    state.editingId = product ? product.id : null;
    els.productForm.reset();
    els.productError.hidden = true;
    els.productTitle.textContent = product ? "Edit listing" : "New listing";
    els.saveBtn.textContent = product ? "Save changes" : "Publish listing";

    if (product) {
      els.pName.value = product.name;
      els.pCategory.value = product.category;
      els.pPrice.value = String(product.price);
      els.pStock.value = String(product.stock);
      els.pImage.value = product.image_url;
      els.pDesc.value = product.description;
      els.pActive.checked = product.active;
    } else {
      els.pActive.checked = true;
      els.pCategory.value = "";
      els.pActive.checked = true;
    }

    updatePreview();
    ui.openDialog(els.productLayer, { initialFocus: els.pName });
  }

  function showProductError(message) {
    els.productError.textContent = message;
    els.productError.hidden = false;
  }

  function showProductProblem(problem) {
    els.productError.innerHTML = problemHTML(problem);
    els.productError.hidden = false;
  }

  async function onSaveProduct(event) {
    event.preventDefault();
    els.productError.hidden = true;

    const data = new FormData(els.productForm);
    const name = String(data.get("name") || "").trim();
    const category = String(data.get("category") || "").trim();
    const price = Number(data.get("price"));
    const stock = Number(data.get("stock"));
    const imageUrl = String(data.get("image_url") || "").trim();
    const description = String(data.get("description") || "").trim();
    const active = els.pActive.checked;

    if (!name || !category) {
      showProductError("Add a name and a category.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      showProductError("Enter a price of 0 or more.");
      els.pPrice.focus();
      return;
    }
    if (!Number.isFinite(stock) || stock < 0 || !Number.isInteger(stock)) {
      showProductError("Stock must be a whole number of 0 or more.");
      els.pStock.focus();
      return;
    }

    const payload = {
      name,
      category,
      description,
      price,
      stock,
      image_url: imageUrl,
      active,
    };

    els.saveBtn.disabled = true;
    els.saveBtn.textContent = "Saving…";
    try {
      if (state.editingId) {
        const saved = await store.updateProduct(state.editingId, payload);
        const index = state.products.findIndex((product) => product.id === saved.id);
        if (index !== -1) state.products[index] = saved;
        toast("Listing updated");
      } else {
        const saved = await store.createProduct(payload);
        state.products.push(saved);
        state.products.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        toast("New listing published");
      }
      renderAll();
      closeDialog(els.productLayer);
    } catch (err) {
      showProductProblem(
        store.problem("admin.listing_save", err, { message: "The listing didn't save. Please try again." })
      );
    } finally {
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = state.editingId ? "Save changes" : "Publish listing";
    }
  }

  /* ---------- Delete ---------- */
  function askDelete(id) {
    const product = byId(id);
    if (!product) return;
    state.pendingDelete = id;
    els.confirmText.textContent = `“${product.name}” will be removed from the shop. This can't be undone.`;
    ui.openDialog(els.confirmLayer, { initialFocus: els.confirmDeleteBtn });
  }

  async function confirmDelete() {
    if (!state.pendingDelete) return;
    const id = state.pendingDelete;
    els.confirmDeleteBtn.disabled = true;
    els.confirmDeleteBtn.textContent = "Removing…";
    try {
      await store.deleteProduct(id);
      state.products = state.products.filter((product) => product.id !== id);
      state.pendingDelete = null;
      renderAll();
      closeDialog(els.confirmLayer);
      toast("Listing removed");
    } catch (err) {
      const problem = store.problem("admin.listing_delete", err, {
        message: "The listing wasn't removed. Please try again.",
      });
      toast(problem.message, { type: "error" });
    } finally {
      els.confirmDeleteBtn.disabled = false;
      els.confirmDeleteBtn.textContent = "Remove listing";
    }
  }

  /* ---------- Auth ---------- */
  function showLoginError(message, code) {
    els.loginError.innerHTML =
      esc(message) + (code ? ` <span class="err-ref">Reference <strong>${esc(code)}</strong></span>` : "");
    els.loginError.hidden = false;
  }

  function loginBusy(busy) {
    els.loginBtn.disabled = busy;
    els.loginBtn.innerHTML = busy
      ? "Signing in…"
      : `${ui.icon("lock", "icon--sm")} Sign in`;
  }

  /* Signed in with the wrong account (or the session ended): the database will
     keep refusing every action, so put them back on the sign-in form. */
  async function denyDashboard(problem) {
    await store.signOut().catch(() => {});
    state.session = null;
    state.products = [];
    state.orders = [];
    els.dashboard.hidden = true;
    els.signOutBtn.hidden = true;
    els.loginView.hidden = false;
    els.password.value = "";
    showLoginError(problem.message, problem.code);
  }

  async function enterDashboard(session) {
    state.session = session;
    els.loginView.hidden = true;
    els.dashboard.hidden = false;
    els.signOutBtn.hidden = false;
    els.adminName.textContent = session.email || "admin";
    els.body.innerHTML = '<tr><td class="table-message" colspan="5">Loading listings…</td></tr>';
    loadOrders();
    loadLogs();

    try {
      if (!(await store.isAdmin())) {
        const problem = store.problem(
          "admin.access",
          Object.assign(new Error("The signed-in account is not listed in public.admins"), { status: 403 }),
          {}
        );
        await denyDashboard(problem);
        return;
      }
    } catch (err) {
      /* If the admin list itself can't be read (setup or network), the listings
         load below reports the same problem with its details. */
    }

    try {
      state.products = await store.listProducts();
      renderAll();
    } catch (err) {
      const problem = store.problem("admin.listings", err, {
        message: "We couldn't load the listings just now. Please try again.",
      });
      if (problem.kind === "forbidden" || problem.kind === "session") {
        await denyDashboard(problem);
        return;
      }
      els.body.innerHTML = "";
      els.tableEmpty.hidden = false;
      els.tableEmpty.innerHTML = `
        <svg class="icon" aria-hidden="true"><use href="#i-alert"></use></svg>
        <h3>We couldn't load the listings</h3>
        ${problemHTML(problem)}
        <button class="btn btn--outline btn--sm" type="button" id="reloadBtn">Try again</button>`;
      const reload = document.getElementById("reloadBtn");
      if (reload) reload.addEventListener("click", () => enterDashboard(session));
    }
  }

  async function onLogin(event) {
    event.preventDefault();
    els.loginError.hidden = true;
    const email = els.email.value.trim();
    const password = els.password.value;

    if (store.isLive() && !email) {
      showLoginError("Enter your admin email.");
      els.email.focus();
      return;
    }
    if (!password) {
      showLoginError("Enter your password.");
      els.password.focus();
      return;
    }

    loginBusy(true);
    try {
      const session = await store.signIn(email, password);
      els.loginForm.reset();
      await enterDashboard(session);
    } catch (err) {
      const problem = store.problem("admin.sign_in", err);
      showLoginError(problem.message, problem.code);
    } finally {
      loginBusy(false);
    }
  }

  async function onSignOut() {
    els.signOutBtn.disabled = true;
    try {
      await store.signOut();
      window.location.reload();
    } catch (err) {
      const problem = store.problem("admin.sign_out", err, {
        message: "Couldn't sign out. Please try again.",
      });
      toast(problem.message, { type: "error" });
      els.signOutBtn.disabled = false;
    }
  }

  /* ---------- Events ---------- */
  function bindEvents() {
    els.loginForm.addEventListener("submit", onLogin);
    els.signOutBtn.addEventListener("click", onSignOut);
    els.newBtn.addEventListener("click", () => openProduct(null));
    els.productForm.addEventListener("submit", onSaveProduct);
    els.confirmDeleteBtn.addEventListener("click", confirmDelete);

    els.orderFilters.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-order-filter]");
      if (!chip) return;
      state.orderFilter = chip.dataset.orderFilter;
      els.orderFilters.querySelectorAll("[data-order-filter]").forEach((btn) => {
        btn.setAttribute("aria-pressed", String(btn === chip));
      });
      renderOrders();
    });
    els.ordersList.addEventListener("change", onOrderStatusChange);
    els.logRefreshBtn.addEventListener("click", loadLogs);

    els.search.addEventListener(
      "input",
      ui.debounce(() => {
        state.search = els.search.value;
        renderTable();
      }, 140)
    );

    els.pImage.addEventListener("input", ui.debounce(updatePreview, 250));

    els.body.addEventListener("click", (event) => {
      const edit = event.target.closest("[data-edit]");
      if (edit) {
        const product = byId(edit.dataset.edit);
        if (product) openProduct(product);
        return;
      }
      const remove = event.target.closest("[data-delete]");
      if (remove) {
        askDelete(remove.dataset.delete);
        return;
      }
      const step = event.target.closest("[data-stock]");
      if (step) {
        const row = step.closest("tr");
        const product = row && byId(row.dataset.id);
        if (!row || !product) return;
        const next = step.dataset.stock === "up" ? product.stock + 1 : product.stock - 1;
        const timer = state.stockTimers.get(product.id);
        if (timer) {
          window.clearTimeout(timer);
          state.stockTimers.delete(product.id);
        }
        applyStock(row, product, next);
      }
    });

    els.body.addEventListener("input", (event) => {
      const input = event.target.closest("[data-stock-input]");
      if (!input) return;
      const row = input.closest("tr");
      const product = row && byId(row.dataset.id);
      if (!row || !product) return;
      if (input.value.trim() === "") return;
      const next = Math.max(0, Math.min(99999, Math.trunc(Number(input.value) || 0)));
      queueStockSave(row, product, next);
    });

    els.body.addEventListener(
      "focusout",
      (event) => {
        const input = event.target.closest("[data-stock-input]");
        if (!input) return;
        const row = input.closest("tr");
        const product = row && byId(row.dataset.id);
        if (!row || !product) return;
        const timer = state.stockTimers.get(product.id);
        if (timer) {
          window.clearTimeout(timer);
          state.stockTimers.delete(product.id);
        }
        commitStockInput(row, product);
      },
      true
    );

    els.body.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && event.target.matches("[data-stock-input]")) {
        event.preventDefault();
        event.target.blur();
      }
    });

    els.body.addEventListener("change", async (event) => {
      const toggle = event.target.closest("[data-active]");
      if (!toggle) return;
      const row = toggle.closest("tr");
      const product = row && byId(row.dataset.id);
      if (!row || !product) return;
      if (row.classList.contains("is-saving")) {
        toggle.checked = product.active;
        return;
      }
      const next = toggle.checked;
      row.classList.add("is-saving");
      try {
        const fresh = await store.updateProduct(product.id, { active: next });
        Object.assign(product, fresh);
        row.classList.toggle("is-draft", !product.active);
        const cat = row.querySelector(".prod-cell__cat");
        if (cat) cat.textContent = `${product.category}${product.active ? "" : " · hidden"}`;
        toast(product.active ? `${product.name} is live in the shop` : `${product.name} hidden from the shop`);
        renderStats();
      } catch (err) {
        toggle.checked = !next;
        const problem = store.problem("admin.listing_visibility", err, {
          message: "That change didn't save. Please try again.",
        });
        toast(problem.message, { type: "error" });
      } finally {
        row.classList.remove("is-saving");
      }
    });

    document.addEventListener("click", (event) => {
      if (event.target.closest("[data-close-product]")) {
        event.preventDefault();
        closeDialog(els.productLayer);
      } else if (event.target.closest("[data-close-confirm]")) {
        event.preventDefault();
        state.pendingDelete = null;
        closeDialog(els.confirmLayer);
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
    els.loginView = document.getElementById("loginView");
    els.loginForm = document.getElementById("loginForm");
    els.emailField = document.getElementById("emailField");
    els.email = document.getElementById("adminEmail");
    els.password = document.getElementById("adminPassword");
    els.passwordLabel = document.getElementById("passwordLabel");
    els.loginBtn = document.getElementById("loginBtn");
    els.loginError = document.getElementById("loginError");
    els.loginHint = document.getElementById("loginHint");
    els.signOutBtn = document.getElementById("signOutBtn");
    els.dashboard = document.getElementById("dashboard");
    els.demoBanner = document.getElementById("demoBanner");
    els.adminName = document.getElementById("adminName");
    els.statListings = document.getElementById("statListings");
    els.statUnits = document.getElementById("statUnits");
    els.statLow = document.getElementById("statLow");
    els.statOut = document.getElementById("statOut");
    els.search = document.getElementById("searchInput");
    els.listCount = document.getElementById("listCount");
    els.body = document.getElementById("productsBody");
    els.tableEmpty = document.getElementById("tableEmpty");
    els.orderFilters = document.getElementById("orderFilters");
    els.ordersList = document.getElementById("ordersList");
    els.ordersEmpty = document.getElementById("ordersEmpty");
    els.orderCount = document.getElementById("orderCount");
    els.logBody = document.getElementById("logBody");
    els.logEmpty = document.getElementById("logEmpty");
    els.logCount = document.getElementById("logCount");
    els.logRefreshBtn = document.getElementById("logRefreshBtn");
    els.newBtn = document.getElementById("newBtn");
    els.productLayer = document.getElementById("productLayer");
    els.productForm = document.getElementById("productForm");
    els.productTitle = document.getElementById("productTitle");
    els.productError = document.getElementById("productError");
    els.pName = document.getElementById("pName");
    els.pCategory = document.getElementById("pCategory");
    els.pPrice = document.getElementById("pPrice");
    els.pStock = document.getElementById("pStock");
    els.pImage = document.getElementById("pImage");
    els.pDesc = document.getElementById("pDesc");
    els.pActive = document.getElementById("pActive");
    els.previewFrame = document.getElementById("imagePreviewFrame");
    els.previewNote = document.getElementById("imagePreviewNote");
    els.saveBtn = document.getElementById("saveProductBtn");
    els.confirmLayer = document.getElementById("confirmLayer");
    els.confirmText = document.getElementById("confirmText");
    els.confirmDeleteBtn = document.getElementById("confirmDeleteBtn");
  }

  async function start() {
    cache();
    bindEvents();
    els.demoBanner.hidden = store.isLive();

    if (store.isLive()) {
      els.email.required = true;
    } else {
      els.emailField.hidden = true;
      els.passwordLabel.textContent = "Admin password";
      els.loginHint.hidden = false;
      els.loginHint.innerHTML = `Demo password: <code>${esc(cfg.demoAdminPassword || "")}</code>. Change it in <code>js/config.js</code>.`;
    }

    const session = await store.getSession();
    if (session) {
      enterDashboard(session);
    } else {
      els.password.focus({ preventScroll: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})((window.SF = window.SF || {}));
