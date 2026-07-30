-- Migration: add polo shirts and long sleeves categories

INSERT INTO categories (id, name, slug, size_schema) VALUES
  ('cat-poloshirts', 'Polo Shirts', 'polo-shirts', '["alpha"]'),
  ('cat-longsleeves', 'Long Sleeves', 'long-sleeves', '["alpha"]');
