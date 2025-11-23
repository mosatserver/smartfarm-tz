const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

class SocketService {
  constructor(io) {
    this.io = io;
    this.userSockets = new Map(); // userId -> Set of socket ids
    this.socketUsers = new Map(); // socketId -> userId
    this.init();
  }

  init() {
    this.io.use(this.authenticateSocket.bind(this));
    this.io.on('connection', this.handleConnection.bind(this));
  }

  async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      socket.userId = decoded.userId;
      
      // Verify user exists
      const [users] = await pool.execute('SELECT id FROM users WHERE id = ?', [decoded.userId]);
      if (users.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      next();
    } catch (error) {
      console.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  }

  async handleConnection(socket) {
    const userId = socket.userId;
    console.log(`User ${userId} connected with socket ${socket.id}`);

    // Track user's socket connections
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId).add(socket.id);
    this.socketUsers.set(socket.id, userId);

    // Update user's online status
    await this.updateUserOnlineStatus(userId, true, socket.id);

    // Join user to their personal room for private messages
    socket.join(`user:${userId}`);

    // Join user to their group rooms
    await this.joinUserGroups(socket, userId);

    // Emit online status to friends
    await this.broadcastUserStatusToFriends(userId, { is_online: true });

    // Handle socket events
    socket.on('send_message', this.handleSendMessage.bind(this, socket));
    socket.on('typing_start', this.handleTypingStart.bind(this, socket));
    socket.on('typing_stop', this.handleTypingStop.bind(this, socket));
    socket.on('mark_as_read', this.handleMarkAsRead.bind(this, socket));
    socket.on('join_group', this.handleJoinGroup.bind(this, socket));
    socket.on('leave_group', this.handleLeaveGroup.bind(this, socket));
    socket.on('disconnect', this.handleDisconnect.bind(this, socket));
  }

  async updateUserOnlineStatus(userId, isOnline, socketId = null) {
    try {
      await pool.execute(`
        INSERT INTO user_online_status (user_id, is_online, last_seen, socket_id)
        VALUES (?, ?, NOW(), ?)
        ON DUPLICATE KEY UPDATE
        is_online = VALUES(is_online),
        last_seen = NOW(),
        socket_id = VALUES(socket_id)
      `, [userId, isOnline, socketId]);
    } catch (error) {
      console.error('Error updating user online status:', error);
    }
  }

  async joinUserGroups(socket, userId) {
    try {
      const [groups] = await pool.execute(`
        SELECT g.id FROM chat_groups g
        JOIN group_members gm ON g.id = gm.group_id
        WHERE gm.user_id = ? AND g.is_active = true
      `, [userId]);

      for (const group of groups) {
        socket.join(`group:${group.id}`);
      }
    } catch (error) {
      console.error('Error joining user groups:', error);
    }
  }

  async broadcastUserStatusToFriends(userId, status) {
    try {
      const [friends] = await pool.execute(`
        SELECT 
          CASE 
            WHEN f.requester_id = ? THEN f.addressee_id
            ELSE f.requester_id 
          END as friend_id
        FROM friends f
        WHERE (f.requester_id = ? OR f.addressee_id = ?) 
        AND f.status = 'accepted'
      `, [userId, userId, userId]);

      for (const friend of friends) {
        this.io.to(`user:${friend.friend_id}`).emit('friend_status_update', {
          userId,
          ...status
        });
      }
    } catch (error) {
      console.error('Error broadcasting user status to friends:', error);
    }
  }

  async handleSendMessage(socket, data) {
    try {
      console.log('Handling send message:', { userId: socket.userId, data });
      const { chatId, chatType, content, messageType = 'text', fileUrl, fileName, fileSize, mimeType } = data;
      const senderId = socket.userId;

      if (!senderId) {
        console.error('No sender ID found in socket');
        socket.emit('message_error', { error: 'Authentication required' });
        return;
      }

      if (!chatId || !chatType || (!content && !fileUrl)) {
        console.error('Missing required fields:', { chatId, chatType, content, fileUrl });
        socket.emit('message_error', { error: 'Missing required fields: message must have content or file attachment' });
        return;
      }

      let messageData;

      if (chatType === 'private') {
        // Check if this is a bargaining message related to marketplace
        const isBargainingMessage = messageType === 'bargain' || (data.marketplacePostId !== undefined);
        
        if (!isBargainingMessage) {
          // For regular private messages, verify friendship exists
          const [friendship] = await pool.execute(`
            SELECT id FROM friends 
            WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
            AND status = 'accepted'
          `, [senderId, chatId, chatId, senderId]);

          if (friendship.length === 0) {
            socket.emit('message_error', { error: 'Not authorized to send message to this user' });
            return;
          }
        } else {
          // For bargaining messages, verify both users exist and the post exists if specified
          const [users] = await pool.execute(`
            SELECT COUNT(*) as count FROM users 
            WHERE id IN (?, ?)
          `, [senderId, chatId]);
          
          if (users[0].count !== 2) {
            socket.emit('message_error', { error: 'Invalid users for bargaining message' });
            return;
          }
          
          // If marketplacePostId is provided, verify the post exists and belongs to the receiver
          if (data.marketplacePostId) {
            const [posts] = await pool.execute(`
              SELECT id FROM marketplace_posts 
              WHERE id = ? AND user_id = ?
            `, [data.marketplacePostId, chatId]);
            
            if (posts.length === 0) {
              socket.emit('message_error', { error: 'Marketplace post not found or not owned by recipient' });
              return;
            }
          }
        }

        // Insert private message
        const [result] = await pool.execute(`
          INSERT INTO messages (sender_id, receiver_id, content, message_type, file_url, file_name, file_size, mime_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [senderId, chatId, content, messageType, fileUrl || null, fileName || null, fileSize || null, mimeType || null]);

        // Get message with sender info
        const [messages] = await pool.execute(`
          SELECT 
            m.id, m.sender_id, m.receiver_id, m.content, m.message_type,
            m.file_url, m.file_name, m.file_size, m.mime_type,
            m.is_read, m.read_at, m.created_at,
            CONCAT(u.first_name, ' ', u.last_name) as sender_name
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `, [result.insertId]);

        messageData = messages[0];

        // Emit to receiver
        this.io.to(`user:${chatId}`).emit('new_message', messageData);
        
      } else if (chatType === 'group') {
        // Verify user is member of group
        const [membership] = await pool.execute(`
          SELECT id FROM group_members 
          WHERE group_id = ? AND user_id = ?
        `, [chatId, senderId]);

        if (membership.length === 0) {
          socket.emit('message_error', { error: 'Not a member of this group' });
          return;
        }

        // Insert group message
        const [result] = await pool.execute(`
          INSERT INTO messages (sender_id, group_id, content, message_type, file_url, file_name, file_size, mime_type)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [senderId, chatId, content, messageType, fileUrl || null, fileName || null, fileSize || null, mimeType || null]);

        // Get message with sender info
        const [messages] = await pool.execute(`
          SELECT 
            m.id, m.sender_id, m.group_id, m.content, m.message_type,
            m.file_url, m.file_name, m.file_size, m.mime_type,
            m.is_read, m.read_at, m.created_at,
            CONCAT(u.first_name, ' ', u.last_name) as sender_name
          FROM messages m
          JOIN users u ON m.sender_id = u.id
          WHERE m.id = ?
        `, [result.insertId]);

        messageData = messages[0];

        // Emit to all group members
        this.io.to(`group:${chatId}`).emit('new_message', messageData);
      }

      // Confirm message sent to sender
      socket.emit('message_sent', { tempId: data.tempId, message: messageData });

    } catch (error) {
      console.error('Error sending message:', error);
      socket.emit('message_error', { error: 'Failed to send message' });
    }
  }

  handleTypingStart(socket, data) {
    const { chatId, chatType } = data;
    const userId = socket.userId;

    if (chatType === 'private') {
      this.io.to(`user:${chatId}`).emit('user_typing', { userId, chatId, chatType });
    } else if (chatType === 'group') {
      socket.to(`group:${chatId}`).emit('user_typing', { userId, chatId, chatType });
    }
  }

  handleTypingStop(socket, data) {
    const { chatId, chatType } = data;
    const userId = socket.userId;

    if (chatType === 'private') {
      this.io.to(`user:${chatId}`).emit('user_stopped_typing', { userId, chatId, chatType });
    } else if (chatType === 'group') {
      socket.to(`group:${chatId}`).emit('user_stopped_typing', { userId, chatId, chatType });
    }
  }

  async handleMarkAsRead(socket, data) {
    try {
      const { chatId, chatType, messageIds } = data;
      const userId = socket.userId;

      if (chatType === 'private' && messageIds && messageIds.length > 0) {
        await pool.execute(`
          UPDATE messages 
          SET is_read = true, read_at = NOW() 
          WHERE id IN (${messageIds.map(() => '?').join(',')}) 
          AND receiver_id = ?
        `, [...messageIds, userId]);

        // Notify sender about read status
        this.io.to(`user:${chatId}`).emit('messages_read', { 
          messageIds, 
          readBy: userId, 
          readAt: new Date() 
        });
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  async handleJoinGroup(socket, data) {
    const { groupId } = data;
    const userId = socket.userId;

    try {
      // Verify user is member of group
      const [membership] = await pool.execute(`
        SELECT id FROM group_members 
        WHERE group_id = ? AND user_id = ?
      `, [groupId, userId]);

      if (membership.length > 0) {
        socket.join(`group:${groupId}`);
        socket.emit('joined_group', { groupId });
      }
    } catch (error) {
      console.error('Error joining group:', error);
    }
  }

  handleLeaveGroup(socket, data) {
    const { groupId } = data;
    socket.leave(`group:${groupId}`);
    socket.emit('left_group', { groupId });
  }

  async handleDisconnect(socket) {
    const userId = socket.userId;
    const socketId = socket.id;

    console.log(`User ${userId} disconnected (socket ${socketId})`);

    // Remove socket from user's connections
    if (this.userSockets.has(userId)) {
      this.userSockets.get(userId).delete(socketId);
      
      // If no more connections, mark user as offline
      if (this.userSockets.get(userId).size === 0) {
        this.userSockets.delete(userId);
        await this.updateUserOnlineStatus(userId, false);
        
        // Broadcast offline status to friends
        await this.broadcastUserStatusToFriends(userId, { is_online: false, last_seen: new Date() });
      }
    }

    this.socketUsers.delete(socketId);
  }

  // Helper method to get user's socket connections
  getUserSockets(userId) {
    return this.userSockets.get(userId) || new Set();
  }

  // Helper method to check if user is online
  isUserOnline(userId) {
    return this.userSockets.has(userId) && this.userSockets.get(userId).size > 0;
  }

  // Helper method to emit to all user's sockets
  emitToUser(userId, event, data) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Helper method to emit to group
  emitToGroup(groupId, event, data) {
    this.io.to(`group:${groupId}`).emit(event, data);
  }
}

module.exports = SocketService;
