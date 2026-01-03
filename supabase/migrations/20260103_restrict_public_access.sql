-- Drop the overly permissive public view policy
DROP POLICY IF EXISTS "Allow public to view transactions" ON transactions;
DROP POLICY IF EXISTS "Allow public to view holders" ON holders;

-- Policies for transactions table
-- 1. Admins can see everything
CREATE POLICY "Admins can view all transactions" 
ON transactions FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- 2. Non-admins and anonymous users can only see non-private transactions
CREATE POLICY "Public can view non-private transactions" 
ON transactions FOR SELECT 
USING (is_private = false);

-- Policies for holders table
-- 1. Admins can see all holders
CREATE POLICY "Admins can view all holders" 
ON holders FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_roles.user_id = auth.uid() 
        AND user_roles.role = 'admin'
    )
);

-- 2. Public can view holders (needed for joins in public transaction views)
-- This stays relatively open as holder names are not sensitive, but we can restrict if needed.
-- For now, keeping it consistent with non-private transaction access.
CREATE POLICY "Public can view holders" 
ON holders FOR SELECT 
USING (true);
