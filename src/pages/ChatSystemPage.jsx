/*
SmartFarm Chat System - Integrated with Backend
Real-time messaging with Socket.IO and REST API
*/

import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from 'socket.io-client';
import EmojiPicker from 'emoji-picker-react';
import { motion } from 'framer-motion';
import api from '../api';

// Socket URL - use same host as the app or localhost:5000 for development
const SOCKET_URL = 'http://localhost:5000';

export default function ChatSystemPage() {
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const [me, setMe] = useState(null);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [showEmoji, setShowEmoji] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const fileInputRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Check for bargaining context from marketplace
  useEffect(() => {
    const handleBargainContext = async () => {
      const bargainContextStr = localStorage.getItem('chatBargainContext');
      if (!bargainContextStr) return;

      try {
        const bargainContext = JSON.parse(bargainContextStr);
        
        // Check if this context is recent (within 5 minutes)
        const contextAge = Date.now() - bargainContext.timestamp;
        if (contextAge > 5 * 60 * 1000) {
          localStorage.removeItem('chatBargainContext');
          return;
        }

        // Clear the context to prevent re-processing
        localStorage.removeItem('chatBargainContext');

        if (me && bargainContext.sellerId) {
          // Create a direct chat with the product uploader (seller)
          const sellerContact = bargainContext.sellerContact;
          const sellerName = `${sellerContact?.first_name || ''} ${sellerContact?.last_name || ''}`.trim() || 'Product Seller';
          
          // Set up direct chat with the seller
          const directChat = {
            type: 'private',
            id: bargainContext.sellerId,
            name: sellerName
          };
          
          setSelectedChat(directChat);
          
          // Load existing messages with this seller if any
          try {
            const res = await api.get('/chat/messages', {
              params: {
                chatId: bargainContext.sellerId,
                chatType: 'private'
              }
            });
            setMessages(res.data);
          } catch (error) {
            console.log('No existing messages with this seller, starting fresh chat');
            setMessages([]);
          }

          // Wait a moment for chat to load, then send the bargaining message
          setTimeout(() => {
            if (socketRef.current) {
              // Create a rich bargaining message with product details
              const productImageText = bargainContext.productImage ? 
                `\n\n🖼️ Product Image: ${window.location.origin}/marketplace (View in marketplace)` : '';
              
              const bargainMessage = `🤝 **BARGAINING REQUEST**\n\n` +
                `📦 **Product:** ${bargainContext.productTitle}\n` +
                `💰 **Listed Price:** TZS ${bargainContext.productPrice?.toLocaleString('en-US')}\n` +
                `🔗 **Product ID:** #${bargainContext.productId}${productImageText}\n\n` +
                `Hi ${sellerName}! I'm interested in bargaining for this product. Could we discuss a better price? ` +
                `I saw your listing in the marketplace and would love to negotiate. Thank you! 😊`;

              const messagePayload = {
                chatId: bargainContext.sellerId,
                chatType: 'private',
                content: bargainMessage,
                messageType: 'text',
                tempId: `tmp_bargain_${Date.now()}_${Math.random()}`
              };

              // Add optimistic message to UI
              const optimisticMessage = {
                id: messagePayload.tempId,
                sender_id: me.id,
                receiver_id: bargainContext.sellerId,
                group_id: null,
                content: bargainMessage,
                message_type: 'text',
                created_at: new Date().toISOString(),
                sender_name: `${me.first_name} ${me.last_name}`,
                status: 'sending'
              };

              setMessages(prev => [...prev, optimisticMessage]);

              // Send via Socket.IO
              socketRef.current.emit('send_message', messagePayload);

              console.log(`✅ Bargaining message sent automatically to ${sellerName} (ID: ${bargainContext.sellerId})`);
              
              // Show success notification
              const notification = document.createElement('div');
              notification.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce';
              notification.innerHTML = `🎉 Bargaining message sent to ${sellerName}!`;
              document.body.appendChild(notification);
              setTimeout(() => {
                document.body.removeChild(notification);
              }, 3000);
            }
          }, 1000);
        } else {
          console.log('❌ Missing user data or seller ID');
        }
      } catch (error) {
        console.error('Error processing bargain context:', error);
        localStorage.removeItem('chatBargainContext');
      }
    };

    // Only run if we have the current user loaded
    if (me) {
      handleBargainContext();
    }
  }, [me]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user
      const userRes = await api.get('/chat/me');
      setMe(userRes.data);
      
      // Get friends
      const friendsRes = await api.get('/chat/friends');
      setFriends(friendsRes.data);
      
      // Get friend requests
      const requestsRes = await api.get('/chat/friend-requests');
      setFriendRequests(requestsRes.data);
      
      // Get groups
      const groupsRes = await api.get('/chat/groups');
      setGroups(groupsRes.data);
      
      // Get conversations
      const conversationsRes = await api.get('/chat/conversations');
      setConversations(conversationsRes.data);
      
      // Get available users
      const usersRes = await api.get('/chat/users');
      setAvailableUsers(usersRes.data);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No auth token found');
      return;
    }
    
    loadInitialData();
  }, [loadInitialData]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const conversationsRes = await api.get('/chat/conversations');
      setConversations(conversationsRes.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  // -- SOCKET.IO SETUP --
  useEffect(() => {
    if (!me) return;
    
    try {
      console.log('Connecting to Socket.IO...');
      socketRef.current = io(SOCKET_URL, {
        auth: { token: localStorage.getItem('token') },
        transports: ['polling', 'websocket'], // Try polling first, then websocket
        timeout: 20000,
        forceNew: false,
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        maxReconnectionAttempts: 5,
        randomizationFactor: 0.5
      });

      const socket = socketRef.current;

      socket.on('connect', () => {
        console.log('Socket.IO connected:', socket.id);
        setConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        setConnected(false);
      });

      // Listen for new messages
      socket.on('new_message', (message) => {
        console.log('New message received:', message);
        if (selectedChat) {
          const isFromCurrentChat = 
            (selectedChat.type === 'private' && 
             (message.sender_id === selectedChat.id || message.receiver_id === selectedChat.id)) ||
            (selectedChat.type === 'group' && message.group_id === selectedChat.id);
          
          if (isFromCurrentChat) {
            setMessages(prev => [...prev, message]);
          }
        }
        // Refresh conversations to update last message
        loadConversations();
      });

      // Listen for typing indicators
      socket.on('user_typing', ({ userId, chatId, chatType }) => {
        const key = `${chatType}_${chatId}`;
        setTypingUsers(prev => ({ ...prev, [key]: userId }));
      });

      socket.on('user_stopped_typing', ({ userId, chatId, chatType }) => {
        const key = `${chatType}_${chatId}`;
        setTypingUsers(prev => {
          const newState = { ...prev };
          delete newState[key];
          return newState;
        });
      });

      // Listen for friend status updates
      socket.on('friend_status_update', ({ userId, is_online }) => {
        console.log('Friend status update:', userId, is_online);
        setFriends(prev => prev.map(friend => 
          friend.friend_id === userId 
            ? { ...friend, is_online }
            : friend
        ));
      });

      // Listen for message sent confirmations
      socket.on('message_sent', ({ tempId, message }) => {
        console.log('Message sent confirmation:', tempId, message);
        // Replace temporary message with actual message from server
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? message : msg
        ));
      });

      socket.on('message_error', (error) => {
        console.error('Message error:', error);
        alert('Error sending message: ' + error.error);
      });

      return () => {
        console.log('Cleaning up Socket.IO connection');
        socket.disconnect();
        socketRef.current = null;
        setConnected(false);
      };
    } catch (err) {
      console.error('Socket.IO connection failed:', err);
    }
  }, [me, selectedChat]);

  // -- SELECT CHAT & LOAD HISTORY --
  const openPrivateChat = useCallback(async (friend) => {
    setSelectedChat({ 
      type: 'private', 
      id: friend.friend_id, 
      name: friend.friend_name 
    });
    
    try {
      const res = await api.get('/chat/messages', {
        params: {
          chatId: friend.friend_id,
          chatType: 'private'
        }
      });
      setMessages(res.data);
    } catch (error) {
      console.error('Error loading private chat messages:', error);
    }
  }, []);

  const openGroupChat = useCallback(async (group) => {
    setSelectedChat({ type: 'group', id: group.id, name: group.name });
    
    try {
      const res = await api.get('/chat/messages', {
        params: {
          chatId: group.id,
          chatType: 'group'
        }
      });
      setMessages(res.data);
    } catch (error) {
      console.error('Error loading group chat messages:', error);
    }
  }, []);

  // -- SEARCH USERS & SEND FRIEND REQUESTS --
  const searchUsers = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    // For now, we'll search through existing users - you can implement a proper search endpoint
    console.log('Searching for users:', query);
  }, []);

  const sendFriendRequest = useCallback(async (email) => {
    try {
      await api.post('/chat/friend-requests', { email });
      alert('Friend request sent successfully!');
      // Refresh friend requests
      const requestsRes = await api.get('/chat/friend-requests');
      setFriendRequests(requestsRes.data);
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request: ' + (error.response?.data?.error || error.message));
    }
  }, []);

  // Send friend request by user ID
  const sendFriendRequestById = useCallback(async (userId) => {
    try {
      await api.post('/chat/friend-requests', { userId });
      alert('Friend request sent successfully!');
      // Refresh available users and friend requests
      const usersRes = await api.get('/chat/users');
      setAvailableUsers(usersRes.data);
      const requestsRes = await api.get('/chat/friend-requests');
      setFriendRequests(requestsRes.data);
    } catch (error) {
      console.error('Error sending friend request:', error);
      alert('Error sending friend request: ' + (error.response?.data?.error || error.message));
    }
  }, []);

  // Accept friend request
  const acceptFriendRequest = useCallback(async (requestId) => {
    try {
      await api.post(`/chat/friend-requests/${requestId}/accept`);
      alert('Friend request accepted!');
      // Refresh all relevant data
      const friendsRes = await api.get('/chat/friends');
      setFriends(friendsRes.data);
      const requestsRes = await api.get('/chat/friend-requests');
      setFriendRequests(requestsRes.data);
      const usersRes = await api.get('/chat/users');
      setAvailableUsers(usersRes.data);
    } catch (error) {
      console.error('Error accepting friend request:', error);
      alert('Error accepting friend request: ' + (error.response?.data?.error || error.message));
    }
  }, []);

  // Decline friend request
  const declineFriendRequest = useCallback(async (requestId) => {
    try {
      await api.post(`/chat/friend-requests/${requestId}/decline`);
      alert('Friend request declined.');
      // Refresh friend requests and available users
      const requestsRes = await api.get('/chat/friend-requests');
      setFriendRequests(requestsRes.data);
      const usersRes = await api.get('/chat/users');
      setAvailableUsers(usersRes.data);
    } catch (error) {
      console.error('Error declining friend request:', error);
      alert('Error declining friend request: ' + (error.response?.data?.error || error.message));
    }
  }, []);

  // -- UPLOAD ATTACHMENTS --
  const uploadFile = useCallback(async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await api.post('/chat/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return res.data;
    } catch (error) {
      console.error('Upload failed:', error);
      throw error;
    }
  }, []);

  // -- SEND MESSAGE --
  const sendMessage = useCallback(async () => {
    if (!messageText.trim() && attachments.length === 0) return;
    if (!selectedChat) return alert('Select a chat first');
    if (!socketRef.current) return alert('Not connected to server');

    const tempId = `tmp_${Date.now()}_${Math.random()}`;
    let fileAttachments = [];

    // Upload attachments first
    if (attachments.length > 0) {
      try {
        for (const attachment of attachments) {
          if (attachment.file) {
            const uploadResult = await uploadFile(attachment.file);
            fileAttachments.push(uploadResult);
          }
        }
      } catch (error) {
        console.error('Error uploading attachments:', error);
        alert('Error uploading files. Please try again.');
        return;
      }
    }

    // Prepare message payload for Socket.IO
    const messagePayload = {
      chatId: selectedChat.id,
      chatType: selectedChat.type,
      content: messageText.trim() || (fileAttachments.length > 0 ? '[File attachment]' : ''),
      messageType: fileAttachments.length > 0 ? 'file' : 'text',
      tempId: tempId
    };

    // Add file information if there are attachments
    if (fileAttachments.length > 0 && fileAttachments[0]) {
      messagePayload.fileUrl = fileAttachments[0].fileUrl;
      messagePayload.fileName = fileAttachments[0].fileName;
      messagePayload.fileSize = fileAttachments[0].fileSize;
      messagePayload.mimeType = fileAttachments[0].mimeType;
    }

    // Add optimistic message to UI
    const optimisticMessage = {
      id: tempId,
      sender_id: me.id,
      receiver_id: selectedChat.type === 'private' ? selectedChat.id : null,
      group_id: selectedChat.type === 'group' ? selectedChat.id : null,
      content: messagePayload.content,
      message_type: messagePayload.messageType,
      file_url: messagePayload.fileUrl || null,
      file_name: messagePayload.fileName || null,
      created_at: new Date().toISOString(),
      sender_name: `${me.first_name} ${me.last_name}`,
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);

    // Send via Socket.IO
    socketRef.current.emit('send_message', messagePayload);

    // Clear input
    setMessageText('');
    setAttachments([]);
    setShowEmoji(false);
  }, [messageText, attachments, selectedChat, me, uploadFile]);

  // -- FILE ATTACH HANDLERS --
  function onSelectFiles(e) {
    const files = Array.from(e.target.files || []);
    const mapped = files.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
      mime: file.type,
    }));
    setAttachments((a) => [...a, ...mapped]);
  }

  function removeAttachment(idx) {
    setAttachments((a) => {
      const copy = [...a];
      URL.revokeObjectURL(copy[idx].previewUrl);
      copy.splice(idx, 1);
      return copy;
    });
  }

  // -- TYPING INDICATOR --
  function onUserTyping() {
    if (!selectedChat || !socketRef.current) return;
    socketRef.current.emit('typing_start', {
      chatType: selectedChat.type,
      chatId: selectedChat.id,
    });
  }

  // small helper to render attachments
  function AttachmentPreview({ att }) {
    if (att.mime.startsWith('image/')) {
      return <img src={att.previewUrl || att.url} className="w-40 h-28 object-cover rounded-md" alt="img" />;
    }
    if (att.mime.startsWith('video/')) {
      return <video src={att.previewUrl || att.url} controls className="w-52 h-36 rounded-md" />;
    }
    // generic file
    return (
      <a className="p-2 border rounded-md inline-block text-sm" href={att.url} target="_blank" rel="noreferrer">
        {att.file ? att.file.name : (att.url || 'file')}
      </a>
    );
  }

  // -- UI RENDER --
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 flex">
      {/* Enhanced animated background */}
      <motion.div
        className="absolute inset-0 -z-10"
        animate={{ opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 10, repeat: Infinity }}
      >
        <div className="w-full h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50" />
      </motion.div>

      {/* Enhanced Sidebar */}
      <aside className="w-80 p-4 border-r border-gray-300 bg-white/90 backdrop-blur-md shadow-lg">
        <div className="mb-4 flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden">
            <div className="w-full h-full flex items-center justify-center text-lg font-semibold text-gray-800">
              {me?.first_name?.[0] || me?.last_name?.[0] || '?'}
            </div>
          </div>
          <div>
            <div className="font-semibold text-gray-900">{me ? `${me.first_name} ${me.last_name}` : 'You'}</div>
            <div className="text-xs text-gray-600">
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </div>
          </div>
        </div>

        <div className="mb-3">
              <input 
                type="text" 
                placeholder="Search by email to add friends" 
                className="w-full p-3 rounded-lg border-2 border-gray-400 bg-white placeholder-gray-600 text-gray-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none shadow-md" 
                onChange={(e) => searchUsers(e.target.value)} 
              />
          {searchResults.length > 0 && (
            <div className="mt-2 max-h-48 overflow-auto">
              {searchResults.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      {u.first_name?.[0] || u.email?.[0] || '?'}
                    </div>
                    <div>
                      <div className="font-medium">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-gray-500">{u.email}</div>
                    </div>
                  </div>
                  <button 
                    className="text-sm text-blue-600" 
                    onClick={() => sendFriendRequest(u.email)}
                  >
                    Add Friend
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Friend Requests Section */}
        {friendRequests.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold text-sm mb-2 text-orange-600">Friend Requests ({friendRequests.length})</h3>
            <div className="space-y-2 max-h-48 overflow-auto">
              {friendRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-2 bg-orange-50 border border-orange-200 rounded">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-200 flex items-center justify-center">
                      {request.requester_name?.[0] || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{request.requester_name}</div>
                      <div className="text-xs text-gray-500">{request.requester_email}</div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button 
                      className="text-xs px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600" 
                      onClick={() => acceptFriendRequest(request.id)}
                      title="Accept"
                    >
                      ✓
                    </button>
                    <button 
                      className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600" 
                      onClick={() => declineFriendRequest(request.id)}
                      title="Decline"
                    >
                      ✗
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Users Section */}
        <div className="mb-4">
          <h3 className="font-semibold text-base mb-3 text-blue-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            Available Users
          </h3>
          <div className="space-y-3 max-h-48 overflow-auto">
            {availableUsers.filter(user => user.friendship_status !== 'accepted').map((user) => (
              <div key={user.id} className="flex items-center justify-between p-3 hover:bg-blue-50/70 rounded-xl border border-gray-100 hover:border-blue-200 transition-all duration-200 hover:shadow-md bg-white/80">
                <div className="flex items-center gap-3">
                  <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shadow-lg ${
                    user.is_online 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 ring-3 ring-green-300/50' 
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}>
                    {user.first_name?.[0] || user.last_name?.[0] || '?'}
                    {user.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-base text-gray-900 leading-tight">
                      {user.first_name} {user.last_name}
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-2">
                      <span className="capitalize bg-gray-100 px-2 py-0.5 rounded-full text-xs">
                        {user.user_type}
                      </span>
                      <span className={`text-xs ${
                        user.is_online ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {user.is_online ? '🟢 online' : '⚫ offline'}
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  {user.friendship_status === 'none' && (
                    <button 
                      className="text-sm px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full hover:from-blue-600 hover:to-indigo-600 font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105" 
                      onClick={() => sendFriendRequestById(user.id)}
                      title="Send friend request"
                    >
                      Follow
                    </button>
                  )}
                  {user.friendship_status === 'pending' && (
                    <span className="text-sm px-4 py-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 rounded-full border border-yellow-300">
                      {user.requester_id === me?.id ? 'Sent' : 'Pending'}
                    </span>
                  )}
                  {user.friendship_status === 'declined' && (
                    <span className="text-sm px-4 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-700 rounded-full border border-red-300">
                      Declined
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-base mb-3 text-green-700 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Friends
          </h3>
          <div className="space-y-3 max-h-64 overflow-auto">
            {friends.map((f) => (
              <div key={f.friendship_id} className="flex items-center justify-between p-3 hover:bg-green-50/70 rounded-xl border border-gray-100 hover:border-green-200 transition-all duration-200 hover:shadow-md bg-white/80 cursor-pointer" onClick={() => openPrivateChat(f)}>
                <div className="flex items-center gap-3 flex-1">
                  <div className={`relative w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-lg ${
                    f.is_online 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 ring-3 ring-green-300/50' 
                      : 'bg-gradient-to-r from-gray-400 to-gray-500'
                  }`}>
                    {f.friend_name?.[0] || '?'}
                    {f.is_online && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 border-2 border-white rounded-full animate-pulse"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900 leading-tight">
                      {f.friend_name}
                    </div>
                    <div className={`text-sm flex items-center gap-1 ${
                      f.is_online ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      <span>{f.is_online ? '🟢 online' : '⚫ offline'}</span>
                      {f.unreadCount && (
                        <span className="ml-2 bg-red-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold animate-bounce">
                          {f.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-gray-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <h3 className="font-semibold text-sm mb-2">Groups</h3>
          <div className="space-y-2 max-h-44 overflow-auto">
            {groups.map((g) => (
              <div key={g.id} className="p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => openGroupChat(g)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">{g.name[0]}</div>
                    <div>
                      <div className="font-medium">{g.name}</div>
                      <div className="text-xs text-gray-500">{g.membersCount} members</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">{g.unread}</div>
                </div>
              </div>
            ))}
          </div>
          <CreateGroupButton onCreate={(grp) => setGroups((s) => [grp, ...s])} />
        </div>
      </aside>

      {/* Enhanced Main Chat Area */}
      <main className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
        {/* Enhanced Chat Header */}
        <div className="border-b border-gray-300 p-4 bg-white/90 backdrop-blur-md shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            {selectedChat && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                {selectedChat.name?.[0] || '?'}
              </div>
            )}
            <div>
              <div className="font-bold text-lg text-gray-800">
                {selectedChat ? selectedChat.name : 'Select a chat'}
              </div>
              <div className="text-sm text-gray-600">
                {selectedChat ? `${selectedChat.type} chat` : 'Choose a friend or group to start messaging'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Enhanced typing indicator */}
            {selectedChat && typingUsers[`${selectedChat.type}_${selectedChat.id}`] && (
              <div className="flex items-center gap-2 text-sm text-indigo-600">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
                <span>typing...</span>
              </div>
            )}
            {/* Connection status indicator */}
            <div className={`px-3 py-1 rounded-full text-xs font-medium ${
              connected 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              {connected ? '🟢 Online' : '🔴 Offline'}
            </div>
          </div>
        </div>

        {/* Enhanced Messages Area */}
        <div className="flex-1 overflow-auto p-6 bg-gradient-to-b from-gray-50/50 to-white/80">
          <div className="space-y-4 max-w-4xl mx-auto">
            {selectedChat ? (
              messages.length > 0 ? (
                messages.map((m) =>
                  <MessageBubble key={m.id} me={me} message={m} />
                )
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <div className="text-lg mb-2">💬</div>
                  <div>Start a conversation with {selectedChat.name}</div>
                </div>
              )
            ) : (
              <div className="text-center text-gray-500 py-8">
                <div className="text-lg mb-2">🗨️</div>
                <div>Select a friend or group to start chatting</div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Enhanced Message Input Area */}
        <div className="p-4 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <div className="mb-3 flex items-end gap-3">
              {/* Enhanced Emoji Button */}
              <button 
                className="p-3 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 shadow-md transition-all duration-200 transform hover:scale-105" 
                onClick={() => setShowEmoji((s) => !s)}
                title="Add emoji"
              >
                <span className="text-lg">😊</span>
              </button>
              
              {/* Enhanced Attachment Button */}
              <button 
                className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-md transition-all duration-200 transform hover:scale-105" 
                onClick={() => fileInputRef.current.click()}
                title="Attach file"
              >
                <span className="text-lg">📎</span>
              </button>
              <input ref={fileInputRef} className="hidden" type="file" multiple onChange={onSelectFiles} />

              {/* Enhanced Message Input */}
              <div className="flex-1">
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  onInput={onUserTyping}
                  placeholder={selectedChat ? `Type a message to ${selectedChat.name}...` : 'Select a chat to start messaging'}
                  className="w-full p-4 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:outline-none resize-none h-16 bg-white shadow-md transition-all duration-200 placeholder-gray-600 text-gray-900 font-medium"
                  disabled={!selectedChat}
                />
              </div>

              {/* Enhanced Send Button */}
              <button 
                className={`px-6 py-4 rounded-xl font-semibold shadow-md transition-all duration-200 transform ${
                  messageText.trim() || attachments.length > 0 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white hover:scale-105 shadow-lg' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`} 
                onClick={sendMessage}
                disabled={(!messageText.trim() && attachments.length === 0) || !selectedChat}
                title="Send message"
              >
                <div className="flex items-center gap-2">
                  <span>Send</span>
                  <span className="text-lg">➤</span>
                </div>
              </button>
            </div>

            {showEmoji && (
              <div className="mb-2">
                <EmojiPicker onEmojiClick={(emojiObject) => setMessageText((t) => t + emojiObject.emoji)} />
              </div>
            )}

            {attachments.length > 0 && (
              <div className="flex gap-3 mb-2 overflow-auto">
                {attachments.map((a, idx) => (
                  <div key={idx} className="relative">
                    <AttachmentPreview att={a} />
                    <button onClick={() => removeAttachment(idx)} className="absolute top-0 right-0 bg-white rounded-full p-1 text-xs">×</button>
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}

// -- Small UI helper components --
function MessageBubble({ me, message }) {
  const fromMe = message.sender_id === me?.id;
  
  return (
    <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`group relative max-w-[75%] ${fromMe ? 'ml-12' : 'mr-12'}`}>
        {/* Message bubble with tail */}
        <div className={`relative p-4 rounded-3xl shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
          fromMe 
            ? 'bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white rounded-br-md' 
            : 'bg-gradient-to-br from-white via-gray-50 to-blue-50 text-gray-900 border border-gray-200 rounded-bl-md'
        }`}>
          
          {/* Message tail/pointer */}
          <div className={`absolute top-4 w-0 h-0 ${
            fromMe 
              ? 'right-[-8px] border-l-[16px] border-l-indigo-600 border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
              : 'left-[-8px] border-r-[16px] border-r-white border-t-[8px] border-t-transparent border-b-[8px] border-b-transparent'
          }`}></div>
          
          {/* Sender name for received messages */}
          {!fromMe && (
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200">
              <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                {(message.sender_name || 'U')[0]}
              </div>
              <div className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {message.sender_name || 'Unknown'}
              </div>
            </div>
          )}
          
          {/* Message content */}
          <div className={`text-base whitespace-pre-wrap leading-relaxed break-words overflow-wrap-anywhere ${
            fromMe ? 'text-white' : 'text-gray-800 font-medium'
          }`}>
            {message.content}
          </div>
          
          {/* File attachments */}
          {message.file_url && (
            <div className="mt-3 p-3 rounded-2xl bg-black/10 backdrop-blur-sm">
              {renderAttachment({
                url: message.file_url,
                name: message.file_name,
                mime: message.mime_type
              })}
            </div>
          )}
          
          {/* Timestamp and status */}
          <div className={`flex items-center justify-end gap-2 mt-3 pt-2 border-t ${
            fromMe 
              ? 'text-white/70 border-white/20' 
              : 'text-gray-500 border-gray-200'
          }`}>
            <span className="text-xs font-medium">
              {new Date(message.created_at).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
            {fromMe && message.status && (
              <span className="text-xs flex items-center">
                {message.status === 'sending' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-white/70 rounded-full animate-pulse"></div>
                  </div>
                )}
                {message.status === 'sent' && (
                  <span className="text-white/80">✓</span>
                )}
                {message.status === 'delivered' && (
                  <span className="text-white/90">✓✓</span>
                )}
                {message.status === 'read' && (
                  <span className="text-green-300">✓✓</span>
                )}
              </span>
            )}
          </div>
        </div>
        
        {/* Hover effect - subtle glow */}
        <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none ${
          fromMe 
            ? 'bg-gradient-to-br from-indigo-400 to-pink-400 blur-xl' 
            : 'bg-gradient-to-br from-blue-400 to-purple-400 blur-xl'
        }`}></div>
      </div>
    </div>
  );
}

function renderAttachment(att) {
  if (!att) return null;
  const mime = att.mime || (att.url && att.url.split('.').pop());
  
  // Construct full URL for server files
  const getFullUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http')) return url; // Already full URL
    return `http://localhost:5000${url}`; // Add server base URL
  };
  
  if (att.url && (att.mime || '').startsWith('image')) {
    return <img src={getFullUrl(att.url)} alt="img" className="w-48 h-36 object-cover rounded-md" />;
  }
  if (att.url && (att.mime || '').startsWith('video')) {
    return <video src={getFullUrl(att.url)} controls className="w-64 h-40 rounded-md" />;
  }
  return <a href={getFullUrl(att.url)} target="_blank" rel="noreferrer" className="inline-block p-2 border rounded">Download</a>;
}

function CreateGroupButton({ onCreate }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState([]);

  async function searchUsers(q) {
    if (!q) return setSearch([]);
    const res = await fetch(`/api/users?search=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setSearch(data.users || []);
    }
  }

  function toggleMember(u) {
    setMembers((m) => (m.some((x) => x.id === u.id) ? m.filter((x) => x.id !== u.id) : [...m, u]));
  }

  async function createGroup() {
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, members: members.map((m) => m.id) }),
    });
    if (res.ok) {
      const data = await res.json();
      onCreate && onCreate(data.group);
      setOpen(false);
      setName('');
      setMembers([]);
    }
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="mt-3 w-full p-2 rounded bg-green-500 text-white">Create Group</button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
            <h3 className="font-semibold mb-2">Create Group</h3>
            <input className="w-full p-2 border rounded mb-2" placeholder="Group name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="w-full p-2 border rounded mb-2" placeholder="Search people to add" onChange={(e) => searchUsers(e.target.value)} />
            <div className="max-h-32 overflow-auto mb-2">
              {search.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-1">
                  <div>{u.username}</div>
                  <button onClick={() => toggleMember(u)} className="text-sm text-blue-600">{members.some((m) => m.id === u.id) ? 'Remove' : 'Add'}</button>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={() => setOpen(false)}>Cancel</button>
              <button className="px-3 py-1 rounded bg-indigo-600 text-white" onClick={createGroup}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
