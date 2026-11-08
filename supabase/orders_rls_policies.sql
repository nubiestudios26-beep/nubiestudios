-- 1. Enable RLS on the orders table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to avoid conflicts (optional but safer)
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Admins can view all orders" ON orders;
DROP POLICY IF EXISTS "Admins can update all orders" ON orders;

-- 3. Policy: Users can see their own records based on their email
CREATE POLICY "Users can view their own orders" 
ON orders FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'email' = user_email);

-- 4. Policy: nattawut2015@gmail.com can see EVERYTHING in the archive
CREATE POLICY "Admins can view all orders" 
ON orders FOR SELECT 
TO authenticated
USING (auth.jwt() ->> 'email' = 'nattawut2015@gmail.com');

-- 5. Policy: nattawut2015@gmail.com can update status and tracking
CREATE POLICY "Admins can update all orders" 
ON orders FOR UPDATE 
TO authenticated
USING (auth.jwt() ->> 'email' = 'nattawut2015@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'nattawut2015@gmail.com');
