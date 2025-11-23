const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', 'chat');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|mp3|wav|ogg/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, documents, and audio files are allowed'));
    }
  }
});

// GET /api/chat/users - Get all available users for friend discovery
router.get('/users', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.user_type,
        COALESCE(os.is_online, false) as is_online,
        os.last_seen,
        CASE
          WHEN f.id IS NOT NULL THEN f.status
          ELSE 'none'
        END as friendship_status,
        f.requester_id,
        f.id as friendship_id
      FROM users u
      LEFT JOIN user_online_status os ON u.id = os.user_id
      LEFT JOIN friends f ON (
        (f.requester_id = ? AND f.addressee_id = u.id) OR 
        (f.addressee_id = ? AND f.requester_id = u.id)
      )
      WHERE u.id != ?
      ORDER BY 
        CASE 
          WHEN f.status = 'accepted' THEN 1
          WHEN f.status = 'pending' THEN 2
          WHEN f.status = 'declined' THEN 3
          ELSE 4
        END,
        u.first_name, u.last_name
    `, [req.userId, req.userId, req.userId]);

    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/me - Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const [users] = await pool.execute(
      'SELECT id, first_name, last_name, email, user_type, mobile_number FROM users WHERE id = ?',
      [req.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = users[0];
    
    // Get online status
    const [status] = await pool.execute(
      'SELECT is_online, last_seen FROM user_online_status WHERE user_id = ?',
      [req.userId]
    );

    if (status.length > 0) {
      user.is_online = status[0].is_online;
      user.last_seen = status[0].last_seen;
    } else {
      user.is_online = false;
      user.last_seen = null;
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting user info:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/friends - Get user's friends
router.get('/friends', authenticateToken, async (req, res) => {
  try {
    const [friends] = await pool.execute(`
      SELECT 
        f.id as friendship_id,
        f.status,
        f.created_at as friendship_created,
        CASE 
          WHEN f.requester_id = ? THEN f.addressee_id
          ELSE f.requester_id 
        END as friend_id,
        CASE 
          WHEN f.requester_id = ? THEN CONCAT(u2.first_name, ' ', u2.last_name)
          ELSE CONCAT(u1.first_name, ' ', u1.last_name)
        END as friend_name,
        CASE 
          WHEN f.requester_id = ? THEN u2.email
          ELSE u1.email
        END as friend_email,
        CASE 
          WHEN f.requester_id = ? THEN u2.user_type
          ELSE u1.user_type
        END as friend_type,
        COALESCE(os.is_online, false) as is_online,
        os.last_seen
      FROM friends f
      LEFT JOIN users u1 ON f.requester_id = u1.id
      LEFT JOIN users u2 ON f.addressee_id = u2.id
      LEFT JOIN user_online_status os ON (
        CASE 
          WHEN f.requester_id = ? THEN os.user_id = f.addressee_id
          ELSE os.user_id = f.requester_id
        END
      )
      WHERE (f.requester_id = ? OR f.addressee_id = ?) 
      AND f.status = 'accepted'
      ORDER BY friend_name
    `, [req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId]);

    res.json(friends);
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/friend-requests - Get pending friend requests
router.get('/friend-requests', authenticateToken, async (req, res) => {
  try {
    const [requests] = await pool.execute(`
      SELECT 
        f.id,
        f.requester_id,
        CONCAT(u.first_name, ' ', u.last_name) as requester_name,
        u.email as requester_email,
        u.user_type as requester_type,
        f.created_at
      FROM friends f
      JOIN users u ON f.requester_id = u.id
      WHERE f.addressee_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [req.userId]);

    res.json(requests);
  } catch (error) {
    console.error('Error getting friend requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/friend-requests - Send a friend request
router.post('/friend-requests', authenticateToken, async (req, res) => {
  try {
    const { email, userId } = req.body;

    let addresseeId;

    if (userId) {
      // Send request by user ID
      addresseeId = userId;
      
      // Verify the user exists and is not the current user
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE id = ? AND id != ?',
        [userId, req.userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
    } else if (email) {
      // Send request by email (existing functionality)
      const [users] = await pool.execute(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, req.userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      addresseeId = users[0].id;
    } else {
      return res.status(400).json({ error: 'Either email or userId is required' });
    }

    // Check if friendship already exists
    const [existing] = await pool.execute(
      `SELECT id FROM friends 
       WHERE (requester_id = ? AND addressee_id = ?) 
       OR (requester_id = ? AND addressee_id = ?)`,
      [req.userId, addresseeId, addresseeId, req.userId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Friend request already exists or users are already friends' });
    }

    // Create friend request
    await pool.execute(
      'INSERT INTO friends (requester_id, addressee_id, status) VALUES (?, ?, ?)',
      [req.userId, addresseeId, 'pending']
    );

    res.status(201).json({ message: 'Friend request sent successfully' });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/friend-requests/:id/accept - Accept a friend request
router.post('/friend-requests/:id/accept', authenticateToken, async (req, res) => {
  try {
    const friendRequestId = req.params.id;

    // Update friend request status
    const [result] = await pool.execute(
      'UPDATE friends SET status = ? WHERE id = ? AND addressee_id = ? AND status = ?',
      ['accepted', friendRequestId, req.userId, 'pending']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/friend-requests/:id/decline - Decline a friend request
router.post('/friend-requests/:id/decline', authenticateToken, async (req, res) => {
  try {
    const friendRequestId = req.params.id;

    // Update friend request status
    const [result] = await pool.execute(
      'UPDATE friends SET status = ? WHERE id = ? AND addressee_id = ? AND status = ?',
      ['declined', friendRequestId, req.userId, 'pending']
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Friend request not found or already processed' });
    }

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    console.error('Error declining friend request:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/groups - Get user's groups
router.get('/groups', authenticateToken, async (req, res) => {
  try {
    const [groups] = await pool.execute(`
      SELECT 
        g.id,
        g.name,
        g.description,
        g.avatar_url,
        g.created_at,
        gm.role,
        CONCAT(creator.first_name, ' ', creator.last_name) as creator_name,
        (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) as member_count,
        (SELECT content FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT created_at FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1) as last_message_time
      FROM chat_groups g
      JOIN group_members gm ON g.id = gm.group_id
      JOIN users creator ON g.creator_id = creator.id
      WHERE gm.user_id = ? AND g.is_active = true
      ORDER BY last_message_time DESC, g.created_at DESC
    `, [req.userId]);

    res.json(groups);
  } catch (error) {
    console.error('Error getting groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/groups - Create a new group
router.post('/groups', authenticateToken, async (req, res) => {
  try {
    const { name, description, memberIds = [] } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Create the group
    const [result] = await pool.execute(
      'INSERT INTO chat_groups (name, description, creator_id) VALUES (?, ?, ?)',
      [name.trim(), description || null, req.userId]
    );

    const groupId = result.insertId;

    // Add creator as admin
    await pool.execute(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, req.userId, 'admin']
    );

    // Add other members
    if (memberIds.length > 0) {
      const memberValues = memberIds.map(memberId => [groupId, memberId, 'member']);
      const placeholders = memberValues.map(() => '(?, ?, ?)').join(', ');
      const flatValues = memberValues.flat();
      
      await pool.execute(
        `INSERT INTO group_members (group_id, user_id, role) VALUES ${placeholders}`,
        flatValues
      );
    }

    res.status(201).json({ 
      id: groupId, 
      name, 
      description,
      message: 'Group created successfully' 
    });
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/messages - Get message history
router.get('/messages', authenticateToken, async (req, res) => {
  try {
    const { chatId, chatType, page = 1, limit = 50 } = req.query;
    console.log('GET /messages request:', { chatId, chatType, page, limit, userId: req.userId });

    if (!chatId || !chatType) {
      return res.status(400).json({ error: 'chatId and chatType are required' });
    }

    // Ensure all parameters are valid numbers
    const parsedPage = parseInt(page) || 1;
    const parsedLimit = parseInt(limit) || 50;
    const parsedChatId = parseInt(chatId);
    const parsedUserId = parseInt(req.userId);
    const offset = (parsedPage - 1) * parsedLimit;

    console.log('Parsed parameters:', { parsedPage, parsedLimit, parsedChatId, parsedUserId, offset });

    if (isNaN(parsedChatId) || isNaN(parsedUserId)) {
      return res.status(400).json({ error: 'Invalid chatId or userId' });
    }

    let query, params;

    if (chatType === 'private') {
      query = `
        SELECT 
          m.id,
          m.sender_id,
          m.content,
          m.message_type,
          m.file_url,
          m.file_name,
          m.file_size,
          m.mime_type,
          m.is_read,
          m.read_at,
          m.created_at,
          CONCAT(u.first_name, ' ', u.last_name) as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE ((m.sender_id = ? AND m.receiver_id = ?) 
           OR (m.sender_id = ? AND m.receiver_id = ?))
        ORDER BY m.created_at DESC
        LIMIT ${parsedLimit} OFFSET ${offset}
      `;
      params = [parsedUserId, parsedChatId, parsedChatId, parsedUserId];
      console.log('About to execute private query with params:', params, 'LIMIT', parsedLimit, 'OFFSET', offset);
    } else if (chatType === 'group') {
      query = `
        SELECT 
          m.id,
          m.sender_id,
          m.content,
          m.message_type,
          m.file_url,
          m.file_name,
          m.file_size,
          m.mime_type,
          m.is_read,
          m.read_at,
          m.created_at,
          CONCAT(u.first_name, ' ', u.last_name) as sender_name
        FROM messages m
        JOIN users u ON m.sender_id = u.id
        WHERE m.group_id = ?
        ORDER BY m.created_at DESC
        LIMIT ${parsedLimit} OFFSET ${offset}
      `;
      params = [parsedChatId];
    } else {
      return res.status(400).json({ error: 'Invalid chatType. Must be "private" or "group"' });
    }

    const [messages] = await pool.execute(query, params);

    // Mark messages as read for private chats
    if (chatType === 'private' && messages.length > 0) {
      await pool.execute(
        'UPDATE messages SET is_read = true, read_at = NOW() WHERE receiver_id = ? AND sender_id = ? AND is_read = false',
        [req.userId, chatId]
      );
    }

    res.json(messages.reverse()); // Reverse to get chronological order
  } catch (error) {
    console.error('Error getting messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/chat/upload - Upload file for chat
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;
    
    res.json({
      fileUrl: fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/chat/conversations - Get user's conversations list
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Get private conversations
    const [privateConversations] = await pool.execute(`
      SELECT DISTINCT
        'private' as type,
        CASE 
          WHEN m.sender_id = ? THEN m.receiver_id
          ELSE m.sender_id 
        END as id,
        CASE 
          WHEN m.sender_id = ? THEN CONCAT(u2.first_name, ' ', u2.last_name)
          ELSE CONCAT(u1.first_name, ' ', u1.last_name)
        END as name,
        m.content as last_message,
        m.created_at as last_message_time,
        m.sender_id as last_sender_id,
        CASE 
          WHEN m.receiver_id = ? AND m.sender_id != ? AND m.is_read = false THEN 1
          ELSE 0
        END as has_unread,
        COALESCE(os.is_online, false) as is_online
      FROM messages m
      JOIN users u1 ON m.sender_id = u1.id
      JOIN users u2 ON m.receiver_id = u2.id
      LEFT JOIN user_online_status os ON (
        CASE 
          WHEN m.sender_id = ? THEN os.user_id = m.receiver_id
          ELSE os.user_id = m.sender_id
        END
      )
      WHERE (m.sender_id = ? OR m.receiver_id = ?)
      AND m.id IN (
        SELECT MAX(id) FROM messages 
        WHERE (sender_id = ? OR receiver_id = ?) 
        AND group_id IS NULL
        GROUP BY 
          CASE 
            WHEN sender_id = ? THEN receiver_id 
            ELSE sender_id 
          END
      )
    `, [req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId, req.userId]);

    // Get group conversations
    const [groupConversations] = await pool.execute(`
      SELECT 
        'group' as type,
        g.id,
        g.name,
        m.content as last_message,
        m.created_at as last_message_time,
        m.sender_id as last_sender_id,
        0 as has_unread,
        false as is_online
      FROM chat_groups g
      JOIN group_members gm ON g.id = gm.group_id
      LEFT JOIN messages m ON g.id = m.group_id
      WHERE gm.user_id = ? AND g.is_active = true
      AND (m.id IS NULL OR m.id IN (
        SELECT MAX(id) FROM messages WHERE group_id = g.id
      ))
    `, [req.userId]);

    // Combine and sort by last message time
    const allConversations = [...privateConversations, ...groupConversations]
      .sort((a, b) => new Date(b.last_message_time || 0) - new Date(a.last_message_time || 0));

    res.json(allConversations);
  } catch (error) {
    console.error('Error getting conversations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
