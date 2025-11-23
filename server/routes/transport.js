const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');
const { geocodeLocation } = require('../helpers/locationHelper');

const router = express.Router();

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '..', 'uploads', 'transport');
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

// Middleware to check if user is transporter
const checkTransporterRole = (req, res, next) => {
  console.log('🔒 Checking user type for transport upload:', req.userType);
  
  if (req.userType !== 'transporter') {
    console.log('❌ Access denied: User is not a transporter');
    return res.status(403).json({
      success: false,
      message: 'Only transporters can create transport posts'
    });
  }
  
  console.log('✅ User type verified: transporter can upload');
  next();
};

// POST /api/transport/upload - Add a transport offering
router.post('/upload', authenticateToken, checkTransporterRole, upload.single('image'), async (req, res) => {
  console.log('🚛 Transport upload endpoint hit!');
  console.log('📋 Request details:', {
    method: req.method,
    url: req.url,
    contentType: req.get('content-type'),
    hasFile: !!req.file,
    bodyKeys: Object.keys(req.body),
    userId: req.userId,
    userType: req.userType
  });
  
  const { 
    title, 
    description,
    vehicleType,
    capacity,
    pricePerKm,
    pricePerTrip,
    coverageArea,
    contactPhone,
    availableDays,
    lat, 
    lng 
  } = req.body;
  const userId = req.userId;

  console.log('🚛 Transport upload request received:');
  console.log('  - Title:', title);
  console.log('  - Vehicle Type:', vehicleType);
  console.log('  - Capacity:', capacity);
  console.log('  - Price per KM:', pricePerKm);
  console.log('  - Price per Trip:', pricePerTrip);
  console.log('  - Coverage Area:', coverageArea);
  console.log('  - GPS Coordinates:', { lat, lng });
  console.log('  - User ID:', userId);
  console.log('  - User Role:', req.userType);

  try {
    // Validate required fields
    if (!title || !vehicleType) {
      return res.status(400).json({
        success: false,
        message: 'Title and vehicle type are required'
      });
    }

    // Validate vehicle type
    const validVehicleTypes = ['truck', 'van', 'pickup', 'motorcycle', 'bicycle', 'other'];
    if (!validVehicleTypes.includes(vehicleType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid vehicle type'
      });
    }

    // Get user's location
    const { address, lat: finalLat, lng: finalLng } = await geocodeLocation(req);
    
    console.log('📍 Final location data:');
    console.log('  - Address:', address);
    console.log('  - Coordinates:', { lat: finalLat, lng: finalLng });

    // Generate proper image URL
    const imageUrl = req.file ? `/uploads/transport/${req.file.filename}` : null;

    // Save the transport post
    const [result] = await pool.execute(
      `INSERT INTO transport_posts 
       (user_id, vehicle_type, title, description, capacity, price_per_km, price_per_trip, coverage_area, location_address, location_lat, location_lng, image_url, contact_phone, available_days) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId, 
        vehicleType, 
        title, 
        description || null,
        capacity || null,
        pricePerKm ? parseFloat(pricePerKm) : null,
        pricePerTrip ? parseFloat(pricePerTrip) : null,
        coverageArea || null,
        address, 
        finalLat, 
        finalLng, 
        imageUrl,
        contactPhone || null,
        availableDays || null
      ]
    );
    
    console.log('✅ Transport post saved to database with location:', { address, lat: finalLat, lng: finalLng });

    res.status(201).json({
      success: true,
      message: 'Transport post created successfully',
      postId: result.insertId,
      imageUrl: imageUrl
    });
  } catch (err) {
    console.error('❌ Error uploading transport post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/transport - Get all transport posts with like status for the current user
router.get('/', authenticateToken, async (req, res) => {
  const userId = req.userId;
  
  try {
    // Get transport posts with like information for the current user
    const [posts] = await pool.execute(`
      SELECT 
        t.*,
        CASE WHEN tl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        u.email as owner_email,
        u.mobile_number as owner_mobile
      FROM transport_posts t
      LEFT JOIN transport_likes tl ON t.id = tl.transport_id AND tl.user_id = ?
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.status = 'active'
      ORDER BY t.created_at DESC
    `, [userId]);

    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error('❌ Error fetching transport posts:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/transport/my-posts - Get current user's transport posts
router.get('/my-posts', authenticateToken, checkTransporterRole, async (req, res) => {
  const userId = req.userId;
  
  try {
    const [posts] = await pool.execute(`
      SELECT t.*, 
             CASE WHEN tl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked
      FROM transport_posts t
      LEFT JOIN transport_likes tl ON t.id = tl.transport_id AND tl.user_id = ?
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC
    `, [userId, userId]);

    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error('❌ Error fetching user transport posts:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// DELETE /api/transport/:postId - Delete a transport post
router.delete('/:postId', authenticateToken, checkTransporterRole, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  console.log('🗑️ Delete transport post request received for post ID:', postId);

  try {
    // First, get the post to check if it exists and get image info
    const [posts] = await pool.execute(
      'SELECT * FROM transport_posts WHERE id = ? AND user_id = ?',
      [postId, userId]
    );

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transport post not found or not authorized to delete'
      });
    }

    const post = posts[0];

    // Delete the post from database
    const [result] = await pool.execute(
      'DELETE FROM transport_posts WHERE id = ? AND user_id = ?',
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
      message: 'Transport post deleted successfully'
    });
  } catch (err) {
    console.error('❌ Error deleting transport post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/transport/:postId/like - Like a transport post
router.post('/:postId/like', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  try {
    // Check if the user already liked the post
    const [likes] = await pool.execute(
      'SELECT * FROM transport_likes WHERE user_id = ? AND transport_id = ?',
      [userId, postId]
    );

    if (likes.length > 0) {
      return res.status(400).json({ success: false, message: 'Transport post already liked.' });
    }

    // Insert like into transport_likes table
    await pool.execute(
      'INSERT INTO transport_likes (user_id, transport_id) VALUES (?, ?)',
      [userId, postId]
    );

    // Increment likes_count in transport_posts
    await pool.execute(
      'UPDATE transport_posts SET likes_count = likes_count + 1 WHERE id = ?',
      [postId]
    );

    res.status(200).json({ success: true, message: 'Transport post liked.' });
  } catch (err) {
    console.error('❌ Error liking transport post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// POST /api/transport/:postId/unlike - Unlike a transport post
router.post('/:postId/unlike', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  const userId = req.userId;

  try {
    // Check if the user already liked the post
    const [likes] = await pool.execute(
      'SELECT * FROM transport_likes WHERE user_id = ? AND transport_id = ?',
      [userId, postId]
    );

    if (likes.length === 0) {
      return res.status(400).json({ success: false, message: 'Transport post not liked yet.' });
    }

    // Delete like from transport_likes table
    await pool.execute(
      'DELETE FROM transport_likes WHERE user_id = ? AND transport_id = ?',
      [userId, postId]
    );

    // Decrement likes_count in transport_posts
    await pool.execute(
      'UPDATE transport_posts SET likes_count = likes_count - 1 WHERE id = ?',
      [postId]
    );

    res.status(200).json({ success: true, message: 'Transport post unliked.' });
  } catch (err) {
    console.error('❌ Error unliking transport post:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/transport/:postId/contact - Get contact details for a transport post
router.get('/:postId/contact', authenticateToken, async (req, res) => {
  const { postId } = req.params;
  try {
    // Fetch the user's contact details who posted the transport service
    const [rows] = await pool.execute(
      'SELECT u.email, u.mobile_number, t.contact_phone FROM users u JOIN transport_posts t ON u.id = t.user_id WHERE t.id = ?',
      [postId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Transport post not found.' });
    }
    
    const contact = rows[0];
    // Use contact_phone if available, otherwise fall back to user's mobile_number
    contact.mobile_number = contact.contact_phone || contact.mobile_number;
    delete contact.contact_phone;
    
    res.status(200).json({ success: true, contact });
  } catch (err) {
    console.error('❌ Error fetching transport contact details:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// PUT /api/transport/:postId/status - Update transport post status
router.put('/:postId/status', authenticateToken, checkTransporterRole, async (req, res) => {
  const { postId } = req.params;
  const { status } = req.body;
  const userId = req.userId;

  try {
    // Validate status
    const validStatuses = ['active', 'busy', 'inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be one of: active, busy, inactive'
      });
    }

    // Update the post status
    const [result] = await pool.execute(
      'UPDATE transport_posts SET status = ? WHERE id = ? AND user_id = ?',
      [status, postId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transport post not found or not authorized to update'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Transport post status updated successfully'
    });
  } catch (err) {
    console.error('❌ Error updating transport post status:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// GET /api/transport/search - Search transport posts by location or coverage area
router.get('/search', authenticateToken, async (req, res) => {
  const { location, vehicleType, maxPricePerKm } = req.query;
  const userId = req.userId;
  
  try {
    let query = `
      SELECT 
        t.*,
        CASE WHEN tl.user_id IS NOT NULL THEN 1 ELSE 0 END as is_liked,
        CONCAT(u.first_name, ' ', u.last_name) as owner_name,
        u.email as owner_email,
        u.mobile_number as owner_mobile
      FROM transport_posts t
      LEFT JOIN transport_likes tl ON t.id = tl.transport_id AND tl.user_id = ?
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.status = 'active'
    `;
    
    const params = [userId];
    
    if (location) {
      query += ` AND (t.location_address LIKE ? OR t.coverage_area LIKE ?)`;
      params.push(`%${location}%`, `%${location}%`);
    }
    
    if (vehicleType) {
      query += ` AND t.vehicle_type = ?`;
      params.push(vehicleType);
    }
    
    if (maxPricePerKm) {
      query += ` AND (t.price_per_km IS NULL OR t.price_per_km <= ?)`;
      params.push(parseFloat(maxPricePerKm));
    }
    
    query += ` ORDER BY t.created_at DESC`;

    const [posts] = await pool.execute(query, params);

    res.status(200).json({ success: true, posts });
  } catch (err) {
    console.error('❌ Error searching transport posts:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

module.exports = router;
