-- Migration: replace legacy 'Default' colorway placeholder with 'Black'

UPDATE variants SET colorway = 'Black' WHERE colorway = 'Default';
