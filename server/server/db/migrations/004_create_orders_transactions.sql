-- Migration: Create orders and transactions tables for purchase functionality
-- Created: 2025-01-02
-- Database: MySQL

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(50) UNIQUE NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    product_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('bank', 'mobile') NOT NULL,
    payment_provider VARCHAR(50) NOT NULL,
    status ENUM('pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled') DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_buyer_id (buyer_id),
    INDEX idx_orders_seller_id (seller_id),
    INDEX idx_orders_product_id (product_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at),
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(50) UNIQUE NOT NULL,
    order_id VARCHAR(50) NOT NULL,
    buyer_id INT NOT NULL,
    seller_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('bank', 'mobile') NOT NULL,
    payment_provider VARCHAR(50) NOT NULL,
    status ENUM('pending', 'paid', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    payment_reference VARCHAR(100),
    payment_details JSON, -- JSON field for storing payment-specific details
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transactions_order_id (order_id),
    INDEX idx_transactions_buyer_id (buyer_id),
    INDEX idx_transactions_seller_id (seller_id),
    INDEX idx_transactions_status (status),
    INDEX idx_transactions_created_at (created_at),
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
    FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
);
