const express = require('express');
const crypto = require('crypto');
const { pool } = require('../config/database');
const paymentService = require('../services/paymentService');

const router = express.Router();

// M-Pesa webhook endpoint
router.post('/mpesa', express.json(), async (req, res) => {
  try {
    console.log('M-Pesa webhook received:', req.body);
    
    const {
      output_ResponseCode,
      output_ResponseDesc,
      output_TransactionID,
      output_ConversationID,
      output_ThirdPartyConversationID
    } = req.body;

    // Validate the webhook (implement signature verification here)
    // const isValid = validateMpesaSignature(req);
    // if (!isValid) {
    //   return res.status(401).json({ success: false, message: 'Invalid signature' });
    // }

    const orderId = output_ThirdPartyConversationID;
    const transactionId = output_TransactionID;
    const status = output_ResponseCode === 'INS-0' ? 'completed' : 'failed';

    // Update transaction status in database
    await pool.execute(
      'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
      [status, transactionId, JSON.stringify(req.body), orderId]
    );

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status === 'completed' ? 'paid' : 'failed', orderId]
    );

    // Send notification to buyer and seller (implement notification service)
    // await notificationService.sendPaymentNotification(orderId, status);

    res.json({ success: true, message: 'Webhook processed successfully' });
  } catch (error) {
    console.error('M-Pesa webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// Tigo Pesa webhook endpoint
router.post('/tigo', express.json(), async (req, res) => {
  try {
    console.log('Tigo Pesa webhook received:', req.body);
    
    const { transactionId, customerReference, status, amount } = req.body;
    
    const orderId = customerReference;
    const paymentStatus = status === 'SUCCESSFUL' ? 'completed' : 'failed';

    await pool.execute(
      'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
      [paymentStatus, transactionId, JSON.stringify(req.body), orderId]
    );

    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [paymentStatus === 'completed' ? 'paid' : 'failed', orderId]
    );

    res.json({ success: true, message: 'Tigo webhook processed successfully' });
  } catch (error) {
    console.error('Tigo Pesa webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// Airtel Money webhook endpoint
router.post('/airtel', express.json(), async (req, res) => {
  try {
    console.log('Airtel Money webhook received:', req.body);
    
    const { transaction } = req.body;
    const orderId = transaction.reference;
    const transactionId = transaction.id;
    const status = transaction.status === 'TS' ? 'completed' : 'failed'; // TS = Transaction Successful

    await pool.execute(
      'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
      [status, transactionId, JSON.stringify(req.body), orderId]
    );

    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status === 'completed' ? 'paid' : 'failed', orderId]
    );

    res.json({ success: true, message: 'Airtel webhook processed successfully' });
  } catch (error) {
    console.error('Airtel Money webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// HaloPesa webhook endpoint
router.post('/halopesa', express.json(), async (req, res) => {
  try {
    console.log('HaloPesa webhook received:', req.body);
    
    // Process HaloPesa specific webhook format
    const { reference, transactionId, status } = req.body;
    const orderId = reference;
    const paymentStatus = status === 'SUCCESS' ? 'completed' : 'failed';

    await pool.execute(
      'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
      [paymentStatus, transactionId, JSON.stringify(req.body), orderId]
    );

    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [paymentStatus === 'completed' ? 'paid' : 'failed', orderId]
    );

    res.json({ success: true, message: 'HaloPesa webhook processed successfully' });
  } catch (error) {
    console.error('HaloPesa webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// T-Pesa webhook endpoint
router.post('/tpesa', express.json(), async (req, res) => {
  try {
    console.log('T-Pesa webhook received:', req.body);
    
    // Process T-Pesa specific webhook format
    const { reference, transactionId, status } = req.body;
    const orderId = reference;
    const paymentStatus = status === 'COMPLETED' ? 'completed' : 'failed';

    await pool.execute(
      'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
      [paymentStatus, transactionId, JSON.stringify(req.body), orderId]
    );

    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [paymentStatus === 'completed' ? 'paid' : 'failed', orderId]
    );

    res.json({ success: true, message: 'T-Pesa webhook processed successfully' });
  } catch (error) {
    console.error('T-Pesa webhook error:', error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// Bank webhook endpoints
router.post('/bank/:bankProvider', express.json(), async (req, res) => {
  try {
    const { bankProvider } = req.params;
    console.log(`${bankProvider} bank webhook received:`, req.body);
    
    // Process bank-specific webhook format
    const { reference, transactionId, status } = req.body;
    const orderId = reference;
    const paymentStatus = status === 'SUCCESS' || status === 'COMPLETED' ? 'completed' : 'failed';

    await pool.execute(
      'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
      [paymentStatus, transactionId, JSON.stringify(req.body), orderId]
    );

    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [paymentStatus === 'completed' ? 'paid' : 'failed', orderId]
    );

    res.json({ success: true, message: `${bankProvider} webhook processed successfully` });
  } catch (error) {
    console.error(`Bank webhook error:`, error);
    res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
});

// Payment status check endpoint
router.get('/status/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const [transactions] = await pool.execute(
      'SELECT * FROM transactions WHERE order_id = ?',
      [orderId]
    );

    if (transactions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    const transaction = transactions[0];
    
    res.json({
      success: true,
      data: {
        orderId: transaction.order_id,
        transactionId: transaction.transaction_id,
        status: transaction.status,
        amount: transaction.amount,
        paymentMethod: transaction.payment_method,
        paymentProvider: transaction.payment_provider,
        paymentReference: transaction.payment_reference,
        createdAt: transaction.created_at,
        updatedAt: transaction.updated_at
      }
    });
  } catch (error) {
    console.error('Payment status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check payment status'
    });
  }
});

// Utility function to validate M-Pesa signature (implement based on M-Pesa documentation)
function validateMpesaSignature(req) {
  // Implement signature validation here
  // This would involve verifying the request signature using M-Pesa's public key
  return true; // Placeholder
}

// Utility function to validate Tigo signature
function validateTigoSignature(req) {
  // Implement Tigo signature validation
  return true; // Placeholder
}

// Pesapal IPN (Instant Payment Notification) endpoint
router.get('/pesapal/ipn', async (req, res) => {
  try {
    console.log('Pesapal IPN received:', req.query);
    
    const {
      pesapal_merchant_reference,
      pesapal_transaction_tracking_id,
      pesapal_notification_type
    } = req.query;
    
    if (pesapal_notification_type === 'CHANGE' && pesapal_merchant_reference) {
      // Get transaction status from Pesapal
      const transactionStatus = await checkPesapalTransactionStatus(
        pesapal_transaction_tracking_id
      );
      
      if (transactionStatus) {
        const orderId = pesapal_merchant_reference;
        const status = transactionStatus.payment_status_description === 'Completed' ? 'completed' : 'failed';
        
        // Update transaction in database
        await pool.execute(
          'UPDATE transactions SET status = ?, payment_reference = ?, payment_details = ? WHERE order_id = ?',
          [status, pesapal_transaction_tracking_id, JSON.stringify(transactionStatus), orderId]
        );
        
        // Update order status
        await pool.execute(
          'UPDATE orders SET status = ? WHERE order_id = ?',
          [status === 'completed' ? 'paid' : 'failed', orderId]
        );
        
        console.log(`Order ${orderId} status updated to ${status}`);
      }
    }
    
    res.status(200).send('OK'); // Pesapal expects a 200 OK response
  } catch (error) {
    console.error('Pesapal IPN error:', error);
    res.status(200).send('OK'); // Still send OK to prevent retry loops
  }
});

// Pesapal callback endpoint (user returns here after payment)
router.get('/pesapal/callback', async (req, res) => {
  try {
    console.log('Pesapal callback received:', req.query);
    
    const {
      pesapal_merchant_reference,
      pesapal_transaction_tracking_id,
      pesapal_status
    } = req.query;
    
    // Redirect user to appropriate page based on payment status
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? process.env.APP_URL
      : 'http://localhost:3000';
      
    if (pesapal_status === '1' || pesapal_status === 'COMPLETED') {
      // Payment successful - redirect to success page
      res.redirect(`${redirectUrl}/payment/success?order=${pesapal_merchant_reference}&tracking=${pesapal_transaction_tracking_id}`);
    } else {
      // Payment failed - redirect to failure page
      res.redirect(`${redirectUrl}/payment/failed?order=${pesapal_merchant_reference}&tracking=${pesapal_transaction_tracking_id}`);
    }
  } catch (error) {
    console.error('Pesapal callback error:', error);
    const redirectUrl = process.env.NODE_ENV === 'production'
      ? process.env.APP_URL
      : 'http://localhost:3000';
    res.redirect(`${redirectUrl}/payment/error`);
  }
});

// Helper function to check Pesapal transaction status
async function checkPesapalTransactionStatus(trackingId) {
  try {
    const paymentService = require('../services/paymentService');
    const accessToken = await paymentService.getPesapalAccessToken();
    
    if (!accessToken) {
      throw new Error('Failed to get Pesapal access token');
    }
    
    const pesapalBaseUrl = process.env.PESAPAL_ENVIRONMENT === 'production'
      ? process.env.PESAPAL_BASE_URL
      : process.env.PESAPAL_SANDBOX_URL;
    
    const response = await axios.get(
      `${pesapalBaseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${trackingId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error checking Pesapal transaction status:', error);
    return null;
  }
}

// Utility function to validate Airtel signature
function validateAirtelSignature(req) {
  // Implement Airtel signature validation
  return true; // Placeholder
}

module.exports = router;
