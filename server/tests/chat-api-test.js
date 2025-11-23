// Chat API Test Examples
// This file demonstrates how to test the chat functionality

const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';
let authToken = ''; // Replace with actual JWT token from login

// Example API calls for chat functionality

// 1. Get current user info
async function getCurrentUser() {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Current user:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting current user:', error.response?.data || error.message);
  }
}

// 2. Send a friend request
async function sendFriendRequest(email) {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/friend-requests`, {
      email: email
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Friend request sent:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error sending friend request:', error.response?.data || error.message);
  }
}

// 3. Get friend requests
async function getFriendRequests() {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/friend-requests`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Friend requests:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting friend requests:', error.response?.data || error.message);
  }
}

// 4. Accept a friend request
async function acceptFriendRequest(requestId) {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/friend-requests/${requestId}/accept`, {}, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Friend request accepted:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error accepting friend request:', error.response?.data || error.message);
  }
}

// 5. Get friends list
async function getFriends() {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/friends`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Friends list:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting friends:', error.response?.data || error.message);
  }
}

// 6. Create a group
async function createGroup(name, description, memberIds = []) {
  try {
    const response = await axios.post(`${API_BASE_URL}/chat/groups`, {
      name: name,
      description: description,
      memberIds: memberIds
    }, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('Group created:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error creating group:', error.response?.data || error.message);
  }
}

// 7. Get user groups
async function getGroups() {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/groups`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Groups:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting groups:', error.response?.data || error.message);
  }
}

// 8. Get message history
async function getMessages(chatId, chatType, page = 1, limit = 50) {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/messages`, {
      params: {
        chatId: chatId,
        chatType: chatType, // 'private' or 'group'
        page: page,
        limit: limit
      },
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Messages:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting messages:', error.response?.data || error.message);
  }
}

// 9. Get conversations list
async function getConversations() {
  try {
    const response = await axios.get(`${API_BASE_URL}/chat/conversations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });
    console.log('Conversations:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error getting conversations:', error.response?.data || error.message);
  }
}

// 10. Upload a file for chat
async function uploadFile(filePath) {
  try {
    const FormData = require('form-data');
    const fs = require('fs');
    
    const form = new FormData();
    form.append('file', fs.createReadStream(filePath));
    
    const response = await axios.post(`${API_BASE_URL}/chat/upload`, form, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...form.getHeaders()
      }
    });
    console.log('File uploaded:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error.response?.data || error.message);
  }
}

// Socket.IO client example
function connectToSocket(token) {
  const io = require('socket.io-client');
  
  const socket = io('http://localhost:5000', {
    auth: {
      token: token
    },
    transports: ['websocket', 'polling']
  });

  // Connection events
  socket.on('connect', () => {
    console.log('Connected to Socket.IO server:', socket.id);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected from Socket.IO server');
  });

  // Chat events
  socket.on('new_message', (message) => {
    console.log('New message received:', message);
  });

  socket.on('user_typing', (data) => {
    console.log('User typing:', data);
  });

  socket.on('user_stopped_typing', (data) => {
    console.log('User stopped typing:', data);
  });

  socket.on('friend_status_update', (status) => {
    console.log('Friend status update:', status);
  });

  socket.on('message_sent', (data) => {
    console.log('Message sent confirmation:', data);
  });

  socket.on('message_error', (error) => {
    console.error('Message error:', error);
  });

  // Send a message
  function sendMessage(chatId, chatType, content, messageType = 'text') {
    const messageData = {
      chatId: chatId,
      chatType: chatType, // 'private' or 'group'
      content: content,
      messageType: messageType,
      tempId: Date.now() + Math.random() // Temporary ID for tracking
    };
    
    socket.emit('send_message', messageData);
  }

  // Start typing indicator
  function startTyping(chatId, chatType) {
    socket.emit('typing_start', { chatId, chatType });
  }

  // Stop typing indicator
  function stopTyping(chatId, chatType) {
    socket.emit('typing_stop', { chatId, chatType });
  }

  // Mark messages as read
  function markAsRead(chatId, chatType, messageIds) {
    socket.emit('mark_as_read', { chatId, chatType, messageIds });
  }

  return {
    socket,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead
  };
}

// Example usage
async function runTests() {
  // First, you need to login and get a JWT token
  // authToken = 'your-jwt-token-here';
  
  console.log('=== Chat API Tests ===');
  
  // Test API endpoints
  // await getCurrentUser();
  // await sendFriendRequest('friend@example.com');
  // await getFriendRequests();
  // await getFriends();
  // await createGroup('Test Group', 'A test group for chat');
  // await getGroups();
  // await getConversations();
  // await getMessages('1', 'private');
  
  // Test Socket.IO connection
  // const chatSocket = connectToSocket(authToken);
  
  // Example: Send a message after connecting
  // setTimeout(() => {
  //   chatSocket.sendMessage('1', 'private', 'Hello from API test!');
  // }, 1000);
}

// Uncomment to run tests
// runTests();

module.exports = {
  getCurrentUser,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  getFriends,
  createGroup,
  getGroups,
  getMessages,
  getConversations,
  uploadFile,
  connectToSocket
};
