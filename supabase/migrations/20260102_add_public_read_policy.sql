-- Allow public access to view transactions for public pages
CREATE POLICY "Allow public to view transactions" 
ON transactions FOR SELECT 
TO anon 
USING (true);
