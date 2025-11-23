const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticateToken } = require('../middleware/authMiddleware');

// POST /api/marketplace/purchase - Process a purchase
router.post('/purchase', authenticateToken, async (req, res) => {
  try {
    const { productId, quantity, paymentMethod, paymentProvider, totalAmount } = req.body;
    const buyerId = req.userId;

    // Validate required fields
    if (!productId || !quantity || !paymentMethod || !paymentProvider || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: productId, quantity, paymentMethod, paymentProvider, totalAmount'
      });
    }

    // Validate payment method
    if (!['bank', 'mobile', 'gateway'].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid payment method. Must be "bank", "mobile", or "gateway"'
      });
    }

    // Validate payment providers
    const bankProviders = ['crdb', 'nmb', 'nbc'];
    const mobileProviders = ['mpesa', 'tigo', 'halopesa', 'airtel', 'tpesa', 'pesapal'];
    const gatewayProviders = ['pesapal'];
    
    if (paymentMethod === 'bank' && !bankProviders.includes(paymentProvider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bank provider. Must be one of: crdb, nmb, nbc'
      });
    }
    
    if (paymentMethod === 'mobile' && !mobileProviders.includes(paymentProvider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid mobile provider. Must be one of: mpesa, tigo, halopesa, airtel, tpesa, pesapal'
      });
    }
    
    if (paymentMethod === 'gateway' && !gatewayProviders.includes(paymentProvider)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid gateway provider. Must be one of: pesapal'
      });
    }

    // Check if product exists and get seller info
    const [productRows] = await pool.execute(`
      SELECT p.*, u.id as seller_id, u.email as seller_email, u.first_name as seller_name
      FROM marketplace_posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `, [productId]);
    
    if (productRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const product = productRows[0];

    // Check if buyer is trying to buy their own product
    if (product.seller_id === buyerId) {
      return res.status(400).json({
        success: false,
        message: 'You cannot purchase your own product'
      });
    }

    // Note: Since marketplace_posts doesn't have quantity field in the schema,
    // we'll skip quantity validation for now
    // TODO: Add quantity field to marketplace_posts table

    // Validate total amount (using the price from marketplace_posts)
    const expectedTotal = parseFloat(product.price) * quantity;
    if (Math.abs(totalAmount - expectedTotal) > 0.01) {
      return res.status(400).json({
        success: false,
        message: `Total amount does not match product price × quantity. Expected: ${expectedTotal}`
      });
    }

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Insert order into database
    await pool.execute(`
      INSERT INTO orders (
        order_id, buyer_id, seller_id, product_id, quantity, unit_price, 
        total_amount, payment_method, payment_provider, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      orderId, buyerId, product.seller_id, productId, quantity, 
      product.price, totalAmount, paymentMethod, paymentProvider
    ]);

    // Insert transaction record
    await pool.execute(`
      INSERT INTO transactions (
        transaction_id, order_id, buyer_id, seller_id, amount, 
        payment_method, payment_provider, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `, [
      transactionId, orderId, buyerId, product.seller_id, totalAmount,
      paymentMethod, paymentProvider
    ]);

    // Get payment instructions based on method and provider
    const paymentInstructions = generatePaymentInstructions(
      paymentMethod, 
      paymentProvider, 
      totalAmount, 
      orderId,
      product.seller_name
    );

    res.json({
      success: true,
      message: 'Purchase order created successfully',
      data: {
        orderId,
        transactionId,
        productTitle: product.title,
        quantity,
        totalAmount,
        paymentMethod,
        paymentProvider,
        paymentInstructions,
        sellerName: product.seller_name,
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during purchase processing'
    });
  }
});

// GET /api/marketplace/orders - Get user's orders
router.get('/orders', authenticateToken, async (req, res) => {
  try {
    const userId = req.userId;
    const { type = 'all' } = req.query; // 'all', 'purchases', 'sales'

    let query = `
      SELECT 
        o.*,
        p.title as product_title,
        p.image_url as product_image,
        buyer.first_name as buyer_name,
        buyer.email as buyer_email,
        seller.first_name as seller_name,
        seller.email as seller_email,
        t.transaction_id,
        t.status as transaction_status
      FROM orders o
      JOIN marketplace_posts p ON o.product_id = p.id
      JOIN users buyer ON o.buyer_id = buyer.id
      JOIN users seller ON o.seller_id = seller.id
      LEFT JOIN transactions t ON o.order_id = t.order_id
      WHERE 1=1
    `;

    const params = [];

    if (type === 'purchases') {
      query += ' AND o.buyer_id = ?';
      params.push(userId);
    } else if (type === 'sales') {
      query += ' AND o.seller_id = ?';
      params.push(userId);
    } else {
      query += ' AND (o.buyer_id = ? OR o.seller_id = ?)';
      params.push(userId, userId);
    }

    query += ' ORDER BY o.created_at DESC';

    const [orders] = await pool.execute(query, params);

    res.json({
      success: true,
      orders: orders.map(order => ({
        ...order,
        userRole: order.buyer_id === userId ? 'buyer' : 'seller'
      }))
    });

  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders'
    });
  }
});

// PUT /api/marketplace/orders/:orderId/status - Update order status
router.put('/orders/:orderId/status', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status } = req.body;
    const userId = req.userId;

    const validStatuses = ['pending', 'paid', 'confirmed', 'shipped', 'delivered', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if user is involved in this order
    const [orderCheckRows] = await pool.execute(
      'SELECT * FROM orders WHERE order_id = ? AND (buyer_id = ? OR seller_id = ?)',
      [orderId, userId, userId]
    );

    if (orderCheckRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found or access denied'
      });
    }

    // Update order status
    await pool.execute(
      'UPDATE orders SET status = ? WHERE order_id = ?',
      [status, orderId]
    );

    // Update transaction status if it's a payment-related status
    if (['paid', 'completed', 'cancelled'].includes(status)) {
      await pool.execute(
        'UPDATE transactions SET status = ? WHERE order_id = ?',
        [status, orderId]
      );
    }

    res.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Order status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Helper function to generate payment instructions
function generatePaymentInstructions(paymentMethod, paymentProvider, amount, orderId, sellerName) {
  const formattedAmount = amount.toLocaleString('en-US');
  
  if (paymentMethod === 'bank') {
    const bankDetails = {
      crdb: {
        name: 'CRDB Bank PLC',
        accountNumber: 'To be configured with real account',
        swiftCode: 'CORUTZTZ',
        branch: 'Dar es Salaam',
        website: 'https://www.crdbbank.co.tz',
        apiEndpoint: 'https://api.crdbbank.co.tz/payments' // Example API endpoint
      },
      nmb: {
        name: 'NMB Bank PLC',
        accountNumber: 'To be configured with real account',
        swiftCode: 'NMIBTZTZ',
        branch: 'Dar es Salaam',
        website: 'https://www.nmbbank.co.tz',
        apiEndpoint: 'https://api.nmbbank.co.tz/payments'
      },
      nbc: {
        name: 'National Bank of Commerce (NBC)',
        accountNumber: 'To be configured with real account',
        swiftCode: 'NLCBTZTZ',
        branch: 'Dar es Salaam',
        website: 'https://www.nbctz.com',
        apiEndpoint: 'https://api.nbctz.com/payments'
      }
    };

    const bank = bankDetails[paymentProvider];
    return {
      type: 'bank',
      provider: bank.name,
      instructions: [
        `Transfer TZS ${formattedAmount} to the following account:`,
        `Bank: ${bank.name}`,
        `Account Number: ${bank.accountNumber}`,
        `Account Name: SmartFarm Tanzania Ltd`,
        `Branch: ${bank.branch}`,
        `SWIFT Code: ${bank.swiftCode}`,
        `Reference: ${orderId}`,
        `Purpose: Agricultural Product Purchase`,
        '',
        'Payment Methods:',
        '• Internet Banking via ' + bank.website,
        '• Mobile Banking App',
        '• ATM Transfer',
        '• Branch Visit',
        '',
        'Important:',
        '• Include the exact order reference: ' + orderId,
        '• Payment confirmation will be sent via SMS',
        '• Contact +255 XXX XXX XXX for payment support',
        '• Funds are held in escrow until delivery confirmation'
      ],
      apiEndpoint: bank.apiEndpoint
    };
  } else {
    const mobileDetails = {
      mpesa: {
        name: 'Vodacom M-Pesa',
        shortCode: '*150*00#',
        paybill: '000000', // This needs to be registered with Vodacom
        tillNumber: '000000', // Alternative till number
        apiKey: process.env.MPESA_API_KEY,
        apiSecret: process.env.MPESA_API_SECRET,
        apiEndpoint: 'https://openapi.m-pesa.com/sandbox/ipg/v2/vodacomTZN/c2bPayment/singleStage/',
        website: 'https://www.vodacom.co.tz/mpesa'
      },
      tigo: {
        name: 'Tigo Pesa',
        shortCode: '*150*01#',
        paybill: '000000', // Needs to be registered
        apiKey: process.env.TIGO_API_KEY,
        apiSecret: process.env.TIGO_API_SECRET,
        apiEndpoint: 'https://api.tigo.co.tz/v1/tigo-pesa/payments',
        website: 'https://www.tigo.co.tz/tigopesa'
      },
      halopesa: {
        name: 'Halotel HaloPesa',
        shortCode: '*150*88#',
        paybill: '000000', // Needs to be registered
        apiKey: process.env.HALOPESA_API_KEY,
        apiSecret: process.env.HALOPESA_API_SECRET,
        apiEndpoint: 'https://api.halotel.co.tz/halopesa/payments',
        website: 'https://www.halotel.co.tz/halopesa'
      },
      airtel: {
        name: 'Airtel Money',
        shortCode: '*150*60#',
        paybill: '000000', // Needs to be registered
        apiKey: process.env.AIRTEL_API_KEY,
        apiSecret: process.env.AIRTEL_API_SECRET,
        apiEndpoint: 'https://openapi.airtel.africa/merchant/v1/payments/',
        website: 'https://www.airtel.co.tz/airtelmoney'
      },
      tpesa: {
        name: 'TTCL T-Pesa',
        shortCode: '*150*71#',
        paybill: '000000', // Needs to be registered
        apiKey: process.env.TPESA_API_KEY,
        apiSecret: process.env.TPESA_API_SECRET,
        apiEndpoint: 'https://api.ttcl.co.tz/tpesa/payments',
        website: 'https://www.ttcl.co.tz/tpesa'
      },
      pesapal: {
        name: 'Pesapal Payment Gateway',
        website: 'https://www.pesapal.com',
        apiEndpoint: process.env.PESAPAL_ENVIRONMENT === 'production' ? process.env.PESAPAL_BASE_URL : process.env.PESAPAL_SANDBOX_URL,
        consumerKey: process.env.PESAPAL_CONSUMER_KEY,
        environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox'
      }
    };

    const mobile = mobileDetails[paymentProvider];
    
    // Special handling for Pesapal gateway
    if (paymentProvider === 'pesapal') {
      return {
        type: 'gateway',
        provider: mobile.name,
        instructions: [
          `Pay TZS ${formattedAmount} using ${mobile.name}:`,
          '',
          'Payment Methods Available:',
          '• Mobile Money: M-Pesa, Tigo Pesa, Airtel Money',
          '• Credit/Debit Cards: Visa, MasterCard',
          '• Bank Transfers: Direct bank payments',
          '• PayPal: International payments',
          '',
          'How to Pay:',
          '1. Click "Pay Now" button to open Pesapal payment page',
          '2. Choose your preferred payment method',
          '3. Enter payment details (phone number, card details, etc.)',
          '4. Confirm payment with PIN/Password',
          '5. You will receive SMS/Email confirmation',
          '',
          'Order Details:',
          `• Reference: ${orderId}`,
          `• Amount: TZS ${formattedAmount}`,
          `• Seller: ${sellerName}`,
          '',
          'Important Notes:',
          '• Secure SSL encrypted payment processing',
          '• Supports all major payment methods in Tanzania',
          '• Transaction fees may apply as per your payment method',
          '• Payment is processed in real-time',
          '• Funds are held securely until delivery confirmation',
          `• Environment: ${mobile.environment}`,
          '• For support: support@pesapal.com or +254 709 313 900'
        ],
        apiEndpoint: mobile.apiEndpoint,
        consumerKey: mobile.consumerKey,
        environment: mobile.environment,
        paymentUrl: `${mobile.apiEndpoint}/api/PostPesapalDirectOrderV4`,
        callbackUrl: process.env.PESAPAL_CALLBACK_URL,
        ipnUrl: process.env.PESAPAL_IPN_URL
      };
    }
    
    // Regular mobile money provider instructions
    return {
      type: 'mobile',
      provider: mobile.name,
      instructions: [
        `Pay TZS ${formattedAmount} using ${mobile.name}:`,
        '',
        'Method 1 - USSD Code:',
        `• Dial ${mobile.shortCode}`,
        '• Select "Pay Bills" or "Lipa Bills"',
        `• Enter Business Number: ${mobile.paybill}`,
        `• Enter Reference: ${orderId}`,
        `• Enter Amount: ${formattedAmount}`,
        '• Enter your PIN to confirm',
        '',
        'Method 2 - Mobile App:',
        `• Open ${mobile.name} mobile app`,
        '• Go to "Pay Bills" or "Payments"',
        `• Select "Pay Bill" and enter: ${mobile.paybill}`,
        `• Reference Number: ${orderId}`,
        `• Amount: TZS ${formattedAmount}`,
        '• Confirm with PIN',
        '',
        'Method 3 - Agent:',
        '• Visit any authorized agent',
        '• Provide your phone number and PIN',
        `• Give reference: ${orderId}`,
        `• Pay TZS ${formattedAmount} + agent fee`,
        '',
        'Important Notes:',
        '• You will receive SMS confirmation',
        '• Transaction fee may apply as per operator rates',
        '• Keep your transaction ID for reference',
        '• Payment is processed in real-time',
        `• Seller ${sellerName} will be notified automatically`,
        '• For support, call your mobile network customer care'
      ],
      apiEndpoint: mobile.apiEndpoint,
      apiKey: mobile.apiKey
    };
  }
}

// GET /api/marketplace/payment-providers - Get available payment providers
router.get('/payment-providers', (req, res) => {
  try {
    const paymentProviders = {
      bank: [
        {
          id: 'crdb',
          name: 'CRDB Bank PLC',
          description: 'Tanzania\'s largest bank by assets',
          icon: 'bank',
          logo: 'https://www.crdbbank.co.tz/assets/images/logo.png',
          logoAlt: '/api/images/logos/crdb-logo.svg', // Fallback local logo
          brandColor: '#1f4e79',
          website: 'https://www.crdbbank.co.tz',
          supported: true
        },
        {
          id: 'nmb',
          name: 'NMB Bank PLC',
          description: 'National Microfinance Bank',
          icon: 'bank',
          logo: 'https://www.nmbbank.co.tz/assets/images/nmb-logo.png',
          logoAlt: '/api/images/logos/nmb-logo.svg',
          brandColor: '#e31e24',
          website: 'https://www.nmbbank.co.tz',
          supported: true
        },
        {
          id: 'nbc',
          name: 'NBC Bank',
          description: 'National Bank of Commerce',
          icon: 'bank',
          logo: 'https://www.nbctz.com/assets/images/nbc-logo.png',
          logoAlt: '/api/images/logos/nbc-logo.svg',
          brandColor: '#0066cc',
          website: 'https://www.nbctz.com',
          supported: true
        }
      ],
      mobile: [
        {
          id: 'mpesa',
          name: 'Vodacom M-Pesa',
          description: 'Leading mobile money service in Tanzania',
          icon: 'mobile',
          logo: 'https://www.vodacom.co.tz/content/dam/vodacom/images/mpesa-logo.png',
          logoAlt: '/api/images/logos/mpesa-logo.svg',
          brandColor: '#e60000',
          accentColor: '#ffffff',
          website: 'https://www.vodacom.co.tz/mpesa',
          supported: true,
          shortCode: '*150*00#',
          features: ['USSD Payment', 'Mobile App', 'Agent Network']
        },
        {
          id: 'tigo',
          name: 'Tigo Pesa',
          description: 'Tigo\'s mobile money platform',
          icon: 'mobile',
          logo: 'https://www.tigo.co.tz/sites/default/files/tigo-pesa-logo.png',
          logoAlt: '/api/images/logos/tigo-logo.svg',
          brandColor: '#00a0df',
          accentColor: '#ffffff',
          website: 'https://www.tigo.co.tz/tigopesa',
          supported: true,
          shortCode: '*150*01#',
          features: ['USSD Payment', 'Mobile App', 'Agent Network']
        },
        {
          id: 'airtel',
          name: 'Airtel Money',
          description: 'Airtel\'s mobile money service',
          icon: 'mobile',
          logo: 'https://www.airtel.co.tz/assets/images/airtel-money-logo.png',
          logoAlt: '/api/images/logos/airtel-logo.svg',
          brandColor: '#ff0000',
          accentColor: '#ffffff',
          website: 'https://www.airtel.co.tz/airtelmoney',
          supported: true,
          shortCode: '*150*60#',
          features: ['USSD Payment', 'Mobile App', 'Agent Network']
        },
        {
          id: 'halopesa',
          name: 'Halotel HaloPesa',
          description: 'Halotel\'s mobile money service',
          icon: 'mobile',
          logo: 'https://www.halotel.co.tz/assets/images/halopesa-logo.png',
          logoAlt: '/api/images/logos/halopesa-logo.svg',
          brandColor: '#ff6600',
          accentColor: '#ffffff',
          website: 'https://www.halotel.co.tz/halopesa',
          supported: false,
          shortCode: '*150*88#',
          note: 'Integration pending',
          features: ['USSD Payment', 'Agent Network']
        },
        {
          id: 'tpesa',
          name: 'TTCL T-Pesa',
          description: 'TTCL\'s mobile money platform',
          icon: 'mobile',
          logo: 'https://www.ttcl.co.tz/assets/images/tpesa-logo.png',
          logoAlt: '/api/images/logos/tpesa-logo.svg',
          brandColor: '#004d9f',
          accentColor: '#ffffff',
          website: 'https://www.ttcl.co.tz/tpesa',
          supported: false,
          shortCode: '*150*71#',
          note: 'Integration pending',
          features: ['USSD Payment', 'Agent Network']
        }
      ],
      gateway: [
        {
          id: 'pesapal',
          name: 'Pesapal Payment Gateway',
          description: 'Secure payment gateway with multiple payment options',
          icon: 'gateway',
          logo: 'https://www.pesapal.com/sites/default/files/pesapal-logo.png',
          logoAlt: '/api/images/logos/pesapal-logo.svg',
          brandColor: '#1e88e5',
          accentColor: '#ffffff',
          website: 'https://www.pesapal.com',
          supported: true,
          environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox',
          features: [
            'M-Pesa, Tigo Pesa, Airtel Money',
            'Visa & MasterCard',
            'Direct Bank Transfer',
            'PayPal International',
            'SSL Encrypted',
            'Real-time Processing',
            'Multi-currency Support',
            'Fraud Protection'
          ],
          supportedPaymentMethods: [
            {
              type: 'mobile_money',
              providers: ['M-Pesa', 'Tigo Pesa', 'Airtel Money'],
              icon: 'mobile'
            },
            {
              type: 'cards',
              providers: ['Visa', 'MasterCard'],
              icon: 'credit-card'
            },
            {
              type: 'bank_transfer',
              providers: ['Direct Bank Transfer'],
              icon: 'bank'
            },
            {
              type: 'international',
              providers: ['PayPal'],
              icon: 'globe'
            }
          ]
        }
      ]
    };

    res.json({
      success: true,
      paymentProviders,
      message: 'Available payment providers retrieved successfully'
    });

  } catch (error) {
    console.error('Payment providers fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment providers'
    });
  }
});

module.exports = router;
