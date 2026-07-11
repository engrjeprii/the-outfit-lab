-- Migration: initial schema for the-outfit-lab
-- Tables: categories, products, variants, orders

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  size_schema TEXT NOT NULL -- JSON array, e.g. ["us","eu"]
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  images TEXT NOT NULL DEFAULT '[]', -- JSON array of R2 public URLs
  details TEXT NOT NULL DEFAULT '{}', -- JSON object {material, fit, care, ...}
  size_chart TEXT NOT NULL DEFAULT '[]', -- JSON array of size rows
  created_at TEXT NOT NULL,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);

CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  size_key TEXT NOT NULL, -- normalized key: "us:8|eu:41"
  colorway TEXT NOT NULL,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  sold_out INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY, -- short code, e.g. OTL-7X4K9
  status TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | cancelled
  items TEXT NOT NULL, -- JSON array
  total INTEGER NOT NULL,
  source TEXT NOT NULL DEFAULT 'messenger',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
