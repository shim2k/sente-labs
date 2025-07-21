-- Create transactions table for tracking payments
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    paddle_order_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    tokens_purchased INTEGER NOT NULL,
    package_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_paddle_order_id ON transactions(paddle_order_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);

-- Add comments for documentation
COMMENT ON TABLE transactions IS 'Track payment transactions from Paddle webhooks';
COMMENT ON COLUMN transactions.user_id IS 'Auth0 user ID';
COMMENT ON COLUMN transactions.paddle_order_id IS 'Unique Paddle order identifier';
COMMENT ON COLUMN transactions.amount IS 'Payment amount in the specified currency';
COMMENT ON COLUMN transactions.currency IS 'Three-letter currency code (e.g., USD, EUR)';
COMMENT ON COLUMN transactions.tokens_purchased IS 'Number of tokens purchased in this transaction';
COMMENT ON COLUMN transactions.package_id IS 'Token package identifier';
COMMENT ON COLUMN transactions.email IS 'Customer email address';
COMMENT ON COLUMN transactions.status IS 'Transaction status: pending, completed, failed, refunded';