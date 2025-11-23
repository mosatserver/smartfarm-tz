const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.DB_PASSWORD) {
  console.warn('⚠️  DB_PASSWORD is not set in production environment. Database connection will fail.');
}

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  // In development we allow a default password for local testing; in production we require DB_PASSWORD
  password: isProd ? process.env.DB_PASSWORD : (process.env.DB_PASSWORD || 'allahuma'),
  database: process.env.DB_NAME || 'smartfarm_tz',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: false,
  charset: 'utf8mb4'
};

// Create connection pool
const pool = mysql.createPool(dbConfig);

// Test connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
};

// Initialize database and tables
const initDatabase = async () => {
  try {
    // Create database if it doesn't exist
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'allahuma',
      port: process.env.DB_PORT || 3306,
    });

    await connection.execute(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'smartfarm_tz'} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.end();

    // Create users table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT,
        first_name VARCHAR(50) NOT NULL,
        last_name VARCHAR(50) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        user_type ENUM('farmer', 'buyer', 'transporter', 'farm inputs seller', 'expert') NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        email_verified BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL,
        INDEX idx_email (email),
        INDEX idx_user_type (user_type),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create marketplace_posts table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS marketplace_posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        post_type ENUM('crop', 'input', 'announcement') NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10, 2) NULL,
        quantity INT DEFAULT NULL,
        unit VARCHAR(20) DEFAULT 'kg',
        location_address VARCHAR(255),
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        image_url VARCHAR(500) NULL,
        status ENUM('active', 'sold', 'inactive') DEFAULT 'active',
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_post_type (post_type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_location (location_lat, location_lng)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create post_likes table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS post_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        post_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (post_id) REFERENCES marketplace_posts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_post (user_id, post_id),
        INDEX idx_user_id (user_id),
        INDEX idx_post_id (post_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create orders table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS orders (
        id INT PRIMARY KEY AUTO_INCREMENT,
        order_id VARCHAR(50) UNIQUE NOT NULL,
        buyer_id INT NOT NULL,
        seller_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('bank', 'mobile') NOT NULL,
        payment_provider VARCHAR(20) NOT NULL,
        status ENUM('pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES marketplace_posts(id) ON DELETE CASCADE,
        INDEX idx_buyer_id (buyer_id),
        INDEX idx_seller_id (seller_id),
        INDEX idx_product_id (product_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create transactions table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INT PRIMARY KEY AUTO_INCREMENT,
        transaction_id VARCHAR(50) UNIQUE NOT NULL,
        order_id VARCHAR(50) NOT NULL,
        buyer_id INT NOT NULL,
        seller_id INT NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        payment_method ENUM('bank', 'mobile') NOT NULL,
        payment_provider VARCHAR(20) NOT NULL,
        status ENUM('pending', 'paid', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
        payment_reference VARCHAR(100),
        payment_details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_order_id (order_id),
        INDEX idx_buyer_id (buyer_id),
        INDEX idx_seller_id (seller_id),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create analysis_history table for crop health diagnoses
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS analysis_history (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        crop_type VARCHAR(50),
        is_healthy BOOLEAN NOT NULL DEFAULT FALSE,
        disease_name VARCHAR(200),
        disease_type ENUM('disease', 'deficiency', 'pest') DEFAULT 'disease',
        treatment TEXT,
        nutrients TEXT,
        confidence DECIMAL(4,3) NOT NULL DEFAULT 0.000,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_crop_type (crop_type),
        INDEX idx_is_healthy (is_healthy),
        INDEX idx_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create transport_posts table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transport_posts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        vehicle_type ENUM('truck', 'van', 'pickup', 'motorcycle', 'bicycle', 'other') NOT NULL,
        title VARCHAR(200) NOT NULL,
        description TEXT,
        capacity VARCHAR(50), -- e.g., '5 tons', '20 bags', '500 kg'
        price_per_km DECIMAL(10, 2),
        price_per_trip DECIMAL(10, 2),
        coverage_area VARCHAR(255), -- e.g., 'Dar es Salaam - Mwanza'
        location_address VARCHAR(255),
        location_lat DECIMAL(10, 8),
        location_lng DECIMAL(11, 8),
        image_url VARCHAR(500) NULL,
        contact_phone VARCHAR(20),
        available_days VARCHAR(100), -- e.g., 'Monday-Friday', 'Weekends only'
        status ENUM('active', 'busy', 'inactive') DEFAULT 'active',
        likes_count INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user_id (user_id),
        INDEX idx_vehicle_type (vehicle_type),
        INDEX idx_status (status),
        INDEX idx_created_at (created_at),
        INDEX idx_location (location_lat, location_lng)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create transport_likes table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS transport_likes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        transport_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (transport_id) REFERENCES transport_posts(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_transport (user_id, transport_id),
        INDEX idx_user_id (user_id),
        INDEX idx_transport_id (transport_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log('✅ Uploads directory created');
    }

    // Create chat-related tables
    
    // Create friends table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS friends (
        id INT PRIMARY KEY AUTO_INCREMENT,
        requester_id INT NOT NULL,
        addressee_id INT NOT NULL,
        status ENUM('pending', 'accepted', 'declined', 'blocked') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_friendship (requester_id, addressee_id),
        INDEX idx_requester_id (requester_id),
        INDEX idx_addressee_id (addressee_id),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create groups table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS chat_groups (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        creator_id INT NOT NULL,
        avatar_url VARCHAR(500),
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_creator_id (creator_id),
        INDEX idx_is_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create group members table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS group_members (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        user_id INT NOT NULL,
        role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_group_member (group_id, user_id),
        INDEX idx_group_id (group_id),
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create messages table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS messages (
        id INT PRIMARY KEY AUTO_INCREMENT,
        sender_id INT NOT NULL,
        receiver_id INT NULL,
        group_id INT NULL,
        message_type ENUM('text', 'image', 'file', 'voice') DEFAULT 'text',
        content TEXT NOT NULL,
        file_url VARCHAR(500) NULL,
        file_name VARCHAR(255) NULL,
        file_size INT NULL,
        mime_type VARCHAR(100) NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
        INDEX idx_sender_id (sender_id),
        INDEX idx_receiver_id (receiver_id),
        INDEX idx_group_id (group_id),
        INDEX idx_created_at (created_at),
        INDEX idx_is_read (is_read),
        CONSTRAINT chk_receiver_or_group CHECK ((receiver_id IS NOT NULL AND group_id IS NULL) OR (receiver_id IS NULL AND group_id IS NOT NULL))
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create message attachments table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS message_attachments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        message_id INT NOT NULL,
        file_url VARCHAR(500) NOT NULL,
        file_name VARCHAR(255) NOT NULL,
        file_size INT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
        INDEX idx_message_id (message_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Create user online status table
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS user_online_status (
        id INT PRIMARY KEY AUTO_INCREMENT,
        user_id INT NOT NULL,
        is_online BOOLEAN DEFAULT FALSE,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        socket_id VARCHAR(100) NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_status (user_id),
        INDEX idx_user_id (user_id),
        INDEX idx_is_online (is_online)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Read and execute Academy tables migration
    const academyMigrationPath = path.join(__dirname, '..', 'database', 'academy_migration.sql');
    if (fs.existsSync(academyMigrationPath)) {
      const academyMigration = fs.readFileSync(academyMigrationPath, 'utf8');
      const statements = academyMigration
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--')); // Filter out comments and empty statements
      
      for (const statement of statements) {
        if (statement.trim() && !statement.startsWith('--')) {
          await pool.execute(statement.trim());
        }
      }
      console.log('✅ Academy tables initialized successfully');
    }

    // Read and execute Courses tables migration
    const coursesMigrationPath = path.join(__dirname, '..', 'database', 'courses_migration.sql');
    if (fs.existsSync(coursesMigrationPath)) {
      const coursesMigration = fs.readFileSync(coursesMigrationPath, 'utf8');
      const statements = coursesMigration
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim() && !statement.startsWith('--')) {
          await pool.execute(statement.trim());
        }
      }
      console.log('✅ Courses tables initialized successfully');
    }

    // Read and execute Sessions tables migration
    const sessionsMigrationPath = path.join(__dirname, '..', 'database', 'sessions_migration.sql');
    if (fs.existsSync(sessionsMigrationPath)) {
      const sessionsMigration = fs.readFileSync(sessionsMigrationPath, 'utf8');
      const statements = sessionsMigration
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim() && !statement.startsWith('--')) {
          await pool.execute(statement.trim());
        }
      }
      console.log('✅ Sessions tables initialized successfully');
    }

    // Read and execute Live Sessions tables migration
    const liveSessionsMigrationPath = path.join(__dirname, '..', 'database', 'live_sessions_migration.sql');
    if (fs.existsSync(liveSessionsMigrationPath)) {
      const liveSessionsMigration = fs.readFileSync(liveSessionsMigrationPath, 'utf8');
      const statements = liveSessionsMigration
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt && !stmt.startsWith('--'));
      
      for (const statement of statements) {
        if (statement.trim() && !statement.startsWith('--')) {
          await pool.execute(statement.trim());
        }
      }
      console.log('✅ Live Sessions tables initialized successfully');
    }

    console.log('✅ Database and tables initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
};

module.exports = {
  pool,
  testConnection,
  initDatabase
};
