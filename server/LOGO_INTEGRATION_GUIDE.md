# Payment Provider Logos Integration Guide

## Backend Configuration

The payment provider logos are configured and working correctly on the backend:

### 1. Logo Files Location
All logo files are stored in: `server/public/images/logos/`

### 2. Static File Serving
Logos are served via the endpoint: `http://localhost:5000/api/images/logos/[filename]`

### 3. Available Logo Files
- `mpesa-logo.svg` - M-Pesa
- `tigo-logo.svg` - Tigo Pesa  
- `airtel-logo.svg` - Airtel Money
- `halopesa-logo.svg` - HaloPesa
- `tpesa-logo-updated.svg` - T-Pesa
- `crdb-logo-updated.svg` - CRDB Bank
- `nbc-logo-updated.svg` - NBC Bank
- `nmb-logo.svg` - NMB Bank
- `pesapal-logo-enhanced.svg` - Pesapal

## Testing Logo Serving

Visit: `http://localhost:5000/public/test-logos.html` to test if logos are loading correctly.

## Frontend Integration

### 1. Fetching Payment Providers

```javascript
// Fetch payment providers from API
const fetchPaymentProviders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/marketplace/payment-providers`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch payment providers');
    }
    
    const data = await response.json();
    return data.data; // Returns the providers object
  } catch (error) {
    console.error('Error fetching payment providers:', error);
    return null;
  }
};
```

### 2. Displaying Provider Logos (React Example)

```jsx
import React, { useState, useEffect } from 'react';

const PaymentProviders = () => {
  const [providers, setProviders] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState('mobile');
  
  useEffect(() => {
    const loadProviders = async () => {
      const providersData = await fetchPaymentProviders();
      setProviders(providersData);
    };
    
    loadProviders();
  }, []);

  if (!providers) {
    return <div>Loading payment providers...</div>;
  }

  return (
    <div className="payment-providers">
      <div className="method-selector">
        <button 
          className={selectedMethod === 'mobile' ? 'active' : ''}
          onClick={() => setSelectedMethod('mobile')}
        >
          Mobile Money
        </button>
        <button 
          className={selectedMethod === 'bank' ? 'active' : ''}
          onClick={() => setSelectedMethod('bank')}
        >
          Bank Transfer
        </button>
        <button 
          className={selectedMethod === 'gateway' ? 'active' : ''}
          onClick={() => setSelectedMethod('gateway')}
        >
          Payment Gateway
        </button>
      </div>
      
      <div className="providers-grid">
        {providers[selectedMethod]?.map((provider) => (
          <div key={provider.id} className="provider-card">
            <img 
              src={provider.logo}
              alt={provider.name}
              className="provider-logo"
              onError={(e) => {
                // Fallback to logoAlt if main logo fails
                e.target.src = provider.logoAlt;
              }}
              onLoad={() => console.log(`Logo loaded for ${provider.name}`)}
            />
            <h3>{provider.name}</h3>
            <p>{provider.description}</p>
            {provider.shortCode && (
              <p className="shortcode">USSD: {provider.shortCode}</p>
            )}
            <p className="processing-time">
              Processing Time: {provider.processingTime}
            </p>
            <div className="features">
              {provider.features.map((feature, index) => (
                <span key={index} className="feature-tag">
                  {feature}
                </span>
              ))}
            </div>
            <button 
              className={`select-provider ${provider.supported ? '' : 'disabled'}`}
              disabled={!provider.supported}
            >
              {provider.supported ? 'Select' : 'Not Available'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
```

### 3. CSS Styling for Logos

```css
.provider-logo {
  width: 120px;
  height: 40px;
  object-fit: contain;
  margin-bottom: 10px;
  background: white;
  padding: 5px;
  border-radius: 4px;
  border: 1px solid #e0e0e0;
}

.provider-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  text-align: center;
  background: #f9f9f9;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.provider-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
}

.providers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin: 20px 0;
}

.feature-tag {
  display: inline-block;
  background: #e3f2fd;
  color: #1976d2;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  margin: 2px;
}

.select-provider {
  width: 100%;
  padding: 8px 16px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.select-provider.disabled {
  background: #ccc;
  cursor: not-allowed;
}

.shortcode {
  font-family: monospace;
  background: #f0f0f0;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}
```

## Troubleshooting

### Issue: Logos not loading

1. **Check Network Tab**: Open browser dev tools and check if image requests are failing
2. **CORS Issues**: Make sure your frontend domain is included in the CORS configuration
3. **Authentication**: Ensure you have a valid auth token when fetching payment providers
4. **Content Security Policy**: Check if CSP headers are blocking image loading

### Issue: SVG logos not displaying

1. **Content Type**: Server should serve SVG with `image/svg+xml` content type
2. **SVG Validation**: Check if SVG files are well-formed XML
3. **Browser Support**: Use fallback PNG/JPG images for older browsers

### Testing Individual Logos

You can test individual logo URLs directly:
```
http://localhost:5000/api/images/logos/mpesa-logo.svg
http://localhost:5000/api/images/logos/tigo-logo.svg
http://localhost:5000/api/images/logos/airtel-logo.svg
```

## Environment Variables

Make sure you have the appropriate environment variables set for payment provider configurations. Missing configs will show providers as "not supported".

Required variables:
- `MPESA_API_KEY`
- `TIGO_CLIENT_ID`
- `AIRTEL_CLIENT_ID`
- `PESAPAL_CONSUMER_KEY`
- etc.

## API Response Structure

The `/api/marketplace/payment-providers` endpoint returns:

```json
{
  "success": true,
  "data": {
    "mobile": [
      {
        "id": "mpesa",
        "name": "M-Pesa",
        "logo": "/api/images/logos/mpesa-logo.svg",
        "logoAlt": "/images/logos/mpesa-logo.svg",
        "country": "TZ",
        "description": "M-Pesa - Quick, safe and reliable",
        "supported": true,
        "features": ["Instant Payments", "Mobile Wallet", "Bill Payments"],
        "processingTime": "Instant"
      }
    ],
    "bank": [...],
    "gateway": [...]
  }
}
```