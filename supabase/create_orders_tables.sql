-- ═══════════════════════════════════════════════════════
-- NUBIE Orders Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════

-- 1. Orders table
CREATE TABLE IF NOT EXISTS orders (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_number  TEXT NOT NULL UNIQUE,
    user_email    TEXT NOT NULL,
    total_amount  NUMERIC(10, 2) NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'pending',       -- paid, pending, failed, refunded
    payment_method TEXT,                                  -- card, promptpay, truemoney
    charge_id     TEXT,                                   -- Omise charge ID (chrg_xxx)
    created_at    TIMESTAMPTZ DEFAULT now(),
    updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id       UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_title  TEXT NOT NULL,
    size           TEXT,
    price          NUMERIC(10, 2) NOT NULL DEFAULT 0,
    quantity       INTEGER NOT NULL DEFAULT 1,
    image_url      TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_orders_user_email ON orders(user_email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
--    Allow the Edge Function (service role) to insert/read everything.
--    Allow authenticated users to read only their own orders.

-- Policy: Service role can do everything (Edge Function uses service role key)
CREATE POLICY "Service role full access on orders"
    ON orders FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on order_items"
    ON order_items FOR ALL
    USING (true)
    WITH CHECK (true);

-- Policy: Users can read their own orders
CREATE POLICY "Users can view own orders"
    ON orders FOR SELECT
    USING (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Users can view own order items"
    ON order_items FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM orders WHERE user_email = auth.jwt() ->> 'email'
        )
    );
