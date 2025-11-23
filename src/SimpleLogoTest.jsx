import React, { useState } from 'react';

export default function SimpleLogoTest() {
  const [loadStatus, setLoadStatus] = useState({});

  const handleImageLoad = (logoName) => {
    setLoadStatus(prev => ({ ...prev, [logoName]: 'loaded' }));
    console.log(`✅ ${logoName} loaded successfully`);
  };

  const handleImageError = (logoName, error) => {
    setLoadStatus(prev => ({ ...prev, [logoName]: 'error' }));
    console.error(`❌ ${logoName} failed to load:`, error);
    console.error('Error target:', error.target);
    console.error('Error src:', error.target?.src);
  };

  const testLogos = [
    { name: 'M-Pesa', url: '/api/images/logos/mpesa-logo.svg' },
    { name: 'Tigo Updated', url: '/api/images/logos/tigo-logo-updated.svg' },
    { name: 'Airtel Updated', url: '/api/images/logos/airtel-logo-updated.svg' },
    { name: 'HaloPesa Updated', url: '/api/images/logos/halopesa-logo-updated.svg' },
    { name: 'Pesapal Enhanced', url: '/api/images/logos/pesapal-logo-enhanced.svg' }
  ];

  return (
    <div className="p-6 bg-red-50 border-4 border-red-500 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-red-600">
        🔍 Simple Logo Loading Test
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        {testLogos.map((logo) => (
          <div key={logo.name} className="bg-white p-4 rounded-lg border shadow">
            <h3 className="text-sm font-semibold mb-2 text-center">{logo.name}</h3>
            
            <div className="w-20 h-20 mx-auto mb-2 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50">
              <img
                src={logo.url}
                alt={logo.name}
                className="w-16 h-16 object-contain"
                onLoad={() => handleImageLoad(logo.name)}
                onError={(e) => handleImageError(logo.name, e)}
              />
            </div>
            
            <div className="text-center text-xs">
              <div className="mb-1">
                Status: <span className={`font-semibold ${
                  loadStatus[logo.name] === 'loaded' ? 'text-green-600' : 
                  loadStatus[logo.name] === 'error' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {loadStatus[logo.name] || 'loading...'}
                </span>
              </div>
              <div className="text-gray-500 break-all">
                {logo.url}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Direct URL Test */}
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mb-4">
        <h3 className="font-semibold text-yellow-800 mb-2">🌐 Direct URL Test</h3>
        <p className="text-sm text-yellow-700 mb-2">
          Click these links to test if logos load directly in browser:
        </p>
        <div className="space-y-1">
          {testLogos.map((logo) => (
            <div key={logo.name}>
              <a 
                href={`http://localhost:5000${logo.url}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline text-xs"
              >
                {logo.name}: {logo.url}
              </a>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">🛠️ Debug Instructions</h3>
        <ol className="text-sm text-blue-700 space-y-1">
          <li>1. Open Browser DevTools (F12)</li>
          <li>2. Go to Console tab</li>
          <li>3. Look for loading messages and errors</li>
          <li>4. Go to Network tab and check for failed requests</li>
          <li>5. Try clicking the direct URL links above</li>
        </ol>
      </div>
    </div>
  );
}