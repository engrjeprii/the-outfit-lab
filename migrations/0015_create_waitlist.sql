-- Migration: create waitlist table for upcoming product notifications

CREATE TABLE IF NOT EXISTS waitlist (
  id TEXT PRIMARY KEY,
  product_id TEXT,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  notified_at TEXT,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_waitlist_product ON waitlist(product_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_email ON waitlist(email);
CREATE INDEX IF NOT EXISTS idx_waitlist_notified ON waitlist(notified_at);
