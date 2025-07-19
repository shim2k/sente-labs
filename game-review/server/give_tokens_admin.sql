-- Give 100 tokens to admin user
UPDATE users 
SET tokens = tokens + 100 
WHERE auth0_sub = 'google-oauth2|108244090406347982325';