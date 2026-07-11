-- Migration: add brand support to products

ALTER TABLE products ADD COLUMN brand TEXT;
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);
