-- Migration: add release date for upcoming products

ALTER TABLE products ADD COLUMN available_at TEXT;

CREATE INDEX IF NOT EXISTS idx_products_available_at ON products(available_at);
