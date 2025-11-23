# SmartFarm Chat System Backend

This document describes the comprehensive chat system backend implementation for SmartFarm TZ, featuring real-time messaging, friend management, group chats, and file sharing capabilities.

## 🚀 Features Implemented

### Core Chat Features
- ✅ Real-time messaging using Socket.IO
- ✅ Private (1-to-1) conversations
- ✅ Group chat functionality
- ✅ Friend system with requests and management
- ✅ Online/offline status tracking
- ✅ Typing indicators
- ✅ Message read receipts
- ✅ File upload and sharing
- ✅ Message history pagination

### Technical Features
- ✅ JWT authentication for Socket.IO
- ✅ Database persistence for all chat data
- ✅ RESTful API endpoints
- ✅ Real-time event handling
- ✅ File upload with validation
- ✅ Error handling and logging

## 📁 File Structure

```
server/
├── config/
│   └── database.js          # Database configuration with chat tables
├── routes/
│   └── chat.js             # Chat API endpoints
├── services/
│   └── socketService.js    # Socket.IO real-time service
├── middleware/
│   └── authMiddleware.js   # JWT authentication middleware
├── tests/
│   └── chat-api-test.js    # API testing examples
└── server.js               # Main server with Socket.IO integration
```

## 🗄️ Database Schema

### New Tables Added

#### 1. `friends` - Friend relationships
```sql
CREATE TABLE friends (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id INT NOT NULL,
  addressee_id INT NOT NULL,
  status ENUM('pending', 'accepted', 'declined', 'blocked') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 2. `chat_groups` - Group chat rooms
```sql
CREATE TABLE chat_groups (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  creator_id INT NOT NULL,
  avatar_url VARCHAR(500),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 3. `group_members` - Group membership
```sql
CREATE TABLE group_members (
  id INT PRIMARY KEY AUTO_INCREMENT,
  group_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('admin', 'moderator', 'member') DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

#### 4. `messages` - Chat messages
```sql
CREATE TABLE messages (
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
  FOREIGN KEY (group_id) REFERENCES chat_groups(id) ON DELETE CASCADE
);
```

#### 5. `user_online_status` - Online/offline tracking
```sql
CREATE TABLE user_online_status (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  socket_id VARCHAR(100) NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 🛠️ API Endpoints

### Authentication Required
All chat endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### User Management
- `GET /api/chat/me` - Get current user info with online status
- `GET /api/chat/conversations` - Get user's conversation list

### Friend Management
- `GET /api/chat/friends` - Get user's friends list
- `GET /api/chat/friend-requests` - Get pending friend requests
- `POST /api/chat/friend-requests` - Send a friend request
- `POST /api/chat/friend-requests/:id/accept` - Accept a friend request
- `POST /api/chat/friend-requests/:id/decline` - Decline a friend request

### Group Management
- `GET /api/chat/groups` - Get user's groups
- `POST /api/chat/groups` - Create a new group

### Message Management
- `GET /api/chat/messages` - Get message history (with pagination)
- `POST /api/chat/upload` - Upload files for chat

## 🔌 Socket.IO Events

### Client → Server Events

#### Connection
```javascript
socket.emit('connect', { auth: { token: 'jwt-token' } });
```

#### Messaging
```javascript
socket.emit('send_message', {
  chatId: '123',
  chatType: 'private', // or 'group'
  content: 'Hello!',
  messageType: 'text'
});
```

#### Typing Indicators
```javascript
socket.emit('typing_start', { chatId: '123', chatType: 'private' });
socket.emit('typing_stop', { chatId: '123', chatType: 'private' });
```

#### Read Receipts
```javascript
socket.emit('mark_as_read', {
  chatId: '123',
  chatType: 'private',
  messageIds: [1, 2, 3]
});
```

### Server → Client Events

#### New Messages
```javascript
socket.on('new_message', (message) => {
  console.log('New message:', message);
});
```

#### Typing Indicators
```javascript
socket.on('user_typing', (data) => {
  console.log('User typing:', data);
});

socket.on('user_stopped_typing', (data) => {
  console.log('User stopped typing:', data);
});
```

#### Friend Status Updates
```javascript
socket.on('friend_status_update', (status) => {
  console.log('Friend online/offline:', status);
});
```

#### Message Confirmations
```javascript
socket.on('message_sent', (data) => {
  console.log('Message sent successfully:', data);
});

socket.on('message_error', (error) => {
  console.error('Message failed:', error);
});
```

## 🚀 Getting Started

### 1. Install Dependencies
```bash
cd server
npm install socket.io multer
```

### 2. Start the Server
```bash
npm start
```

The server will start on port 5000 with:
- HTTP API: `http://localhost:5000/api`
- Socket.IO: `ws://localhost:5000`
- Chat endpoints: `http://localhost:5000/api/chat`

### 3. Test the API

Use the provided test file to test functionality:

```javascript
// Set your JWT token
const authToken = 'your-jwt-token-from-login';

// Test API endpoints
await getCurrentUser();
await sendFriendRequest('friend@example.com');
await getFriends();
await createGroup('My Group', 'Group description');
await getConversations();
```

## 📱 Frontend Integration

### React Component Integration

The chat system is designed to work with your React frontend. Key integration points:

1. **Authentication**: Use existing JWT token from login
2. **Socket.IO Client**: Connect using `socket.io-client`
3. **API Calls**: Use axios or fetch for REST endpoints
4. **Real-time Events**: Listen for Socket.IO events

### Example React Integration

```javascript
import io from 'socket.io-client';

// Connect to Socket.IO
const socket = io('http://localhost:5000', {
  auth: { token: userToken },
  transports: ['websocket', 'polling']
});

// Listen for messages
socket.on('new_message', (message) => {
  setMessages(prev => [...prev, message]);
});

// Send a message
const sendMessage = (content) => {
  socket.emit('send_message', {
    chatId: currentChatId,
    chatType: 'private',
    content: content
  });
};
```

## 🔒 Security Features

- JWT authentication for all endpoints
- Socket.IO authentication middleware
- File upload validation and limits
- Friend relationship verification
- Group membership validation
- SQL injection protection via parameterized queries

## 📈 Performance Considerations

- Message pagination (50 messages per page)
- Efficient database indexing
- Connection pooling for database
- Socket.IO room-based messaging
- File size limits (10MB)

## 🐛 Error Handling

The system includes comprehensive error handling:
- Invalid authentication tokens
- Missing required parameters
- Database connection errors
- File upload validation errors
- Socket.IO connection errors

## 📋 TODO / Future Enhancements

- [ ] Message encryption
- [ ] Voice messages
- [ ] Video calls integration
- [ ] Message reactions/emojis
- [ ] Message search functionality
- [ ] Push notifications
- [ ] Message delivery status
- [ ] Group admin controls
- [ ] User blocking functionality
- [ ] Message forwarding

## 🆘 Support

For questions or issues with the chat system:

1. Check the logs in the terminal
2. Review the API test file for examples
3. Verify database tables were created correctly
4. Ensure all dependencies are installed

## 🔧 Configuration

### Environment Variables
```env
JWT_SECRET=your-secret-key
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=smartfarm_tz
PORT=5000
```

### File Upload Settings
- Max file size: 10MB
- Allowed types: images, documents, audio files
- Upload directory: `uploads/chat/`

The chat system is now fully integrated and ready for use with your SmartFarm application!
