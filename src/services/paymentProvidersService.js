import api from '../utils/axiosConfig';

class PaymentProvidersService {
  constructor() {
    this.providers = null;
    this.lastFetched = null;
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  async getPaymentProviders() {
    // Return cached data if available and not expired
    if (this.providers && this.lastFetched && (Date.now() - this.lastFetched) < this.cacheTimeout) {
      return this.providers;
    }

    try {
      const response = await api.get('/marketplace/payment-providers');
      
      if (response.data.success) {
        // Handle different response structures from different endpoints
        let backendData;
        
        // Check if data is under 'paymentProviders' (purchase.js endpoint)
        if (response.data.paymentProviders) {
          backendData = response.data.paymentProviders;
        }
        // Check if data is under 'data' (marketplace.js endpoint)
        else if (response.data.data) {
          backendData = response.data.data;
        }
        else {
          console.error('❌ Payment providers data not found in response:', response.data);
          throw new Error('Payment providers data is missing from API response');
        }
        
        // Convert to expected format based on the structure we receive
        if (backendData.bank || backendData.mobile || backendData.gateway) {
          // Structure from purchase.js endpoint
          this.providers = {
            banks: backendData.bank || [],
            mobile_money: backendData.mobile || [],
            gateways: backendData.gateway || []
          };
        } else if (backendData.banks || backendData.mobile_money || backendData.gateways) {
          // Structure from marketplace.js endpoint (via paymentService)
          this.providers = {
            banks: backendData.banks || [],
            mobile_money: backendData.mobile_money || [],
            gateways: backendData.gateways || []
          };
        } else {
          console.error('❌ Unknown payment providers data structure:', backendData);
          throw new Error('Unknown payment providers data structure');
        }
        
        this.lastFetched = Date.now();
        return this.providers;
      } else {
        throw new Error(response.data.message || 'Failed to fetch payment providers');
      }
    } catch (error) {
      console.error('Error fetching payment providers:', error);
      console.log('Using fallback providers due to API error');
      
      // Return fallback data if API fails
      const fallbackProviders = this.getFallbackProviders();
      this.providers = fallbackProviders;
      this.lastFetched = Date.now();
      return fallbackProviders;
    }
  }

  getFallbackProviders() {
    return {
      banks: [
        {
          id: 'crdb',
          name: 'CRDB Bank',
          description: 'CRDB Bank Tanzania - Leading financial services',
          logo: '🏛️',
          logoAlt: '/api/images/logos/crdb-logo-updated.svg',
          website: 'https://www.crdbbank.co.tz',
          features: ['Online Banking', 'Mobile Banking', 'ATM Network']
        },
        {
          id: 'nmb',
          name: 'NMB Bank',
          description: 'National Microfinance Bank',
          logo: '🏦',
          logoAlt: '/api/images/logos/nmb-logo-updated.svg',
          website: 'https://www.nmbbank.co.tz',
          features: ['Mobile Banking', 'Internet Banking', 'Agent Banking']
        },
        {
          id: 'nbc',
          name: 'NBC Bank',
          description: 'National Bank of Commerce',
          logo: '🏪',
          logoAlt: '/api/images/logos/nbc-logo-updated.svg',
          website: 'https://www.nbctz.com',
          features: ['Corporate Banking', 'Retail Banking', 'Digital Services']
        }
      ],
      mobile_money: [
        {
          id: 'mpesa',
          name: 'M-Pesa (Vodacom)',
          description: 'Leading mobile money service in Tanzania',
          logo: '💚',
          logoAlt: '/api/images/logos/mpesa-logo.svg',
          brand_color: '#e60000',
          website: 'https://www.vodacom.co.tz',
          features: ['Send Money', 'Pay Bills', 'Buy Airtime', 'Lipa na M-Pesa']
        },
        {
          id: 'tigo',
          name: 'Tigo Pesa',
          description: 'Tigo mobile money service',
          logo: '🔵',
          logoAlt: '/api/images/logos/tigo-logo-updated.svg',
          brand_color: '#0066cc',
          website: 'https://www.tigo.co.tz',
          features: ['Money Transfer', 'Bill Payments', 'Merchant Payments']
        },
        {
          id: 'airtel',
          name: 'Airtel Money',
          description: 'Airtel mobile financial services',
          logo: '🔴',
          logoAlt: '/api/images/logos/airtel-logo-updated.svg',
          brand_color: '#ff0000',
          website: 'https://www.airtel.co.tz',
          features: ['Money Transfer', 'Bill Payments', 'Airtime Purchase']
        },
        {
          id: 'halopesa',
          name: 'HaloPesa (Halotel)',
          description: 'Halotel mobile money service',
          logo: '🟡',
          logoAlt: '/api/images/logos/halopesa-logo-updated.svg',
          brand_color: '#ffa500',
          website: 'https://www.halotel.co.tz',
          features: ['Mobile Payments', 'Money Transfer', 'Bill Payments']
        },
        {
          id: 'tpesa',
          name: 'T-Pesa (TTCL)',
          description: 'TTCL mobile money service',
          logo: '🟢',
          logoAlt: '/api/images/logos/tpesa-logo-updated.svg',
          brand_color: '#008000',
          website: 'https://www.ttcl.co.tz',
          features: ['Mobile Money', 'Bulk Payments', 'Merchant Services']
        }
      ],
      gateways: [
        {
          id: 'pesapal',
          name: 'Pesapal Payment Gateway',
          description: 'Secure payment gateway with multiple payment options',
          logo: '💳',
          logoAlt: '/api/images/logos/pesapal-logo-enhanced.svg',
          brand_color: '#1e88e5',
          website: 'https://www.pesapal.com',
          features: ['M-Pesa, Tigo Pesa, Airtel Money', 'Visa & MasterCard', 'Direct Bank Transfer', 'PayPal International']
        }
      ]
    };
  }

  // Get providers by category
  getBankProviders() {
    return this.providers?.banks || this.getFallbackProviders().banks;
  }

  getMobileMoneyProviders() {
    return this.providers?.mobile_money || this.getFallbackProviders().mobile_money;
  }

  getGatewayProviders() {
    return this.providers?.gateways || this.getFallbackProviders().gateways;
  }

  // Get all providers grouped by category
  getAllProviders() {
    return {
      banks: this.getBankProviders(),
      mobile_money: this.getMobileMoneyProviders(),
      gateways: this.getGatewayProviders()
    };
  }

  // Clear cache
  clearCache() {
    this.providers = null;
    this.lastFetched = null;
  }
}

// Export singleton instance
export default new PaymentProvidersService();
