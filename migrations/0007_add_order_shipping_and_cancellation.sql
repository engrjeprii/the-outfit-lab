-- Migration: add order shipping tracking and cancellation audit columns

ALTER TABLE orders ADD COLUMN shipping_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN tracking_number TEXT;
ALTER TABLE orders ADD COLUMN cancelled_at TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_shipping_status ON orders(shipping_status);
