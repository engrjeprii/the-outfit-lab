-- Add gender column to variants for multi-gender shoe sizing.
ALTER TABLE variants ADD COLUMN gender TEXT DEFAULT 'unisex';
