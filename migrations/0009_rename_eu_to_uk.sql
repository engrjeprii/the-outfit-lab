-- Migration: rename legacy 'eu' size dimension to 'uk' for shoe products

UPDATE products
SET size_chart = REPLACE(size_chart, '"eu"', '"uk"')
WHERE category_id = 'cat-shoes' AND size_chart LIKE '%"eu"%';

UPDATE variants
SET size_key = REPLACE(size_key, 'eu:', 'uk:')
WHERE product_id IN (SELECT id FROM products WHERE category_id = 'cat-shoes')
  AND size_key LIKE '%eu:%';
