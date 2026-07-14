-- Migration: add optional retail_price to products

ALTER TABLE products ADD COLUMN retail_price INTEGER DEFAULT 0;
