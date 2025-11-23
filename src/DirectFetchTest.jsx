import React, { useState, useEffect } from 'react';

export default function DirectFetchTest() {
  const [fetchResults, setFetchResults] = useState({});
  const [svgContent, setSvgContent] = useState({});

  const testLogos = [
    { name: 'M-Pesa', url: '/api/images/logos/mpesa-logo.svg' },
    { name: 'Tigo Updated', url: '/api/images/logos/tigo-logo-updated.svg' },
    { name: 'Airtel Updated', url: '/api/images/logos/airtel-logo-updated.svg' },
  ];

  const testFetch = async (logo) => {
    try {
      const response = await fetch(`http://localhost:5000${logo.url}`);
      console.log(`${logo.name} fetch response:`, response.status, response.statusText);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`${logo.name} content length:`, text.length);
        setFetchResults(prev => ({ ...prev, [logo.name]: 'success' }));
        setSvgContent(prev => ({ ...prev, [logo.name]: text }));
      } else {
        setFetchResults(prev => ({ ...prev, [logo.name]: `error: ${response.status}` }));
      }
    } catch (error) {
      console.error(`${logo.name} fetch error:`, error);
      setFetchResults(prev => ({ ...prev, [logo.name]: `error: ${error.message}` }));
    }
  };

  useEffect(() => {
    testLogos.forEach(logo => testFetch(logo));
  }, []);

  return (
    <div className="p-6 bg-purple-50 border-4 border-purple-500 rounded-lg">
      <h2 className="text-2xl font-bold mb-4 text-purple-600">
        🌐 Direct Fetch Test
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {testLogos.map((logo) => (
          <div key={logo.name} className="bg-white p-4 rounded-lg border shadow">
            <h3 className="text-sm font-semibold mb-2 text-center">{logo.name}</h3>
            
            {/* Fetch Status */}
            <div className="mb-3 text-center">
              <span className="text-xs font-medium">
                Fetch Status: <span className={`${
                  fetchResults[logo.name] === 'success' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {fetchResults[logo.name] || 'loading...'}
                </span>
              </span>
            </div>

            {/* SVG Content Display */}
            <div className="w-20 h-20 mx-auto mb-2 border-2 border-gray-300 rounded flex items-center justify-center bg-gray-50">
              {svgContent[logo.name] ? (
                <div 
                  className="w-16 h-16"
                  dangerouslySetInnerHTML={{ __html: svgContent[logo.name] }}
                />
              ) : (
                <div className="text-xs text-gray-400">Loading...</div>
              )}
            </div>
            
            {/* Regular img tag test */}
            <div className="text-center text-xs mb-2">
              <div>Regular img tag:</div>
              <div className="w-12 h-12 mx-auto border border-gray-200 rounded">
                <img
                  src={logo.url}
                  alt={logo.name}
                  className="w-full h-full object-contain"
                  onLoad={() => console.log(`✅ ${logo.name} img loaded`)}
                  onError={() => console.log(`❌ ${logo.name} img error`)}
                />
              </div>
            </div>

            <div className="text-gray-500 text-xs break-all">
              {logo.url}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Test Results</h3>
        <p className="text-sm text-blue-700 mb-2">
          This test fetches SVG content directly and displays it inline, bypassing potential img tag issues.
        </p>
        <div className="text-xs">
          {Object.entries(fetchResults).map(([name, status]) => (
            <div key={name}>{name}: {status}</div>
          ))}
        </div>
      </div>
    </div>
  );
}