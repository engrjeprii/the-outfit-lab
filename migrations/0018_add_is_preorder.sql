ALTER TABLE products ADD COLUMN is_preorder INTEGER NOT NULL DEFAULT 0 CHECK (is_preorder IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_products_preorder ON products(is_preorder);
