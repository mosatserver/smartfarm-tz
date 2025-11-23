import React, { useState, useEffect } from 'react';
import paymentProvidersService from './services/paymentProvidersService';

// Test component to verify payment provider logos are working
export default function PaymentProviderLogoTest() {
  const [providers, setProviders] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        setLoading(true);
        const data = await paymentProvidersService.getPaymentProviders();
        setProviders(data);
      } catch (error) {
        console.error('Error loading providers:', error);
      } finally {
        setLoading(false);
      }
    };
    loadProviders();
  }, []);

  if (loading) {
    return <div className="p-4">Loading payment providers...</div>;
  }

  return (
    <div className="p-6 bg-gray-50 border-2 border-red-500 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-red-600">🧪 Payment Provider Logo Test</h2>
      
      {providers && (
        <>
          {/* Mobile Money Providers */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">📱 Mobile Money Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.mobile_money?.map((provider) => (
                <div key={provider.id} className="bg-white p-4 rounded-lg border shadow">
                  <div className="flex items-center space-x-3">
                    {/* Logo Test */}
                    <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white border-4 border-gray-400 shadow-xl">
                      {provider.logoAlt ? (
                        <img
                          src={provider.logoAlt}
                          alt={provider.name}
                          className="w-24 h-24 object-contain"
                          onError={(e) => {
                            // Hide image and show emoji fallback
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full flex items-center justify-center text-6xl"
                        style={{ display: provider.logoAlt ? 'none' : 'flex' }}
                      >
                        {provider.logo || '📱'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-xs text-gray-500">{provider.id}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <div>Logo URL: <code className="bg-gray-100 px-1">{provider.logoAlt || 'None'}</code></div>
                    <div>Emoji: {provider.logo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bank Providers */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">🏦 Bank Providers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.banks?.map((provider) => (
                <div key={provider.id} className="bg-white p-4 rounded-lg border shadow">
                  <div className="flex items-center space-x-3">
                    {/* Logo Test */}
                    <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white border-4 border-gray-400 shadow-xl">
                      {provider.logoAlt ? (
                        <img
                          src={provider.logoAlt}
                          alt={provider.name}
                          className="w-24 h-24 object-contain"
                          onError={(e) => {
                            // Hide image and show emoji fallback
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full flex items-center justify-center text-6xl"
                        style={{ display: provider.logoAlt ? 'none' : 'flex' }}
                      >
                        {provider.logo || '🏦'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-xs text-gray-500">{provider.id}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <div>Logo URL: <code className="bg-gray-100 px-1">{provider.logoAlt || 'None'}</code></div>
                    <div>Emoji: {provider.logo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Gateway Providers */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3">💳 Payment Gateways</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.gateways?.map((provider) => (
                <div key={provider.id} className="bg-white p-4 rounded-lg border shadow">
                  <div className="flex items-center space-x-3">
                    {/* Logo Test */}
                    <div className="w-32 h-32 flex-shrink-0 flex items-center justify-center rounded-2xl bg-white border-4 border-gray-400 shadow-xl">
                      {provider.logoAlt ? (
                        <img
                          src={provider.logoAlt}
                          alt={provider.name}
                          className="w-24 h-24 object-contain"
                          onError={(e) => {
                            // Hide image and show emoji fallback
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="w-full h-full flex items-center justify-center text-6xl"
                        style={{ display: provider.logoAlt ? 'none' : 'flex' }}
                      >
                        {provider.logo || '💳'}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-xs text-gray-500">{provider.id}</div>
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <div>Logo URL: <code className="bg-gray-100 px-1">{provider.logoAlt || 'None'}</code></div>
                    <div>Emoji: {provider.logo}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <h4 className="font-semibold text-blue-800">Test Instructions:</h4>
        <ul className="text-sm text-blue-700 mt-1">
          <li>✅ SVG logos should load from /api/images/logos/</li>
          <li>✅ If SVG fails, emoji should display as fallback</li>
          <li>✅ Check browser Network tab for failed requests</li>
          <li>🗑️ Remove this component when testing is complete</li>
        </ul>
      </div>
    </div>
  );
}