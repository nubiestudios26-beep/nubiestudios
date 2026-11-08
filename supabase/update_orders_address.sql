-- ═══════════════════════════════════════════════════════
-- Add Shipping Address Columns to Orders
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS shipping_name     TEXT,
ADD COLUMN IF NOT EXISTS shipping_address  TEXT,
ADD COLUMN IF NOT EXISTS shipping_city     TEXT,
ADD COLUMN IF NOT EXISTS shipping_postcode TEXT,
ADD COLUMN IF NOT EXISTS shipping_country  TEXT,
ADD COLUMN IF NOT EXISTS shipping_phone    TEXT;

-- Optional: Comments for clarity
COMMENT ON COLUMN orders.shipping_name IS 'Full name for delivery';
COMMENT ON COLUMN orders.shipping_address IS 'Street name and house number';
