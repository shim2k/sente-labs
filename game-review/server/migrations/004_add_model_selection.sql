-- Migration: Add model selection to review tasks
-- Date: 2025-06-29
-- Description: Add llm_model column to track which AI model to use for review generation

-- Add llm_model column to review_tasks table
ALTER TABLE review_tasks ADD COLUMN llm_model TEXT NOT NULL DEFAULT 'gpt-4o';

-- Add constraint to only allow supported models
ALTER TABLE review_tasks ADD CONSTRAINT review_tasks_llm_model_check 
    CHECK (llm_model IN ('gpt-4o', 'o3'));

-- Update existing review_tasks to use gpt-4o as default
UPDATE review_tasks SET llm_model = 'gpt-4o' WHERE llm_model IS NULL;

-- Create index for efficient model queries
CREATE INDEX idx_review_tasks_llm_model ON review_tasks(llm_model);