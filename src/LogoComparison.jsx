import React from 'react';

// Component to compare old vs new payment provider logos
export default function LogoComparison() {
  const logoComparisons = [
    {
      name: 'M-Pesa',
      old: '/api/images/logos/mpesa-logo.svg',
      new: '/api/images/logos/mpesa-logo.svg', // Already updated
      description: 'M-Pesa mobile money service'
    },
    {
      name: 'Tigo Pesa',
      old: '/api/images/logos/tigo-logo.svg',
      new: '/api/images/logos/tigo-logo-updated.svg',
      description: 'Tigo mobile money service'
    },
    {
      name: 'Airtel Money',
      old: '/api/images/logos/airtel-logo.svg',
      new: '/api/images/logos/airtel-logo-updated.svg',
      description: 'Airtel mobile financial services'
    },
    {
      name: 'HaloPesa',
      old: '/api/images/logos/halopesa-logo.svg',
      new: '/api/images/logos/halopesa-logo-updated.svg',
      description: 'Halotel mobile money service'
    },
    {
      name: 'T-Pesa',
      old: '/api/images/logos/tpesa-logo.svg',
      new: '/api/images/logos/tpesa-logo-updated.svg',
      description: 'TTCL mobile money service'
    },
    {
      name: 'Pesapal',
      old: '/api/images/logos/pesapal-logo.svg',
      new: '/api/images/logos/pesapal-logo-enhanced.svg',
      description: 'Pesapal payment gateway'
    }
  ];

  return (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-4 border-green-500 rounded-xl">
      <h2 className="text-3xl font-bold mb-6 text-green-600 text-center">
        🎨 Payment Provider Logo Comparison
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {logoComparisons.map((comparison, index) => (
          <div key={index} className="bg-white rounded-lg shadow-xl p-6 border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-center text-gray-800">
              {comparison.name}
            </h3>
            
            {/* Comparison Side by Side */}
            <div className="flex justify-center space-x-6 mb-4">
              {/* Old Logo */}
              <div className="text-center">
                <div className="text-sm text-gray-500 mb-2">Old Logo</div>
                <div className="w-24 h-24 flex items-center justify-center bg-gray-100 border-2 border-gray-300 rounded-lg">
                  <img
                    src={comparison.old}
                    alt={`${comparison.name} old`}
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="w-full h-full flex items-center justify-center text-gray-400 text-xs"
                    style={{ display: 'none' }}
                  >
                    Basic
                  </div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex items-center">
                <div className="text-3xl text-green-500">→</div>
              </div>

              {/* New Logo */}
              <div className="text-center">
                <div className="text-sm text-green-600 mb-2 font-medium">New Logo</div>
                <div className="w-24 h-24 flex items-center justify-center bg-white border-2 border-green-300 rounded-lg shadow-lg">
                  <img
                    src={comparison.new}
                    alt={`${comparison.name} new`}
                    className="w-20 h-20 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextElementSibling.style.display = 'flex';
                    }}
                  />
                  <div 
                    className="w-full h-full flex items-center justify-center text-green-500 text-xs"
                    style={{ display: 'none' }}
                  >
                    Enhanced
                  </div>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600 text-center">
              {comparison.description}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-green-100 border border-green-300 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-2">✅ Updated Features:</h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• High-quality, professional brand logos</li>
          <li>• Better color accuracy and detail</li>
          <li>• Optimized for both light and dark backgrounds</li>
          <li>• Consistent sizing and alignment</li>
          <li>• Enhanced user trust and recognition</li>
        </ul>
      </div>
      
      <div className="mt-4 text-center text-sm text-gray-500">
        🗑️ Remove this component once you've verified the logo updates
      </div>
    </div>
  );
}