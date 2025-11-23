-- Migration: Update payment method constraints to include 'gateway'
-- Created: 2025-01-18
-- Purpose: Add support for 'gateway' payment method (like Pesapal) to database schema

-- Update orders table constraint to include 'gateway'
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check 
    CHECK (payment_method IN ('bank', 'mobile', 'gateway'));

-- Update transactions table constraint to include 'gateway'  
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_payment_method_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_payment_method_check 
    CHECK (payment_method IN ('bank', 'mobile', 'gateway'));

-- Add index for payment gateway transactions
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON transactions(payment_method);

-- Update status values to include additional payment gateway statuses
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_status_check 
    CHECK (status IN ('pending', 'paid', 'completed', 'failed', 'cancelled', 'processing', 'refunded'));