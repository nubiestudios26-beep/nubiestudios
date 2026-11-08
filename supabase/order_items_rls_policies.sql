-- 1. Enable RLS on the order_items table
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;

-- 3. Policy: Users can view items belonging to their own orders
-- This assumes order_items is joined to orders, but standard RLS works on the table itself.
-- A better way if you have user_email in order_items too, or use a subquery/join.
-- For now, let's allow users to see items if they can see the parent order.
CREATE POLICY "Users can view their own order items"
ON order_items FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM orders
        WHERE orders.id = order_items.order_id
        AND auth.jwt() ->> 'email' = orders.user_email
    )
);

-- 4. Policy: Admin (nattawut2015@gmail.com) can see ALL order items
CREATE POLICY "Admins can view all order items"
ON order_items FOR SELECT
TO authenticated
USING (auth.jwt() ->> 'email' = 'nattawut2015@gmail.com');

-- 5. Policy: Admin can also update/delete if needed (optional but good for management)
CREATE POLICY "Admins can manage all order items"
ON order_items FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'nattawut2015@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'nattawut2015@gmail.com');
