import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children, serviceName }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!user) {
      showToast({
        type: 'warning',
        message: `Please login or register to access ${serviceName} services`,
        duration: 4000
      });
      navigate('/', { replace: true });
    }
  }, [user, serviceName, showToast, navigate]);

  // If user is not authenticated, return null (component won't render)
  if (!user) {
    return null;
  }

  // If user is authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
