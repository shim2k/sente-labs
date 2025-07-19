-- Remove the model constraint from review_tasks table to allow any model
ALTER TABLE review_tasks DROP CONSTRAINT IF EXISTS review_tasks_llm_model_check;

-- Also remove any similar constraints from reviews table if they exist
ALTER TABLE reviews DROP CONSTRAINT IF EXISTS reviews_llm_model_check;

-- This allows the application layer (models.ts) to control which models are valid
-- rather than having it hardcoded in the database