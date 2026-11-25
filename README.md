<div align="center">

# 🌸 Sarahs' Fragrance

**A lightweight, zero-build e-commerce storefront and inventory dashboard for home & office diffusers, room sprays, and essence oils.**

[![Stack](https://img.shields.io/badge/Stack-HTML5%20%7C%20CSS3%20%7C%20Vanilla%20JS-4a7c59?style=flat-square)](#architecture--project-structure)
[![Backend](https://img.shields.io/badge/Database-Supabase%20(Optional)-3ecf8e?style=flat-square&logo=supabase&logoColor=white)](#connecting-supabase-live-mode)
[![Checkout](https://img.shields.io/badge/Checkout-WhatsApp%20API-25D366?style=flat-square&logo=whatsapp&logoColor=white)](#how-checkout-works)
[![Build](https://img.shields.io/badge/Build%20Step-None-lightgrey?style=flat-square)](#local-development)

</div>

---

## Overview

**Sarahs' Fragrance** is a fast, static web application designed for boutique fragrance retail. Customers browse the catalogue, filter products, manage a persistent shopping bag, and submit structured orders directly to WhatsApp—eliminating payment gateway overhead while keeping order fulfillment personal. 

Store owners manage inventory through a password-protected admin portal that operates in **Local Demo Mode** out of the box and seamlessly upgrades to **Live Multi-User Sync** when connected to Supabase.

---

## Key Features

### 🛍️ Customer Storefront (`index.html`)
* **Dynamic Catalogue & Filtering:** Filter fragrances by category, inspect product details, and adjust item quantities.
* **Persistent Order Bag:** Uses `localStorage` so customer selections survive page refreshes.
* **WhatsApp Checkout Flow:** Generates a unique order reference (e.g., `SF-7K3MPQ`), calculates line-item totals in `GH₵`, and pre-fills a formatted WhatsApp message with the customer's delivery details.
* **Adaptive Theme Engine:** Built-in light and dark mode toggle using a custom spring palette (*cream, blossom pink, and sage green*) with browser persistence.

### 🔐 Store Admin Dashboard (`admin.html`)
* **Dual-Mode Storage:** Works immediately via `localStorage` for testing/demoing, or syncs globally across all devices via Supabase PostgreSQL.
* **Real-Time Inventory Metrics:** At-a-glance counters for total listings, total units in stock, low-stock alerts ($\le 5$ units), and sold-out items.
* **Inline Stock Controls:** Adjust inventory levels with `-` / `+` steppers or direct numeric input with automatic saving.
* **Visibility Toggles & CRUD:** Hide out-of-season scents without deleting them, or create, update, and remove listings with custom image URLs.

---

## Architecture & Project Structure

The project intentionally avoids bundlers, frameworks, and `node_modules`. Every file is served statically:

```text
SarahsFragrance/
├── index.html          # Customer-facing storefront, bag drawer, and checkout modal
├── admin.html          # Protected inventory & listing management dashboard
├── css/
│   └── styles.css      # Design tokens, light/dark themes, and responsive grid layout
├── js/
│   ├── config.js       # Central configuration (store info, WhatsApp, Supabase keys)
│   ├── store.js        # Data abstraction layer (auto-switches between Supabase & localStorage)
│   ├── ui.js           # Shared utilities (SVG icons, en-GH currency formatter, modals, theme)
│   ├── shop.js         # Storefront rendering, filtering, bag state, and WhatsApp link builder
│   └── admin.js        # Auth handling, KPI calculations, inline stock updates, and CRUD
├── supabase/
│   └── schema.sql      # PostgreSQL table definitions, Row-Level Security (RLS), and seed data
└── assets/             # Hero banners and default product photography
