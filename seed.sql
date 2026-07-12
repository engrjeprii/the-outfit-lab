-- Seed initial categories for the-outfit-lab

INSERT INTO categories (id, name, slug, size_schema) VALUES
  ('cat-shirts', 'Shirts', 'shirts', '["alpha"]'),
  ('cat-shorts', 'Shorts', 'shorts', '["waist","length"]'),
  ('cat-pants', 'Pants', 'pants', '["waist","length"]'),
  ('cat-shoes', 'Shoes', 'shoes', '["us","uk"]'),
  ('cat-caps', 'Caps', 'caps', '["one_size"]')
ON CONFLICT(id) DO NOTHING;
