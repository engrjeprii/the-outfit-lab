-- Migration: add coming-soon flag to products

ALTER TABLE products ADD COLUMN is_upcoming INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_products_upcoming ON products(is_upcoming);
