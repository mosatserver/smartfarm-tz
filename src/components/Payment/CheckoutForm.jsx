import React, { useState } from 'react';
import api from '../../utils/axiosConfig';
import PaymentMethodSelector from './PaymentMethodSelector';

const CheckoutForm = ({ 
  product, 
  quantity = 1, 
  onPaymentSuccess, 
  onPaymentError, 
  onCancel 
}) => {
  const [step, setStep] = useState(1); // 1: method selection, 2: payment processing, 3: instructions
  const [paymentMethod, setPaymentMethod] = useState({ method: null, provider: null });
  const [customerDetails, setCustomerDetails] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [paymentInstructions, setPaymentInstructions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);

  const totalAmount = product.price * quantity;

  const handlePaymentMethodChange = (selectedPayment) => {
    setPaymentMethod(selectedPayment);
    setError(null);
  };

  const handleCustomerDetailsChange = (e) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNextStep = () => {
    if (step === 1 && paymentMethod.method && paymentMethod.provider) {
      setStep(2);
    }
  };

  const handleBackStep = () => {
    if (step > 1) {
      setStep(step - 1);
      setError(null);
    }
  };

  const processPayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate customer details for gateway payments
      if (paymentMethod.method === 'gateway' && (!customerDetails.email || !customerDetails.firstName)) {
        setError('Please fill in your name and email address');
        return;
      }

      // Validate phone number for mobile payments
      if (paymentMethod.method === 'mobile' && !customerDetails.phoneNumber) {
        setError('Please provide your phone number');
        return;
      }

      const paymentData = {
        productId: product.id,
        quantity,
        paymentMethod: paymentMethod.method,
        paymentProvider: paymentMethod.provider,
        totalAmount,
        ...customerDetails
      };

      const response = await api.post('/marketplace/purchase', paymentData);

      if (response.data.success) {
        setOrderData(response.data.data);
        setPaymentInstructions(response.data.data.paymentInstructions);
        setStep(3);
        
        // For gateway payments, redirect immediately
        if (paymentMethod.method === 'gateway' && response.data.data.paymentInstructions?.paymentUrl) {
          window.location.href = response.data.data.paymentInstructions.paymentUrl;
        }
      } else {
        setError(response.data.message || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.response?.data?.message || 'Payment processing failed');
      if (onPaymentError) {
        onPaymentError(error);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {[1, 2, 3].map((stepNumber) => (
        <div key={stepNumber} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step >= stepNumber 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-200 text-gray-500'
          }`}>
            {stepNumber}
          </div>
          {stepNumber < 3 && (
            <div className={`w-12 h-0.5 mx-2 ${
              step > stepNumber ? 'bg-green-600' : 'bg-gray-200'
            }`}></div>
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Select Payment Method</h2>
      
      {/* Order Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-800 mb-2">Order Summary</h3>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>{product.title}</span>
          <span>TZS {product.price.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Quantity</span>
          <span>{quantity}</span>
        </div>
        <hr className="my-2" />
        <div className="flex justify-between font-semibold text-gray-800">
          <span>Total</span>
          <span>TZS {totalAmount.toLocaleString()}</span>
        </div>
      </div>

      <PaymentMethodSelector
        onPaymentMethodChange={handlePaymentMethodChange}
        selectedMethod={paymentMethod.method}
        selectedProvider={paymentMethod.provider}
      />

      <div className="flex justify-between space-x-4 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleNextStep}
          disabled={!paymentMethod.method || !paymentMethod.provider}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Enter Your Details</h2>
      
      <div className="space-y-4">
        {paymentMethod.method === 'gateway' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  value={customerDetails.firstName}
                  onChange={handleCustomerDetailsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  name="lastName"
                  value={customerDetails.lastName}
                  onChange={handleCustomerDetailsChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                name="email"
                value={customerDetails.email}
                onChange={handleCustomerDetailsChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
            </div>
          </>
        )}
        
        {paymentMethod.method === 'mobile' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number *
            </label>
            <input
              type="tel"
              name="phoneNumber"
              value={customerDetails.phoneNumber}
              onChange={handleCustomerDetailsChange}
              placeholder="+255 XXX XXX XXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Phone Number {paymentMethod.method === 'gateway' ? '(Optional)' : '*'}
          </label>
          <input
            type="tel"
            name="phoneNumber"
            value={customerDetails.phoneNumber}
            onChange={handleCustomerDetailsChange}
            placeholder="+255 XXX XXX XXX"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            required={paymentMethod.method === 'mobile'}
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <div className="flex justify-between space-x-4 mt-6">
        <button
          onClick={handleBackStep}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={processPayment}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Processing...
            </>
          ) : (
            'Process Payment'
          )}
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Instructions</h2>
        <p className="text-gray-600">Order ID: {orderData?.orderId}</p>
      </div>

      {paymentInstructions && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-800 mb-3">
            Pay with {paymentInstructions.provider}
          </h3>
          <div className="space-y-2 text-sm text-blue-700">
            {paymentInstructions.instructions?.map((instruction, index) => (
              <p key={index}>{instruction}</p>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={() => onPaymentSuccess?.(orderData)}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Done
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-6">
      {renderStepIndicator()}
      
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
};

export default CheckoutForm;