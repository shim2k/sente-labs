-- Update the review_tasks constraint to allow the models we're actually using
ALTER TABLE review_tasks DROP CONSTRAINT IF EXISTS review_tasks_llm_model_check;

ALTER TABLE review_tasks ADD CONSTRAINT review_tasks_llm_model_check 
CHECK (llm_model IN ('gpt-4o', 'gpt-4o-mini', 'gpt-4.1-mini', 'o3'));

-- Also update the reviews table if it has a similar constraint
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_llm_model_check;

-- Note: The reviews table doesn't seem to have this constraint based on the schema,
-- but adding this for safety in case it was added later