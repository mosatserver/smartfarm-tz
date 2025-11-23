import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../utils/axiosConfig';

const PaymentStatus = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, failed, error
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [countdown, setCountdown] = useState(10);

  const orderId = searchParams.get('order');
  const trackingId = searchParams.get('tracking');

  useEffect(() => {
    if (orderId) {
      checkPaymentStatus();
    } else {
      setStatus('error');
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    // Auto redirect countdown
    if (status !== 'checking' && status !== 'error') {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            navigate('/marketplace');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status, navigate]);

  const checkPaymentStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/webhooks/status/${orderId}`);
      
      if (response.data.success) {
        const transactionData = response.data.data;
        setOrderData(transactionData);
        
        // Determine status based on transaction status
        if (transactionData.status === 'completed' || transactionData.status === 'paid') {
          setStatus('success');
        } else if (transactionData.status === 'failed' || transactionData.status === 'cancelled') {
          setStatus('failed');
        } else {
          setStatus('pending');
        }
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'success':
        return (
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
        );
      case 'failed':
        return (
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
        );
      case 'pending':
        return (
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
          </div>
        );
      case 'checking':
        return (
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        );
      default:
        return (
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'success':
        return {
          title: 'Payment Successful!',
          message: 'Your payment has been processed successfully. The seller has been notified and will contact you soon.',
          color: 'text-green-600'
        };
      case 'failed':
        return {
          title: 'Payment Failed',
          message: 'Unfortunately, your payment could not be processed. Please try again or contact support.',
          color: 'text-red-600'
        };
      case 'pending':
        return {
          title: 'Payment Pending',
          message: 'Your payment is being processed. This may take a few minutes. You will receive a notification once completed.',
          color: 'text-yellow-600'
        };
      case 'checking':
        return {
          title: 'Checking Payment Status',
          message: 'Please wait while we verify your payment...',
          color: 'text-blue-600'
        };
      default:
        return {
          title: 'Payment Status Unknown',
          message: 'We could not determine your payment status. Please contact support with your order ID.',
          color: 'text-gray-600'
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment status...</p>
        </div>
      </div>
    );
  }

  const statusInfo = getStatusMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {renderStatusIcon()}
        
        <h1 className={`text-2xl font-bold mb-4 ${statusInfo.color}`}>
          {statusInfo.title}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {statusInfo.message}
        </p>
        
        {orderData && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Order Details</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Order ID:</span>
                <span className="font-mono">{orderData.orderId}</span>
              </div>
              {trackingId && (
                <div className="flex justify-between">
                  <span>Tracking ID:</span>
                  <span className="font-mono">{trackingId}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Amount:</span>
                <span>TZS {orderData.amount?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Payment Method:</span>
                <span className="capitalize">{orderData.paymentProvider}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className={`font-medium capitalize ${
                  orderData.status === 'completed' || orderData.status === 'paid' ? 'text-green-600' : 
                  orderData.status === 'failed' ? 'text-red-600' : 'text-yellow-600'
                }`}>
                  {orderData.status}
                </span>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-800 text-sm">
                🎉 Thank you for your purchase! You will receive an SMS/email confirmation shortly.
              </p>
            </div>
          )}
          
          {status === 'failed' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-800 text-sm">
                💡 Tip: Check your account balance and try again, or use a different payment method.
              </p>
            </div>
          )}
          
          {status === 'pending' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-yellow-800 text-sm">
                ⏳ Payment processing can take 1-5 minutes. Please do not make another payment.
              </p>
            </div>
          )}
          
          <div className="flex space-x-4">
            <button
              onClick={() => navigate('/marketplace')}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Back to Marketplace
            </button>
            
            {status === 'failed' && (
              <button
                onClick={() => window.history.back()}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Try Again
              </button>
            )}
            
            {status === 'pending' && (
              <button
                onClick={checkPaymentStatus}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Refresh Status
              </button>
            )}
          </div>
          
          {(status === 'success' || status === 'failed') && countdown > 0 && (
            <p className="text-sm text-gray-500">
              Redirecting to marketplace in {countdown} seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentStatus;