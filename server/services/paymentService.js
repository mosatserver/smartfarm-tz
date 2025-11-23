const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

class PaymentService {
  constructor() {
    // Initialize API configurations for real payment gateways
    this.configs = {
      // Vodacom M-Pesa Configuration
      mpesa: {
        baseUrl: process.env.MPESA_BASE_URL || 'https://openapi.m-pesa.com',
        apiKey: process.env.MPESA_API_KEY,
        publicKey: process.env.MPESA_PUBLIC_KEY,
        serviceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE,
        initiatorIdentifier: process.env.MPESA_INITIATOR_IDENTIFIER,
        securityCredential: process.env.MPESA_SECURITY_CREDENTIAL,
        environment: process.env.MPESA_ENVIRONMENT || 'sandbox' // 'sandbox' or 'production'
      },
      
      // Tigo Pesa Configuration
      tigo: {
        baseUrl: process.env.TIGO_BASE_URL || 'https://api.tigo.co.tz',
        clientId: process.env.TIGO_CLIENT_ID,
        clientSecret: process.env.TIGO_CLIENT_SECRET,
        username: process.env.TIGO_USERNAME,
        password: process.env.TIGO_PASSWORD,
        biller: process.env.TIGO_BILLER_CODE
      },
      
      // Airtel Money Configuration
      airtel: {
        baseUrl: process.env.AIRTEL_BASE_URL || 'https://openapi.airtel.africa',
        clientId: process.env.AIRTEL_CLIENT_ID,
        clientSecret: process.env.AIRTEL_CLIENT_SECRET,
        xCountry: 'TZ',
        xCurrency: 'TZS'
      },
      
      // HaloPesa Configuration
      halopesa: {
        baseUrl: process.env.HALOPESA_BASE_URL || 'https://api.halotel.co.tz',
        username: process.env.HALOPESA_USERNAME,
        password: process.env.HALOPESA_PASSWORD,
        shortcode: process.env.HALOPESA_SHORTCODE
      },
      
      // T-Pesa Configuration (TTCL)
      tpesa: {
        baseUrl: process.env.TPESA_BASE_URL || 'https://api.ttcl.co.tz',
        username: process.env.TPESA_USERNAME,
        password: process.env.TPESA_PASSWORD,
        shortcode: process.env.TPESA_SHORTCODE
      },
      
      // Pesapal Gateway Configuration
      pesapal: {
        baseUrl: process.env.PESAPAL_ENVIRONMENT === 'production' ? process.env.PESAPAL_BASE_URL : process.env.PESAPAL_SANDBOX_URL,
        consumerKey: process.env.PESAPAL_CONSUMER_KEY,
        consumerSecret: process.env.PESAPAL_CONSUMER_SECRET,
        environment: process.env.PESAPAL_ENVIRONMENT || 'sandbox',
        ipnUrl: process.env.PESAPAL_IPN_URL,
        callbackUrl: process.env.PESAPAL_CALLBACK_URL
      },
      
      // Bank Configurations
      banks: {
        crdb: {
          baseUrl: process.env.CRDB_BASE_URL,
          clientId: process.env.CRDB_CLIENT_ID,
          clientSecret: process.env.CRDB_CLIENT_SECRET,
          accountNumber: process.env.CRDB_ACCOUNT_NUMBER
        },
        nmb: {
          baseUrl: process.env.NMB_BASE_URL,
          clientId: process.env.NMB_CLIENT_ID,
          clientSecret: process.env.NMB_CLIENT_SECRET,
          accountNumber: process.env.NMB_ACCOUNT_NUMBER
        },
        nbc: {
          baseUrl: process.env.NBC_BASE_URL,
          clientId: process.env.NBC_CLIENT_ID,
          clientSecret: process.env.NBC_CLIENT_SECRET,
          accountNumber: process.env.NBC_ACCOUNT_NUMBER
        }
      }
    };
  }

  // Generate authentication token for M-Pesa
  async getMpesaAuthToken() {
    try {
      const auth = Buffer.from(`${this.configs.mpesa.apiKey}:`).toString('base64');
      
      const response = await axios.get(`${this.configs.mpesa.baseUrl}/sandbox/ipg/v2/vodacomTZN/getSession/`, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Origin': '*'
        }
      });
      
      return response.data.output_SessionID;
    } catch (error) {
      console.error('M-Pesa auth error:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with M-Pesa');
    }
  }

  // Process M-Pesa payment
  async processMpesaPayment(paymentData) {
    try {
      const sessionId = await this.getMpesaAuthToken();
      
      const payload = {
        input_Amount: paymentData.amount,
        input_CustomerMSISDN: paymentData.phoneNumber,
        input_Country: 'TZN',
        input_Currency: 'TZS',
        input_ServiceProviderCode: this.configs.mpesa.serviceProviderCode,
        input_TransactionReference: paymentData.reference,
        input_ThirdPartyConversationID: paymentData.orderId,
        input_PurchasedItemsDesc: paymentData.description || 'SmartFarm Product Purchase'
      };

      const response = await axios.post(
        `${this.configs.mpesa.baseUrl}/sandbox/ipg/v2/vodacomTZN/c2bPayment/singleStage/`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${sessionId}`,
            'Content-Type': 'application/json',
            'Origin': '*'
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.output_TransactionID,
        conversationId: response.data.output_ConversationID,
        responseCode: response.data.output_ResponseCode,
        responseDesc: response.data.output_ResponseDesc
      };
    } catch (error) {
      console.error('M-Pesa payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.output_ResponseDesc || 'Payment failed'
      };
    }
  }

  // Process Tigo Pesa payment
  async processTigoPayment(paymentData) {
    try {
      // First, get access token
      const authResponse = await axios.post(`${this.configs.tigo.baseUrl}/v1/oauth/token`, {
        grant_type: 'client_credentials'
      }, {
        auth: {
          username: this.configs.tigo.clientId,
          password: this.configs.tigo.clientSecret
        }
      });

      const accessToken = authResponse.data.access_token;

      const payload = {
        biller: this.configs.tigo.biller,
        customerReference: paymentData.orderId,
        amount: paymentData.amount,
        currency: 'TZS',
        description: paymentData.description || 'SmartFarm Product Purchase',
        customerMsisdn: paymentData.phoneNumber
      };

      const response = await axios.post(
        `${this.configs.tigo.baseUrl}/v1/tigo-pesa/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: response.data.status
      };
    } catch (error) {
      console.error('Tigo Pesa payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Payment failed'
      };
    }
  }

  // Process Airtel Money payment
  async processAirtelPayment(paymentData) {
    try {
      // Get access token
      const authResponse = await axios.post(`${this.configs.airtel.baseUrl}/auth/oauth2/token`, {
        client_id: this.configs.airtel.clientId,
        client_secret: this.configs.airtel.clientSecret,
        grant_type: 'client_credentials'
      });

      const accessToken = authResponse.data.access_token;

      const payload = {
        reference: paymentData.orderId,
        subscriber: {
          country: this.configs.airtel.xCountry,
          currency: this.configs.airtel.xCurrency,
          msisdn: paymentData.phoneNumber
        },
        transaction: {
          amount: paymentData.amount,
          country: this.configs.airtel.xCountry,
          currency: this.configs.airtel.xCurrency,
          id: paymentData.orderId
        }
      };

      const response = await axios.post(
        `${this.configs.airtel.baseUrl}/merchant/v1/payments/`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Country': this.configs.airtel.xCountry,
            'X-Currency': this.configs.airtel.xCurrency
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.data.transaction.id,
        status: response.data.data.transaction.status
      };
    } catch (error) {
      console.error('Airtel Money payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Payment failed'
      };
    }
  }

  // Process Pesapal payment with proper OAuth implementation
  async processPesapalPayment(paymentData) {
    try {
      // Generate unique tracking ID
      const trackingId = `PSL-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      
      // Step 1: Get OAuth access token
      const accessToken = await this.getPesapalAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get Pesapal access token');
      }
      
      // Step 2: Register IPN URL (if not already registered)
      const ipnId = await this.registerPesapalIPN(accessToken);
      
      // Step 3: Submit payment request
      const paymentRequest = {
        id: paymentData.orderId,
        currency: 'TZS',
        amount: paymentData.amount,
        description: paymentData.description || 'SmartFarm Product Purchase',
        callback_url: this.configs.pesapal.callbackUrl,
        notification_id: ipnId,
        billing_address: {
          email_address: paymentData.email || 'customer@smartfarm.co.tz',
          phone_number: paymentData.phoneNumber || '',
          country_code: 'TZ',
          first_name: paymentData.firstName || 'Customer',
          last_name: paymentData.lastName || 'Name'
        }
      };
      
      const response = await axios.post(
        `${this.configs.pesapal.baseUrl}/api/Transactions/SubmitOrderRequest`,
        paymentRequest,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      if (response.data && response.data.redirect_url) {
        return {
          success: true,
          paymentUrl: response.data.redirect_url,
          trackingId: response.data.order_tracking_id,
          orderId: paymentData.orderId,
          merchant_reference: response.data.merchant_reference,
          message: 'Payment initiated successfully with Pesapal',
          instructions: 'Redirect user to complete payment'
        };
      } else {
        throw new Error('Invalid response from Pesapal API');
      }
      
    } catch (error) {
      console.error('Pesapal payment error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.error?.message || error.message || 'Pesapal payment failed'
      };
    }
  }
  
  // Get Pesapal OAuth access token
  async getPesapalAccessToken() {
    try {
      const response = await axios.post(
        `${this.configs.pesapal.baseUrl}/api/Auth/RequestToken`,
        {
          consumer_key: this.configs.pesapal.consumerKey,
          consumer_secret: this.configs.pesapal.consumerSecret
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data?.token;
    } catch (error) {
      console.error('Pesapal auth error:', error.response?.data || error.message);
      return null;
    }
  }
  
  // Register IPN URL with Pesapal
  async registerPesapalIPN(accessToken) {
    try {
      const response = await axios.post(
        `${this.configs.pesapal.baseUrl}/api/URLSetup/RegisterIPN`,
        {
          url: this.configs.pesapal.ipnUrl,
          ipn_notification_type: 'GET'
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      return response.data?.ipn_id || 'default-ipn-id';
    } catch (error) {
      console.error('Pesapal IPN registration error:', error.response?.data || error.message);
      // Return a default IPN ID if registration fails (might already be registered)
      return 'default-ipn-id';
    }
  }

  // Process bank transfer
  async processBankTransfer(paymentData, bankProvider) {
    try {
      const bankConfig = this.configs.banks[bankProvider];
      if (!bankConfig) {
        throw new Error(`Bank ${bankProvider} not configured`);
      }

      // This is a placeholder for bank API integration
      // Each bank will have different API endpoints and requirements
      const payload = {
        amount: paymentData.amount,
        currency: 'TZS',
        reference: paymentData.orderId,
        description: paymentData.description || 'SmartFarm Product Purchase',
        accountNumber: bankConfig.accountNumber
      };

      // Example API call (this would be different for each bank)
      const response = await axios.post(
        `${bankConfig.baseUrl}/payments`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${bankConfig.clientSecret}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: response.data.status
      };
    } catch (error) {
      console.error(`${bankProvider} bank transfer error:`, error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data?.message || 'Bank transfer failed'
      };
    }
  }

  // Main payment processing function
  async processPayment(paymentData) {
    const { paymentMethod, paymentProvider, amount, orderId, phoneNumber, description } = paymentData;

    const processData = {
      amount,
      orderId,
      phoneNumber,
      reference: orderId,
      description
    };

    try {
      let result;

      if (paymentMethod === 'mobile') {
        switch (paymentProvider) {
          case 'mpesa':
            result = await this.processMpesaPayment(processData);
            break;
          case 'tigo':
            result = await this.processTigoPayment(processData);
            break;
          case 'airtel':
            result = await this.processAirtelPayment(processData);
            break;
          case 'halopesa':
            // HaloPesa integration would go here
            result = { success: false, error: 'HaloPesa integration pending' };
            break;
          case 'tpesa':
            // T-Pesa integration would go here
            result = { success: false, error: 'T-Pesa integration pending' };
            break;
          case 'pesapal':
            result = await this.processPesapalPayment(processData);
            break;
          default:
            result = { success: false, error: 'Unsupported mobile payment provider' };
        }
      } else if (paymentMethod === 'bank') {
        result = await this.processBankTransfer(processData, paymentProvider);
      } else if (paymentMethod === 'gateway') {
        switch (paymentProvider) {
          case 'pesapal':
            result = await this.processPesapalPayment(processData);
            break;
          default:
            result = { success: false, error: 'Unsupported payment gateway' };
        }
      } else {
        result = { success: false, error: 'Unsupported payment method' };
      }

      return result;
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: 'Payment processing failed'
      };
    }
  }

  // Check payment status
  async checkPaymentStatus(transactionId, paymentProvider) {
    try {
      // Implementation would depend on each provider's status check API
      // This is a placeholder
      return {
        success: true,
        status: 'pending',
        transactionId
      };
    } catch (error) {
      console.error('Payment status check error:', error);
      return {
        success: false,
        error: 'Status check failed'
      };
    }
  }

  // Get payment providers with comprehensive information and proper logos
  getPaymentProviders() {
    const baseLogoPath = '/api/images/logos';
    
    const providers = {
      mobile: [
        {
          id: 'mpesa',
          name: 'M-Pesa',
          logo: `${baseLogoPath}/mpesa-logo.svg`,
          logoAlt: '/images/logos/mpesa-logo.svg',
          country: 'TZ',
          description: 'M-Pesa - Quick, safe and reliable',
          supported: !!this.configs.mpesa.apiKey,
          features: ['Instant Payments', 'Mobile Wallet', 'Bill Payments', 'Person-to-Person'],
          processingTime: 'Instant'
        },
        {
          id: 'tigo',
          name: 'Tigo Pesa',
          logo: `${baseLogoPath}/tigo-logo-updated.svg`,
          logoAlt: '/images/logos/tigo-logo-updated.svg',
          country: 'TZ',
          description: 'Tigo Pesa - Fast and secure mobile payments',
          shortCode: '*150*01#',
          supported: !!this.configs.tigo.clientId,
          features: ['Mobile Money', 'Bill Pay', 'Merchant Services'],
          processingTime: 'Instant'
        },
        {
          id: 'airtel',
          name: 'Airtel Money',
          logo: `${baseLogoPath}/airtel-logo-updated.svg`,
          logoAlt: '/images/logos/airtel-logo-updated.svg',
          country: 'TZ',
          description: 'Airtel Money - Simple, fast and secure mobile money',
          shortCode: '*150*60#',
          supported: !!this.configs.airtel.clientId,
          features: ['Money Transfer', 'Airtime', 'Bills'],
          processingTime: 'Instant'
        },
        {
          id: 'halopesa',
          name: 'HaloPesa',
          logo: `${baseLogoPath}/halopesa-logo-updated.svg`,
          logoAlt: '/images/logos/halopesa-logo-updated.svg',
          country: 'TZ',
          description: 'HaloPesa - Halotel\'s mobile money solution',
          shortCode: '*150*88#',
          supported: !!this.configs.halopesa.username,
          features: ['Mobile Payments', 'Money Transfer'],
          processingTime: 'Instant'
        },
        {
          id: 'tpesa',
          name: 'T-Pesa',
          logo: `${baseLogoPath}/tpesa-logo-updated.svg`,
          logoAlt: '/images/logos/tpesa-logo-updated.svg',
          country: 'TZ',
          description: 'T-Pesa - TTCL\'s mobile financial services',
          shortCode: '*150*71#',
          supported: !!this.configs.tpesa.username,
          features: ['Mobile Money', 'Bill Payments', 'Airtime Top-up'],
          processingTime: 'Instant'
        },
      ],
      bank: [
        {
          id: 'crdb',
          name: 'CRDB Bank',
          logo: `${baseLogoPath}/crdb-logo-updated.svg`,
          logoAlt: '/images/logos/crdb-logo-updated.svg',
          country: 'TZ',
          description: 'CRDB Bank PLC - The bank that listens',
          supported: !!this.configs.banks.crdb.clientId,
          features: ['Bank Transfer', 'Corporate Banking', 'Online Banking', 'Mobile Banking'],
          processingTime: '1-2 business days'
        },
        {
          id: 'nbc',
          name: 'NBC Bank',
          logo: `${baseLogoPath}/nbc-logo-updated.svg`,
          logoAlt: '/images/logos/nbc-logo-updated.svg',
          country: 'TZ',
          description: 'National Bank of Commerce - Your reliable partner',
          supported: !!this.configs.banks.nbc.clientId,
          features: ['Bank Transfer', 'Corporate Banking', 'ATM Banking', 'Digital Banking'],
          processingTime: '1-2 business days'
        },
        {
          id: 'nmb',
          name: 'NMB Bank',
          logo: `${baseLogoPath}/nmb-logo-updated.svg`,
          logoAlt: '/images/logos/nmb-logo-updated.svg',
          country: 'TZ',
          description: 'NMB Bank - Your Partner in Progress',
          supported: !!this.configs.banks.nmb.clientId,
          features: ['Corporate Banking', 'Retail Banking', 'Digital Services', 'International Banking'],
          processingTime: '1-2 business days'
        },
      ],
      gateway: [
        {
          id: 'pesapal',
          name: 'Pesapal',
          logo: `${baseLogoPath}/pesapal-logo-enhanced.svg`,
          logoAlt: '/images/logos/pesapal-logo-enhanced.svg',
          country: 'TZ',
          description: 'Pesapal - Secure online payments for everyone',
          supported: !!this.configs.pesapal.consumerKey,
          features: ['Card Payments', 'Mobile Money', 'Bank Transfer', 'Multi-currency'],
          processingTime: 'Instant'
        }
      ]
    };

    return providers;
  }

  validateConfiguration() {
    const missingConfigs = [];

    // Check M-Pesa config
    if (!this.configs.mpesa.apiKey) missingConfigs.push('MPESA_API_KEY');
    if (!this.configs.mpesa.publicKey) missingConfigs.push('MPESA_PUBLIC_KEY');

    // Check Tigo config
    if (!this.configs.tigo.clientId) missingConfigs.push('TIGO_CLIENT_ID');
    if (!this.configs.tigo.clientSecret) missingConfigs.push('TIGO_CLIENT_SECRET');

    // Check Airtel config
    if (!this.configs.airtel.clientId) missingConfigs.push('AIRTEL_CLIENT_ID');
    if (!this.configs.airtel.clientSecret) missingConfigs.push('AIRTEL_CLIENT_SECRET');

    if (missingConfigs.length > 0) {
      console.warn('Missing payment provider configurations:', missingConfigs);
      console.warn('Please add these environment variables for full payment integration');
    }

    return missingConfigs.length === 0;
  }
}

module.exports = new PaymentService();
