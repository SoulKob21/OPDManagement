-- ====================================================================
-- Database Security Guidance: Row Level Security (RLS) Example
-- ====================================================================
-- IMPORTANT SECURITY WARNING:
-- Frontend route protection (like ProtectedRoute in React) does NOT
-- secure your database records! Anyone can send API requests bypassing 
-- the React frontend. Your database security MUST rely on Row Level 
-- Security (RLS) policies configured directly on Supabase.
-- ====================================================================

-- 1. Create the example table
CREATE TABLE IF NOT EXISTS public.records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Enable Row Level Security (RLS)
-- CRITICAL STEP: RLS must be explicitly enabled on every table!
ALTER TABLE public.records ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- Row Level Security Policies
-- ====================================================================

-- Policy A: Allow users to SELECT only their own records
CREATE POLICY "Allow users to view their own records" 
ON public.records
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy B: Allow users to INSERT records only under their own user_id
CREATE POLICY "Allow users to insert their own records" 
ON public.records
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy C: Allow users to UPDATE only their own records
CREATE POLICY "Allow users to update their own records" 
ON public.records
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy D: Allow users to DELETE only their own records
CREATE POLICY "Allow users to delete their own records" 
ON public.records
FOR DELETE 
TO authenticated
USING (auth.uid() = user_id);
