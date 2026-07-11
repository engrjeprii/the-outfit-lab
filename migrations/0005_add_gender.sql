-- Migration: add gender to products

ALTER TABLE products ADD COLUMN gender TEXT NOT NULL DEFAULT 'unisex';
CREATE INDEX IF NOT EXISTS idx_products_gender ON products(gender);
