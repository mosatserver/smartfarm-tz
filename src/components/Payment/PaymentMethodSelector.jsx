import React, { useState, useEffect } from 'react';
import api from '../../utils/axiosConfig';

const PaymentMethodSelector = ({ onPaymentMethodChange, selectedMethod, selectedProvider }) => {
  const [paymentProviders, setPaymentProviders] = useState({
    mobile: [],
    bank: [],
    gateway: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPaymentProviders();
  }, []);

  const fetchPaymentProviders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/marketplace/payment-providers');
      if (response.data.success) {
        setPaymentProviders(response.data.paymentProviders);
      }
    } catch (error) {
      console.error('Error fetching payment providers:', error);
      setError('Failed to load payment methods');
    } finally {
      setLoading(false);
    }
  };

  const handleMethodChange = (method, provider) => {
    onPaymentMethodChange({ method, provider });
  };

  const getBrandColors = (provider) => {
    const colors = {
      mpesa: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-600' },
      tigo: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-600' },
      airtel: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-600' },
      pesapal: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-600' },
      crdb: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-800' },
      nmb: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', accent: 'bg-red-600' },
      nbc: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', accent: 'bg-blue-600' }
    };
    return colors[provider?.id] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', accent: 'bg-gray-600' };
  };

  if (loading) {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchPaymentProviders}
            className="mt-2 text-red-600 hover:text-red-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Choose Payment Method</h2>
      
      {/* Mobile Money Options */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📱 Mobile Money</h3>
        <div className="space-y-3">
          {paymentProviders.mobile?.map((provider) => {
            const colors = getBrandColors(provider);
            const isSelected = selectedMethod === 'mobile' && selectedProvider === provider.id;
            
            return (
              <div
                key={provider.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? `${colors.border} ${colors.bg} shadow-md` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleMethodChange('mobile', provider.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    isSelected ? colors.accent : 'border-gray-300'
                  } ${isSelected ? 'bg-current' : ''}`}></div>
                  
                  {/* Provider Logo */}
                  <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border-2 border-gray-300 shadow-md">
                    {provider.logoAlt ? (
                      <img
                        src={provider.logoAlt}
                        alt={provider.name}
                        className="w-20 h-20 object-contain"
                        onError={(e) => {
                          // Hide image and show emoji fallback
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full flex items-center justify-center text-5xl"
                      style={{ display: provider.logoAlt ? 'none' : 'flex' }}
                    >
                      {provider.logo || '💳'}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h4 className={`font-semibold ${colors.text}`}>{provider.name}</h4>
                      {!provider.supported && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          Coming Soon
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{provider.description}</p>
                    {provider.shortCode && (
                      <p className="text-xs text-gray-500 mt-1">USSD: {provider.shortCode}</p>
                    )}
                    {provider.features && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {provider.features.slice(0, 3).map((feature, index) => (
                          <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Gateway Options */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">💳 Payment Gateway</h3>
        <div className="space-y-3">
          {paymentProviders.gateway?.map((provider) => {
            const colors = getBrandColors(provider);
            const isSelected = selectedMethod === 'gateway' && selectedProvider === provider.id;
            
            return (
              <div
                key={provider.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? `${colors.border} ${colors.bg} shadow-md` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleMethodChange('gateway', provider.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    isSelected ? colors.accent : 'border-gray-300'
                  } ${isSelected ? 'bg-current' : ''}`}></div>
                  
                  {/* Provider Logo */}
                  <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border-2 border-gray-300 shadow-md">
                    {provider.logoAlt ? (
                      <img
                        src={provider.logoAlt}
                        alt={provider.name}
                        className="w-20 h-20 object-contain"
                        onError={(e) => {
                          // Hide image and show emoji fallback
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full flex items-center justify-center text-5xl"
                      style={{ display: provider.logoAlt ? 'none' : 'flex' }}
                    >
                      {provider.logo || '💳'}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={`font-semibold ${colors.text}`}>{provider.name}</h4>
                    <p className="text-sm text-gray-600">{provider.description}</p>
                    {provider.supportedPaymentMethods && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-500 mb-1">Supports:</p>
                        <div className="flex flex-wrap gap-1">
                          {provider.supportedPaymentMethods.map((method, index) => (
                            <span key={index} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {method.providers.join(', ')}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {provider.environment === 'sandbox' && (
                      <div className="mt-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Test Mode
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bank Transfer Options */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">🏦 Bank Transfer</h3>
        <div className="space-y-3">
          {paymentProviders.bank?.map((provider) => {
            const colors = getBrandColors(provider);
            const isSelected = selectedMethod === 'bank' && selectedProvider === provider.id;
            
            return (
              <div
                key={provider.id}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  isSelected 
                    ? `${colors.border} ${colors.bg} shadow-md` 
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
                onClick={() => handleMethodChange('bank', provider.id)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`w-5 h-5 rounded-full border-2 ${
                    isSelected ? colors.accent : 'border-gray-300'
                  } ${isSelected ? 'bg-current' : ''}`}></div>
                  
                  {/* Provider Logo */}
                  <div className="w-24 h-24 flex-shrink-0 flex items-center justify-center rounded-xl bg-white border-2 border-gray-300 shadow-md">
                    {provider.logoAlt ? (
                      <img
                        src={provider.logoAlt}
                        alt={provider.name}
                        className="w-20 h-20 object-contain"
                        onError={(e) => {
                          // Hide image and show emoji fallback
                          e.target.style.display = 'none';
                          e.target.nextElementSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      className="w-full h-full flex items-center justify-center text-5xl"
                      style={{ display: provider.logoAlt ? 'none' : 'flex' }}
                    >
                      {provider.logo || '🏦'}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h4 className={`font-semibold ${colors.text}`}>{provider.name}</h4>
                    <p className="text-sm text-gray-600">{provider.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PaymentMethodSelector;