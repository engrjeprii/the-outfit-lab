-- Migration: add optional product videos

ALTER TABLE products ADD COLUMN videos TEXT NOT NULL DEFAULT '[]';
