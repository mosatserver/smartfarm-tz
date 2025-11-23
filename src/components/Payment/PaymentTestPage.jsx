import React, { useState } from 'react';
import PaymentMethodSelector from './PaymentMethodSelector';
import CheckoutForm from './CheckoutForm';

const PaymentTestPage = () => {
  const [currentTest, setCurrentTest] = useState('selector'); // 'selector', 'checkout'
  const [selectedPayment, setSelectedPayment] = useState({ method: null, provider: null });

  // Mock product for testing
  const mockProduct = {
    id: 1,
    title: 'Premium Organic Tomatoes',
    price: 15000, // TZS 15,000
    image_url: '/uploads/tomatoes.jpg'
  };

  const handlePaymentMethodChange = (paymentData) => {
    setSelectedPayment(paymentData);
    console.log('Payment method selected:', paymentData);
  };

  const handlePaymentSuccess = (orderData) => {
    console.log('Payment successful:', orderData);
    alert(`Payment successful! Order ID: ${orderData.orderId}`);
  };

  const handlePaymentError = (error) => {
    console.error('Payment error:', error);
    alert('Payment failed: ' + error.message);
  };

  const handleCancel = () => {
    console.log('Payment cancelled');
    setCurrentTest('selector');
    setSelectedPayment({ method: null, provider: null });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              SmartFarm Payment System Test
            </h1>
            <p className="text-gray-600">
              Test the payment components with official provider logos
            </p>
          </div>

          {/* Navigation */}
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setCurrentTest('selector')}
              className={`px-4 py-2 rounded-lg font-medium ${
                currentTest === 'selector'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Payment Method Selector
            </button>
            <button
              onClick={() => setCurrentTest('checkout')}
              className={`px-4 py-2 rounded-lg font-medium ${
                currentTest === 'checkout'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Full Checkout Flow
            </button>
          </div>

          {/* Content */}
          <div className="border rounded-lg p-4 bg-gray-50">
            {currentTest === 'selector' && (
              <div>
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left side - Component */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4">Payment Method Selector</h2>
                    <PaymentMethodSelector
                      onPaymentMethodChange={handlePaymentMethodChange}
                      selectedMethod={selectedPayment.method}
                      selectedProvider={selectedPayment.provider}
                    />
                  </div>

                  {/* Right side - Info */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Selection Info</h3>
                    <div className="bg-white rounded-lg p-4 border">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Method:</span>
                          <span className={selectedPayment.method ? 'text-green-600' : 'text-gray-400'}>
                            {selectedPayment.method || 'None selected'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="font-medium">Provider:</span>
                          <span className={selectedPayment.provider ? 'text-green-600' : 'text-gray-400'}>
                            {selectedPayment.provider || 'None selected'}
                          </span>
                        </div>
                      </div>

                      {selectedPayment.method && selectedPayment.provider && (
                        <div className="mt-4 pt-4 border-t">
                          <h4 className="font-medium text-green-600 mb-2">✅ Ready for checkout!</h4>
                          <button
                            onClick={() => setCurrentTest('checkout')}
                            className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                          >
                            Proceed to Checkout
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Logo Test Section */}
                    <div className="mt-6">
                      <h3 className="text-lg font-semibold mb-4">Logo Test</h3>
                      <div className="bg-white rounded-lg p-4 border">
                        <p className="text-sm text-gray-600 mb-3">
                          Testing local logo accessibility:
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {[
                            { name: 'M-Pesa', path: '/api/images/logos/mpesa-logo.svg' },
                            { name: 'Tigo Pesa', path: '/api/images/logos/tigo-logo.svg' },
                            { name: 'Pesapal', path: '/api/images/logos/pesapal-logo.svg' }
                          ].map((logo) => (
                            <div key={logo.name} className="text-center">
                              <div className="w-12 h-12 mx-auto mb-2 border rounded">
                                <img
                                  src={logo.path}
                                  alt={logo.name}
                                  className="w-full h-full object-contain"
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.nextSibling.style.display = 'block';
                                  }}
                                />
                                <div 
                                  className="w-full h-full bg-red-100 flex items-center justify-center text-xs text-red-600"
                                  style={{ display: 'none' }}
                                >
                                  Failed
                                </div>
                              </div>
                              <p className="text-xs text-gray-600">{logo.name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentTest === 'checkout' && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Full Checkout Experience</h2>
                <CheckoutForm
                  product={mockProduct}
                  quantity={2}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                  onCancel={handleCancel}
                />
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">🧪 Testing Instructions</h3>
            <div className="text-blue-700 space-y-2">
              <p><strong>1. Payment Method Selector:</strong> Check if all provider logos are displaying correctly</p>
              <p><strong>2. Pesapal Location:</strong> Verify Pesapal appears in the "Payment Gateway" section</p>
              <p><strong>3. Logo Test:</strong> The logo test section shows if your local logos are accessible</p>
              <p><strong>4. Full Checkout:</strong> Test the complete payment flow with your Pesapal sandbox credentials</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentTestPage;