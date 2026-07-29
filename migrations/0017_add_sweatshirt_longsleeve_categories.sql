-- Migration: add sweatshirt and long sleeves categories

INSERT INTO categories (id, name, slug, size_schema) VALUES
  ('cat-sweatshirts', 'Sweatshirts', 'sweatshirts', '["alpha"]'),
  ('cat-longsleeves', 'Long Sleeves', 'long-sleeves', '["alpha"]');
