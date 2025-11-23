const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { geocodeLocation } = require('../helpers/locationHelper');
const paymentService = require('../services/paymentService');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Check file type
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Upload a crop or input
router.post('/upload', authenticateToken, upload.single('image'), async (req, res) => {
  const { title, price, quantity, unit, lat, lng } = req.body;
  const userId = req.userId;

  console.log('📤 Upload request received:');
  console.log('  - Title:', title);
  console.log('  - Price:', price);
  console.log('  - Quantity:', quantity);
  console.log('  - Unit:', unit);
  console.log('  - GPS Coordinates:', { lat, lng });
  console.log('  - User ID:', userId);
  console.log('  - User Role:', req.userRole);

  try {
    const postType = req.userRole === 'farmer' ? 'crop' : 'input';

    // Validate required fields
    if (!title || !price || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Title, price, and quantity are required'
      });
    }

    // Validate unit
    const validUnits = ['kg', 'buckets'];
    const selectedUnit = unit && validUnits.includes(unit) ? unit : 'kg';

    // Get user's location
    const { address, lat: finalLat, lng: finalLng } = await geocodeLocation(req);
    
    console.log('📍 Final location data:');
    console.log('  - Address:', address);
    console.log('  - Coordinates:', { lat: finalLat, lng: finalLng });

    // Generate proper image URL
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // Save the post
    const [result] = await pool.execute(
      'INSERT INTO marketplace_posts (user_id, post_type, title, image_url, price, quantity, unit, location_address, location_lat, location_lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, postType, title, imageUrl, price, quantity, selectedUnit, address, finalLat, finalLng]
    );
    
    console.log('✅ Post saved to database with location:', { address, lat: finalLat, lng: finalLng });

    res.status(201).json({
      success: true,
      message: 'Post created successfully',
      postId: result.insertId,
      imageUrl: imageUrl
    });
  } catch (err) {
    console.error('❌ Error uploading post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Delete a post
router.delete('/:postId', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  console.log('🗑️ Delete request received for post ID:', postId);

  try {
    // First, get the post to check if it exists and get image info
    const [posts] = await pool.execute(
      'SELECT * FROM marketplace_posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found or not authorized to delete'
      });
    }

    const post = posts[0];

    // Delete the post from database
    const [result] = await pool.execute(
      'DELETE FROM marketplace_posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    // If post had an image, delete the image file
    if (post.image_url) {
      const imagePath = path.join(__dirname, '..', post.image_url);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
          console.log('✅ Image file deleted:', post.image_url);
        } catch (fileError) {
          console.warn('⚠️ Could not delete image file:', fileError.message);
        }
      }
    }

    res.status(200).json({
      success: true,
      message: 'Post deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Post an announcement
router.post('/announce', authenticateToken, async (req, res) => {
  const { title } = req.body;
  const userId = req.userId;

  try {
    const [result] = await pool.execute(
      'INSERT INTO marketplace_posts (user_id, post_type, title) VALUES (?, ?, ?)',
      [userId, 'announcement', title]
    );

    res.status(201).json({
      success: true,
      message: 'Announcement posted successfully',
      postId: result.insertId
    });
  } catch (err) {
    console.error('❌ Error posting announcement:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get all marketplace posts with like status for the current user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.userId;
  
  try {
    // Get posts with like information for the current user
    const [posts] = await pool.execute(`
      SELECT 
        p.*,
        CASE WHEN pl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked
      FROM marketplace_posts p
      LEFT JOIN post_likes pl ON p.id = pl.post_id AND pl.user_id = ?
      ORDER BY p.created_at DESC
    `, [userId]);

    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error('❌ Error fetching posts:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Like a post
router.post('/:postId/like', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  try {
    // Check if the user already liked the post
    const [likes] = await pool.execute(
      'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (likes.length > 0) {
      return res.status(400).json({ success: false, message: 'Post already liked.' });
    }

    // Insert like into post_likes table
    await pool.execute(
      'INSERT INTO post_likes (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );

    // Increment likes_count in marketplace_posts
    await pool.execute(
      'UPDATE marketplace_posts SET likes_count = likes_count + 1 WHERE id = ?',
      [postId]
    );

    res.status(200).json({ success: true, message: 'Post liked.' });
  } catch (err) {
    console.error('❌ Error liking post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Unlike a post
router.post('/:postId/unlike', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  try {
    // Check if the user already liked the post
    const [likes] = await pool.execute(
      'SELECT * FROM post_likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    if (likes.length === 0) {
      return res.status(400).json({ success: false, message: 'Post not liked yet.' });
    }

    // Delete like from post_likes table
    await pool.execute(
      'DELETE FROM post_likes WHERE user_id = ? AND post_id = ?',
      [userId, postId]
    );

    // Decrement likes_count in marketplace_posts
    await pool.execute(
      'UPDATE marketplace_posts SET likes_count = likes_count - 1 WHERE id = ?',
      [postId]
    );

    res.status(200).json({ success: true, message: 'Post unliked.' });
  } catch (err) {
    console.error('❌ Error unliking post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get contact details for a post
router.get('/:postId/contact', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  try {
    // Fetch the user's contact details who posted the product
    const [rows] = await pool.execute(
      'SELECT u.email, u.mobile_number FROM users u JOIN marketplace_posts m ON u.id = m.user_id WHERE m.id = ?',
      [postId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found.' });
    }
    res.status(200).json({ success: true, contact: rows[0] });
  } catch (err) {
    console.error('❌ Error fetching contact details:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get payment providers
router.get('/payment-providers', authenticateToken, async (req, res) => {
  try {
    console.log('📋 Fetching payment providers...');
    const providers = await paymentService.getPaymentProviders();
    
    res.status(200).json({
      success: true,
      data: providers,
      message: 'Payment providers retrieved successfully'
    });
  } catch (error) {
    console.error('❌ Error fetching payment providers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment providers',
      error: error.message
    });
  }
});

// Process purchase
router.post('/purchase', authenticateToken, async (req, res) => {
  const { productId, quantity, paymentMethod, paymentProvider, totalAmount } = req.body;
  const userId = req.userId;
  
  console.log('💳 Purchase request received:', {
    productId,
    quantity,
    paymentMethod,
    paymentProvider,
    totalAmount,
    userId
  });
  
  try {
    // Validate required fields
    if (!productId || !quantity || !paymentProvider || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: productId, quantity, paymentProvider, totalAmount'
      });
    }
    
    // Verify the product exists
    const [products] = await pool.execute(
      'SELECT * FROM marketplace_posts WHERE id = ?',
      [productId]
    );
    
    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const product = products[0];
    
    // Check if enough quantity is available
    if (product.quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Insufficient quantity available'
      });
    }
    
    // Process the payment
    const paymentResult = await paymentService.processPayment({
      amount: totalAmount,
      currency: 'TZS',
      provider: paymentProvider,
      method: paymentMethod,
      description: `Purchase of ${product.title} (${quantity} ${product.unit || 'units'})`,
      customerEmail: req.userEmail,
      customerPhone: req.userPhone
    });
    
    // Create purchase record (you might want to create a purchases table)
    // For now, we'll just respond with success
    
    res.status(200).json({
      success: true,
      message: 'Purchase processed successfully',
      paymentResult,
      orderId: `ORD-${Date.now()}-${productId}`
    });
    
  } catch (error) {
    console.error('❌ Error processing purchase:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process purchase',
      error: error.message
    });
  }
});

module.exports = router;

