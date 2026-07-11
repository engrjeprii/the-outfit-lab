-- Migration: add soft delete support to products

ALTER TABLE products ADD COLUMN deleted_at TEXT;
CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON products(deleted_at);
