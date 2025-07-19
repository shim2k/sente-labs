-- Add review_type column to review_tasks and reviews tables to properly track review type
-- This fixes the issue where both regular and elite reviews use 'o3' model

-- Add review_type to review_tasks table
ALTER TABLE review_tasks 
ADD COLUMN review_type TEXT DEFAULT 'regular' CHECK (review_type IN ('regular', 'elite'));

-- Add review_type to reviews table
ALTER TABLE reviews 
ADD COLUMN review_type TEXT DEFAULT 'regular' CHECK (review_type IN ('regular', 'elite'));

-- Update existing records to infer type from llm_model
-- For now, set all o3 reviews to 'elite' to maintain current behavior
UPDATE review_tasks SET review_type = 'elite' WHERE llm_model = 'o3';
UPDATE review_tasks SET review_type = 'regular' WHERE llm_model = 'gpt-4o';

UPDATE reviews SET review_type = 'elite' WHERE llm_model = 'o3';
UPDATE reviews SET review_type = 'regular' WHERE llm_model = 'gpt-4o';