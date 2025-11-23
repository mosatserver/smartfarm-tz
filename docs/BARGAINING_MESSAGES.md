# Bargaining Messages - Implementation Guide

## Overview
The bargaining message feature allows users to send messages related to marketplace negotiations without requiring an accepted friendship. This enables buyers to contact sellers directly for price negotiation and product inquiries.

## How It Works

### Problem Solved
Previously, the chat system required users to have an "accepted" friendship status before they could send private messages. This blocked the marketplace bargaining feature where buyers need to contact sellers they may not know personally.

### Solution
The `handleSendMessage` function in `socketService.js` now recognizes bargaining-related messages and bypasses the friendship requirement while maintaining security.

## Usage

### Method 1: Using Message Type 'bargain'
Send a message with `messageType: 'bargain'` to bypass friendship checks:

```javascript
// Frontend Socket.IO client
socket.emit('send_message', {
  chatId: sellerId,           // ID of the seller/recipient
  chatType: 'private',
  content: 'Hi! I saw your tomatoes listing. Would you accept $15/kg?',
  messageType: 'bargain',    // This bypasses friendship check
  tempId: generateTempId()   // For message tracking
});
```

### Method 2: Using Marketplace Post ID
Include `marketplacePostId` in the message data to bypass friendship checks:

```javascript
socket.emit('send_message', {
  chatId: sellerId,          // ID of the seller/recipient  
  chatType: 'private',
  content: 'I\'m interested in your product. Can we discuss pricing?',
  messageType: 'text',       // Can be any type
  marketplacePostId: 123,    // ID of the marketplace post
  tempId: generateTempId()
});
```

### Method 3: Combined Approach
You can use both for maximum clarity:

```javascript
socket.emit('send_message', {
  chatId: sellerId,
  chatType: 'private', 
  content: 'Your organic carrots look great! What\'s your best price for 5kg?',
  messageType: 'bargain',
  marketplacePostId: 456,
  tempId: generateTempId()
});
```

## Integration Examples

### In React Components
```jsx
// MarketplaceProductCard.jsx
const handleContactSeller = (product) => {
  const message = {
    chatId: product.seller_id,
    chatType: 'private',
    content: `Hi! I'm interested in your ${product.name}. Can we discuss the price?`,
    messageType: 'bargain',
    marketplacePostId: product.id,
    tempId: Date.now() + Math.random()
  };
  
  socket.emit('send_message', message);
  
  // Navigate to chat or open chat modal
  navigate(`/chat/private/${product.seller_id}`);
};

return (
  <div className="product-card">
    {/* Product details */}
    <button onClick={() => handleContactSeller(product)}>
      Contact Seller
    </button>
  </div>
);
```

### In Bargain Flow
```jsx
// BargainModal.jsx
const sendBargainOffer = (sellerId, postId, offerPrice) => {
  const message = {
    chatId: sellerId,
    chatType: 'private',
    content: `I'd like to make an offer of $${offerPrice} for your product. Would you accept?`,
    messageType: 'bargain',
    marketplacePostId: postId,
    tempId: generateUniqueId()
  };
  
  socket.emit('send_message', message);
  closeBargainModal();
  openChat(sellerId);
};
```

## Security Features

### What's Protected
1. **User Verification**: Both sender and recipient must be valid users
2. **Post Validation**: If `marketplacePostId` is provided, the system verifies:
   - Post exists in database
   - Post belongs to the message recipient 
3. **Regular Messages**: Non-bargaining messages still require accepted friendship

### What's Allowed
1. **Bargaining Messages**: Messages with `messageType: 'bargain'` bypass friendship checks
2. **Post-Related Messages**: Messages with valid `marketplacePostId` bypass friendship checks
3. **Legitimate Commerce**: Enables buyer-seller communication for marketplace transactions

## Error Handling

### Possible Errors
```javascript
// Listen for message errors
socket.on('message_error', (error) => {
  switch(error.error) {
    case 'Not authorized to send message to this user':
      // Regular message sent to non-friend
      showError('You can only message friends directly. Try using the bargain feature for marketplace inquiries.');
      break;
      
    case 'Invalid users for bargaining message':
      // One or both users don't exist
      showError('Unable to send message. Please try again.');
      break;
      
    case 'Marketplace post not found or not owned by recipient':
      // Invalid post ID or post doesn't belong to recipient
      showError('This product listing is no longer available or invalid.');
      break;
      
    default:
      showError('Failed to send message. Please try again.');
  }
});
```

## Migration Guide

### Updating Existing Code
If you have existing marketplace contact functionality:

**Before:**
```javascript
// This would fail without accepted friendship
socket.emit('send_message', {
  chatId: sellerId,
  chatType: 'private',
  content: message,
  messageType: 'text'
});
```

**After:**
```javascript
// This will work without friendship
socket.emit('send_message', {
  chatId: sellerId,
  chatType: 'private', 
  content: message,
  messageType: 'bargain',        // Add this
  marketplacePostId: postId      // Add this if available
});
```

## Best Practices

### 1. Always Include Context
```javascript
// Good: Clear context about what product
const message = `Hi! I saw your ${productName} listing for $${price}. Would you consider $${myOffer}?`;

// Better: Include post ID for validation
const messageData = {
  content: message,
  messageType: 'bargain',
  marketplacePostId: postId  // Provides context and security
};
```

### 2. Handle State Management
```javascript
// Track bargaining conversations separately
const [bargainChats, setBargainChats] = useState(new Set());

const handleBargainMessage = (sellerId, postId) => {
  setBargainChats(prev => new Set([...prev, sellerId]));
  sendBargainMessage(sellerId, postId);
};
```

### 3. UI Feedback
```javascript
// Show different UI for bargain vs friend chats
const ChatHeader = ({ chatId, isBargainChat }) => (
  <div className="chat-header">
    {isBargainChat ? (
      <span className="bargain-indicator">🤝 Marketplace Negotiation</span>
    ) : (
      <span className="friend-indicator">💬 Friend Chat</span>
    )}
  </div>
);
```

## Testing

### Test Scenarios
1. **Successful Bargain Message**: Should send without friendship
2. **Invalid Post ID**: Should show appropriate error
3. **Regular Message to Non-Friend**: Should be blocked
4. **Post Ownership Validation**: Should verify post belongs to recipient

### Example Test
```javascript
// Test bargain message functionality
const testBargainMessage = () => {
  socket.emit('send_message', {
    chatId: 2,                 // Valid user ID
    chatType: 'private',
    content: 'Test bargain message',
    messageType: 'bargain',
    marketplacePostId: 1       // Valid post ID owned by user 2
  });
  
  // Should receive 'message_sent' event, not 'message_error'
};
```

## Summary

The bargaining message feature enables marketplace functionality by:
- Allowing buyer-seller communication without friendship requirements
- Maintaining security through user and post validation  
- Preserving existing privacy controls for regular messaging
- Supporting flexible implementation through multiple trigger methods

Use `messageType: 'bargain'` or include `marketplacePostId` to enable this functionality in your marketplace features.
