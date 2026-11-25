/* Sarahs' Fragrance — data layer.
   Live mode talks to Supabase; demo mode keeps the same shape in localStorage. */

(function (SF) {
  const cfg = SF.config;
  const PRODUCTS_KEY = "sf.products.v1";
  const ORDERS_KEY = "sf.orders.v1";
  const SESSION_KEY = "sf.admin.session";
  const LOG_KEY = "sf.logs.v1";
  const LOG_LIMIT = 100;
  const ORDER_STATUSES = ["new", "paid", "processed"];

  /* Plain-language copy. Customers only ever see the `shop` set; the `admin`
     set is allowed to name the fix because the admin can act on it. */
  const COPY = {
    shop: {
      offline: "The shop can't connect right now. Check your internet and try again.",
      secure: "The secure connection to the shop failed. Check your internet and try again.",
      setup: "The shop is still getting ready, so products can't be shown just yet. Please check back shortly.",
      busy: "The shop is busy right now. Please try again in a moment.",
      forbidden: "That action isn't available to you. Please sign in or contact Sarah.",
      session: "Please sign in again to continue.",
      auth: "Please sign in again to continue.",
      unconfirmed: "Please sign in again to continue.",
      config: "The shop isn't ready yet. Please check back shortly.",
      duplicate: "That order is already recorded. Please send it once more.",
      invalid: "Some of the details weren't accepted. Check them and try again.",
      notfound: "That item isn't available any more. Please refresh the page.",
      server: "The shop couldn't finish that just now. Please try again in a moment.",
      unknown: "Something went wrong. Please try again.",
    },
    admin: {
      offline: "Can't reach the server. Check your internet connection and try again.",
      secure: "The secure connection failed. Check the network and the site address, then try again.",
      setup: "The shop database isn't ready yet, so nothing can be loaded or saved.",
      busy: "Too many attempts in a short time. Wait a moment and try again.",
      forbidden: "This account isn't set up as the shop admin, so it can't open or change the shop. Sign in with Sarah's account.",
      session: "You've been signed out, or this account isn't allowed in. Sign in again to continue.",
      auth: "That email and password don't match. Check them and try again.",
      unconfirmed: "This account still needs confirming. Confirm the email in Supabase, then sign in again.",
      config: "The shop's connection settings don't look right. Check js/config.js.",
      duplicate: "That reference is already in use. Try again.",
      invalid: "The server didn't accept those details. Check the values and try again.",
      notfound: "That item no longer exists. Refresh the page and try again.",
      server: "The server had a problem. Please try again in a moment.",
      unknown: "That didn't go through. Please try again.",
    },
  };

  const SEED = [
    {
      id: "seed-reed",
      name: "Blossom Reed Diffuser",
      category: "Diffusers",
      price: 120,
      stock: 14,
      image_url: "assets/reed-diffuser.png",
      description: "Peony and pink pepper on rattan reeds — up to eight weeks of scent in any room.",
      active: true,
      created_at: "2026-09-02T09:00:00Z",
    },
    {
      id: "seed-ultrasonic",
      name: "Sage & Lily Ultrasonic Diffuser",
      category: "Diffusers",
      price: 260,
      stock: 6,
      image_url: "assets/ultrasonic-diffuser.png",
      description: "A quiet ceramic mist diffuser for bedrooms and offices. Add water and a few drops of essence.",
      active: true,
      created_at: "2026-09-05T09:00:00Z",
    },
    {
      id: "seed-spray",
      name: "Linen & Petal Room Spray",
      category: "Sprays",
      price: 85,
      stock: 9,
      image_url: "assets/room-spray.png",
      description: "A fine mist for bedding, curtains and sofas. Fresh petals over soft linen. 250 ml.",
      active: true,
      created_at: "2026-09-08T09:00:00Z",
    },
    {
      id: "seed-essence",
      name: "Citrus Bloom Essence Oil",
      category: "Essence oils",
      price: 70,
      stock: 24,
      image_url: "assets/essence-oil.png",
      description: "Bright citrus and orange blossom concentrate for diffusers and burners. 15 ml.",
      active: true,
      created_at: "2026-09-11T09:00:00Z",
    },
    {
      id: "seed-car",
      name: "Rosewood Car Diffuser",
      category: "Diffusers",
      price: 95,
      stock: 11,
      image_url: "assets/car-diffuser.png",
      description: "A small hanging diffuser with a wooden cap — keeps the car gently scented for weeks.",
      active: true,
      created_at: "2026-09-14T09:00:00Z",
    },
    {
      id: "seed-gift",
      name: "Spring Bloom Gift Set",
      category: "Gift sets",
      price: 320,
      stock: 4,
      image_url: "assets/gift-set.png",
      description: "Reed diffuser, essence oil and note card in a ribboned box. Ready to give.",
      active: true,
      created_at: "2026-09-18T09:00:00Z",
    },
  ];

  function normalise(row) {
    return {
      id: String(row.id),
      name: String(row.name || "Untitled"),
      category: String(row.category || "Other"),
      description: String(row.description || ""),
      price: Math.max(0, Number(row.price) || 0),
      stock: Math.max(0, Math.trunc(Number(row.stock) || 0)),
      image_url: String(row.image_url || ""),
      active: row.active !== false,
      created_at: row.created_at || new Date().toISOString(),
    };
  }

  function byCreated(a, b) {
    return new Date(a.created_at) - new Date(b.created_at) || a.name.localeCompare(b.name);
  }

  function readLocal() {
    let raw = null;
    try {
      raw = localStorage.getItem(PRODUCTS_KEY);
    } catch (err) {
      raw = null;
    }
    if (!raw) {
      writeLocal(SEED);
      return SEED.map(normalise).sort(byCreated);
    }
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("bad store");
      return parsed.map(normalise).sort(byCreated);
    } catch (err) {
      writeLocal(SEED);
      return SEED.map(normalise).sort(byCreated);
    }
  }

  function writeLocal(rows) {
    try {
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(rows));
    } catch (err) {
      throw new Error("This browser blocked saving. Check that storage is allowed for this site.");
    }
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "p-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function normaliseOrder(row) {
    const items = Array.isArray(row.items)
      ? row.items.map((item) => {
          const qty = Math.max(1, Math.trunc(Number(item.qty) || 1));
          const price = Math.max(0, Number(item.price) || 0);
          return {
            name: String(item.name || "Item"),
            qty,
            price,
            total: Math.max(0, Number(item.total) || price * qty),
          };
        })
      : [];
    return {
      id: row.id ? String(row.id) : newId(),
      ref: String(row.ref || ""),
      customer_name: String(row.customer_name || ""),
      customer_phone: String(row.customer_phone || ""),
      customer_area: String(row.customer_area || ""),
      note: String(row.note || ""),
      items,
      subtotal: Math.max(0, Number(row.subtotal) || 0),
      status: ORDER_STATUSES.indexOf(row.status) === -1 ? "new" : row.status,
      created_at: row.created_at || new Date().toISOString(),
    };
  }

  function byNewest(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  }

  function readOrdersLocal() {
    let raw = null;
    try {
      raw = localStorage.getItem(ORDERS_KEY);
    } catch (err) {
      raw = null;
    }
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(normaliseOrder).sort(byNewest) : [];
    } catch (err) {
      return [];
    }
  }

  function writeOrdersLocal(rows) {
    try {
      localStorage.setItem(ORDERS_KEY, JSON.stringify(rows));
    } catch (err) {
      throw new Error("This browser blocked saving the order.");
    }
  }

  function hasLiveKeys() {
    const url = (cfg.supabaseUrl || "").trim();
    const key = (cfg.supabaseAnonKey || "").trim();
    return /^https:\/\/.+\.supabase\.co\/?$/.test(url) && key.length > 30;
  }

  /* ---------- Errors ---------- */
  function rawMessage(err) {
    const message =
      (err && (err.error_description || err.message || err.hint)) ||
      (typeof err === "string" ? err : "");
    return String(message || "").trim();
  }

  function classify(err) {
    const message = rawMessage(err);
    const status = Number(err && (err.status || err.statusCode)) || 0;
    if (/invalid login credentials|invalid_grant|password.*(not correct|incorrect|wrong)/i.test(message)) {
      return "auth";
    }
    if (/email not confirmed/i.test(message)) return "unconfirmed";
    if (/jwt expired|refresh token|session (expired|missing)|invalid refresh/i.test(message)) return "session";
    if (/row-level security|permission denied|insufficient privilege|not authorized/i.test(message)) {
      return "forbidden";
    }
    if (/does not exist|schema cache|42P01|PGRST205|could not find the table/i.test(message)) return "setup";
    if (/duplicate key|already exists|23505/i.test(message)) return "duplicate";
    if (/net::err_cert|ssl|certificate|mixed content/i.test(message)) return "secure";
    if (/failed to fetch|networkerror|load failed|network request failed/i.test(message)) return "offline";
    if (/api key|jwt|apikey/i.test(message)) return "config";
    if (/rate limit|too many requests/i.test(message)) return "busy";
    /* Status codes catch everything the messages didn't name. */
    if (status === 400 || status === 422) return "invalid";
    if (status === 401) return "session";
    if (status === 403) return "forbidden";
    if (status === 404) return "notfound";
    if (status === 409) return "duplicate";
    if (status === 429) return "busy";
    if (status >= 500) return "server";
    return "unknown";
  }

  function problemDetail(err, kind) {
    const bits = [];
    const message = rawMessage(err);
    if (message) bits.push(message);
    const status = err && (err.status || err.statusCode);
    if (status) bits.push("response " + status);
    if (err && err.code && String(err.code) !== String(status)) bits.push("code " + err.code);
    if (kind === "setup") {
      bits.push("The database tables are missing — run supabase/schema.sql in the Supabase SQL Editor.");
    }
    if (kind === "offline") {
      bits.push("The server couldn't be reached. Check the network, then the Supabase URL and key in js/config.js.");
    }
    if (kind === "config") bits.push("Check the Supabase URL and public key in js/config.js.");
    return bits.join(" · ") || "The server didn't give a reason.";
  }

  function errorCode() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let tail = "";
    for (let i = 0; i < 4; i += 1) tail += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    return "ERR-" + tail;
  }

  function normaliseLog(row) {
    let details = row.details;
    if (typeof details === "string") {
      try {
        details = JSON.parse(details);
      } catch (err) {
        details = {};
      }
    }
    return {
      id: row.id ? String(row.id) : newId(),
      code: String(row.code || ""),
      area: String(row.area || "general"),
      message: String(row.message || ""),
      details: details && typeof details === "object" ? details : {},
      created_at: row.created_at || new Date().toISOString(),
    };
  }

  function readLogsLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOG_KEY) || "[]");
      return Array.isArray(parsed) ? parsed.map(normaliseLog) : [];
    } catch (err) {
      return [];
    }
  }

  const Store = {
    mode: "demo",
    client: null,
    sessionEmail: null,

    init() {
      if (hasLiveKeys()) {
        /* Keep live mode even if the library or settings fail, so the admin
           page never quietly drops to the demo password or seed catalogue. */
        this.mode = "live";
        if (window.supabase && typeof window.supabase.createClient === "function") {
          try {
            this.client = window.supabase.createClient(
              cfg.supabaseUrl.trim().replace(/\/$/, ""),
              cfg.supabaseAnonKey.trim()
            );
          } catch (err) {
            this.client = null;
          }
        }
      }
      return this;
    },

    isLive() {
      return this.mode === "live";
    },

    /* The Supabase script comes from a CDN over HTTPS. If that failed to load,
       every call reports a connection problem instead of touching local data. */
    liveClient() {
      if (!this.client) {
        throw Object.assign(
          new Error("Failed to fetch: the Supabase library did not load from the CDN."),
          { status: 0 }
        );
      }
      return this.client;
    },

    friendlyMessage(err, audience) {
      const kind = classify(err);
      const copy = COPY[audience === "shop" ? "shop" : "admin"];
      return copy[kind] || copy.unknown;
    },

    /* Turns a raw error into one plain sentence plus a reference code, and
       records the technical detail in the log. Never throws. */
    problem(area, err, options) {
      const opts = options || {};
      const audience = opts.audience === "shop" ? "shop" : "admin";
      const kind = classify(err);
      const copy = COPY[audience];
      const entry = normaliseLog({
        id: newId(),
        code: errorCode(),
        area: String(area || "general"),
        message: rawMessage(err).slice(0, 600) || "No error message was returned.",
        details: {
          kind,
          status: (err && (err.status || err.statusCode)) || null,
          code: (err && err.code) || null,
          security: kind === "forbidden" || kind === "session" || kind === "auth",
          signedIn: this.sessionEmail || null,
          page: typeof location !== "undefined" ? location.pathname : "",
          mode: this.mode,
        },
        created_at: new Date().toISOString(),
      });
      this.writeLog(entry);
      const custom = opts.message && (kind === "unknown" || kind === "server") ? opts.message : "";
      return {
        code: entry.code,
        message: custom || copy[kind] || copy.unknown,
        detail: problemDetail(err, kind),
        kind,
        when: entry.created_at,
        mode: this.mode,
      };
    },

    /* Fire-and-forget. Live mode writes to error_logs; otherwise (or if that
       fails) the entry is kept in this browser so the admin can still see it. */
    async writeLog(entry) {
      if (this.mode === "live" && this.client) {
        try {
          const { error } = await this.liveClient().from("error_logs").insert({
            code: entry.code,
            area: entry.area,
            message: entry.message,
            details: entry.details,
            created_at: entry.created_at,
          });
          if (!error) return true;
        } catch (err) {
          /* fall back to the browser log below */
        }
      }
      try {
        const rows = readLogsLocal();
        rows.unshift(entry);
        localStorage.setItem(LOG_KEY, JSON.stringify(rows.slice(0, LOG_LIMIT)));
      } catch (err) {
        /* nowhere else to record it */
      }
      return false;
    },

    async listErrorLogs(limit) {
      const max = Math.max(1, Math.min(200, Number(limit) || 50));
      if (this.mode === "live") {
        const { data, error } = await this.liveClient()
          .from("error_logs")
          .select("id, code, area, message, details, created_at")
          .order("created_at", { ascending: false })
          .limit(max);
        if (error) throw error;
        return (data || []).map(normaliseLog);
      }
      return readLogsLocal().slice(0, max);
    },

    async listProducts() {
      if (this.mode === "live") {
        const { data, error } = await this.liveClient()
          .from("products")
          .select("id, name, category, description, price, stock, image_url, active, created_at")
          .order("created_at", { ascending: true });
        if (error) throw error;
        return (data || []).map(normalise).sort(byCreated);
      }
      return readLocal();
    },

    async createProduct(input) {
      const row = normalise({ ...input, id: newId(), created_at: new Date().toISOString() });

      if (this.mode === "live") {
        const payload = {
          name: row.name,
          category: row.category,
          description: row.description,
          price: row.price,
          stock: row.stock,
          image_url: row.image_url,
          active: row.active,
        };
        const { data, error } = await this.liveClient().from("products").insert(payload).select().single();
        if (error) throw error;
        return normalise(data);
      }

      const rows = readLocal();
      rows.push(row);
      writeLocal(rows);
      return row;
    },

    async updateProduct(id, patch) {
      const allowed = {};
      ["name", "category", "description", "price", "stock", "image_url", "active"].forEach((key) => {
        if (patch[key] !== undefined) allowed[key] = patch[key];
      });
      if (allowed.price !== undefined) allowed.price = Math.max(0, Number(allowed.price) || 0);
      if (allowed.stock !== undefined) allowed.stock = Math.max(0, Math.trunc(Number(allowed.stock) || 0));

      if (this.mode === "live") {
        const { data, error } = await this.liveClient()
          .from("products")
          .update(allowed)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return normalise(data);
      }

      const rows = readLocal();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) throw new Error("That listing no longer exists.");
      rows[index] = normalise({ ...rows[index], ...allowed });
      writeLocal(rows);
      return rows[index];
    },

    async deleteProduct(id) {
      if (this.mode === "live") {
        const { error } = await this.liveClient().from("products").delete().eq("id", id);
        if (error) throw error;
        return true;
      }
      const rows = readLocal().filter((row) => row.id !== id);
      writeLocal(rows);
      return true;
    },

    async listOrders() {
      if (this.mode === "live") {
        const { data, error } = await this.liveClient()
          .from("orders")
          .select(
            "id, ref, customer_name, customer_phone, customer_area, note, items, subtotal, status, created_at"
          )
          .order("created_at", { ascending: false });
        if (error) throw error;
        return (data || []).map(normaliseOrder);
      }
      return readOrdersLocal();
    },

    async createOrder(input) {
      const row = normaliseOrder({
        ...input,
        id: newId(),
        status: "new",
        created_at: new Date().toISOString(),
      });

      if (this.mode === "live") {
        /* Customers are anonymous, so insert without reading the row back. */
        const { error } = await this.liveClient().from("orders").insert({
          ref: row.ref,
          customer_name: row.customer_name,
          customer_phone: row.customer_phone,
          customer_area: row.customer_area,
          note: row.note,
          items: row.items,
          subtotal: row.subtotal,
          status: "new",
        });
        if (error) throw error;
        return row;
      }

      const rows = readOrdersLocal();
      rows.unshift(row);
      writeOrdersLocal(rows);
      return row;
    },

    async updateOrderStatus(id, status) {
      if (ORDER_STATUSES.indexOf(status) === -1) throw new Error("Unknown order status.");

      if (this.mode === "live") {
        const { data, error } = await this.liveClient()
          .from("orders")
          .update({ status })
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        return normaliseOrder(data);
      }

      const rows = readOrdersLocal();
      const index = rows.findIndex((row) => row.id === id);
      if (index === -1) throw new Error("That order no longer exists.");
      rows[index] = normaliseOrder({ ...rows[index], status });
      writeOrdersLocal(rows);
      return rows[index];
    },

    /* Live mode asks the database whether the signed-in email is listed as
       the shop admin. RLS returns no rows for anyone else, so this is also
       false for a perfectly valid account that simply isn't Sarah's. */
    async isAdmin() {
      if (this.mode !== "live") return true;
      const { data, error } = await this.liveClient().from("admins").select("email").limit(1);
      if (error) throw error;
      return Array.isArray(data) && data.length > 0;
    },

    async signIn(email, password) {
      if (this.mode === "live") {
        const { data, error } = await this.liveClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
        const signedIn = data.user ? data.user.email : email;
        this.sessionEmail = signedIn;
        return { email: signedIn };
      }

      if (!password) throw new Error("Enter the admin password.");
      if (password !== cfg.demoAdminPassword) throw new Error("That password is not correct.");
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (err) {
        /* session still works for this page view */
      }
      this.sessionEmail = "demo@sarahs-fragrance.local";
      return { email: "demo@sarahs-fragrance.local" };
    },

    async signOut() {
      if (this.mode === "live") {
        const { error } = await this.liveClient().auth.signOut();
        if (error) throw error;
        this.sessionEmail = null;
        return;
      }
      this.sessionEmail = null;
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch (err) {
        /* ignore */
      }
    },

    async getSession() {
      if (this.mode === "live") {
        try {
          const { data, error } = await this.liveClient().auth.getSession();
          if (error) {
            this.sessionEmail = null;
            return null;
          }
          const session = data && data.session;
          this.sessionEmail = session ? session.user.email : null;
          return session ? { email: session.user.email } : null;
        } catch (err) {
          this.sessionEmail = null;
          return null;
        }
      }
      try {
        const demo = sessionStorage.getItem(SESSION_KEY) ? { email: "demo@sarahs-fragrance.local" } : null;
        this.sessionEmail = demo ? demo.email : null;
        return demo;
      } catch (err) {
        return null;
      }
    },
  };

  SF.store = Store.init();
})((window.SF = window.SF || {}));
