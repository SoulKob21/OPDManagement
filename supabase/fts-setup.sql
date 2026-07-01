-- ====================================================================
-- Setup Full-Text Search (FTS) with automatic updates on patients table
-- Run these commands in the Supabase Dashboard SQL Editor
-- ====================================================================

-- 1. Add generated column search_vector to patients table
-- This column will automatically regenerate its value whenever first_name, last_name, hn, citizen_id, passport_number, or phone_number is updated.
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  to_tsvector('simple', coalesce(hn, '') || ' ' || 
                        coalesce(citizen_id, '') || ' ' || 
                        coalesce(passport_number, '') || ' ' || 
                        coalesce(first_name, '') || ' ' || 
                        coalesce(last_name, '') || ' ' || 
                        coalesce(phone_number, ''))
) STORED;

-- 2. Create GIN index for search_vector for fast text queries
CREATE INDEX IF NOT EXISTS idx_patients_search_vector_gin 
ON public.patients USING gin(search_vector);
