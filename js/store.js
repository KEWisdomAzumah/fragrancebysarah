/* Sarahs' Fragrance — data layer.
   Live mode talks to Supabase; demo mode keeps the same shape in localStorage. */

(function (SF) {
  const cfg = SF.config;
  const PRODUCTS_KEY = "sf.products.v1";
  const ORDERS_KEY = "sf.orders.v1";
  const SESSION_KEY = "sf.admin.session";
  const ORDER_STATUSES = ["new", "paid", "processed"];

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

  const Store = {
    mode: "demo",
    client: null,

    init() {
      if (hasLiveKeys() && window.supabase && typeof window.supabase.createClient === "function") {
        try {
          this.client = window.supabase.createClient(
            cfg.supabaseUrl.trim().replace(/\/$/, ""),
            cfg.supabaseAnonKey.trim()
          );
          this.mode = "live";
        } catch (err) {
          this.mode = "demo";
        }
      }
      return this;
    },

    isLive() {
      return this.mode === "live";
    },

    errorMessage(err) {
      const message = (err && (err.message || err.error_description)) || String(err || "");
      if (!message) return "Something went wrong. Please try again.";
      if (/invalid login credentials/i.test(message)) return "That email and password don't match.";
      if (/email not confirmed/i.test(message)) return "Confirm your email in Supabase before signing in.";
      if (/row-level security|permission denied/i.test(message)) {
        return "This account isn't allowed to change the shop. Check your Supabase policies.";
      }
      if (/does not exist|schema cache|42P01/i.test(message)) {
        return "The orders table is missing. Re-run supabase/schema.sql in Supabase.";
      }
      if (/failed to fetch|networkerror|load failed/i.test(message)) {
        return "Can't reach the database. Check your connection and Supabase keys.";
      }
      if (/jwt|api key/i.test(message)) return "Supabase keys look wrong. Check js/config.js.";
      return message;
    },

    async listProducts() {
      if (this.mode === "live") {
        const { data, error } = await this.client
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
        const { data, error } = await this.client.from("products").insert(payload).select().single();
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
        const { data, error } = await this.client
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
        const { error } = await this.client.from("products").delete().eq("id", id);
        if (error) throw error;
        return true;
      }
      const rows = readLocal().filter((row) => row.id !== id);
      writeLocal(rows);
      return true;
    },

    async listOrders() {
      if (this.mode === "live") {
        const { data, error } = await this.client
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
        const { error } = await this.client.from("orders").insert({
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
        const { data, error } = await this.client
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

    async signIn(email, password) {
      if (this.mode === "live") {
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return { email: data.user ? data.user.email : email };
      }

      if (!password) throw new Error("Enter the admin password.");
      if (password !== cfg.demoAdminPassword) throw new Error("That password is not correct.");
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch (err) {
        /* session still works for this page view */
      }
      return { email: "demo@sarahs-fragrance.local" };
    },

    async signOut() {
      if (this.mode === "live") {
        const { error } = await this.client.auth.signOut();
        if (error) throw error;
        return;
      }
      try {
        sessionStorage.removeItem(SESSION_KEY);
      } catch (err) {
        /* ignore */
      }
    },

    async getSession() {
      if (this.mode === "live") {
        const { data, error } = await this.client.auth.getSession();
        if (error) return null;
        const session = data && data.session;
        return session ? { email: session.user.email } : null;
      }
      try {
        return sessionStorage.getItem(SESSION_KEY) ? { email: "demo@sarahs-fragrance.local" } : null;
      } catch (err) {
        return null;
      }
    },
  };

  SF.store = Store.init();
})((window.SF = window.SF || {}));
