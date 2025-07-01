-- Update the review_tasks table to use gpt-4o and gpt-4o-mini instead of gpt-4o and o3

BEGIN;

-- Drop the existing constraint
ALTER TABLE review_tasks DROP CONSTRAINT review_tasks_llm_model_check;

-- Add the new constraint with updated models
ALTER TABLE review_tasks ADD CONSTRAINT review_tasks_llm_model_check 
  CHECK (llm_model IN ('gpt-4o', 'gpt-4o-mini'));

COMMIT;