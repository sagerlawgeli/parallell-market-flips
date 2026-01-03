-- Allow public access to view transactions for public pages
CREATE POLICY "Allow public to view transactions" 
ON transactions FOR SELECT 
TO anon 
USING (true);

-- Allow public access to view holders names (for joining in public views)
CREATE POLICY "Allow public to view holders" 
ON holders FOR SELECT 
TO anon 
USING (true);
