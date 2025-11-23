import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import LandingPage from './LandingPage';
import WeatherPage from './pages/WeatherPage';
import MarketplacePage from './pages/MarketplacePage';
import AcademyPage from './pages/AcademyPage';
import DiseaseDiagnosisPage from './pages/DiseaseDiagnosisPage';
import EnhancedDiseaseDiagnosisPage from './pages/EnhancedDiseaseDiagnosisPage';
import ChatSystemPage from './pages/ChatSystemPage';
import TransportPage from './pages/TransportPage';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/weather" element={
              <ProtectedRoute serviceName="Weather">
                <WeatherPage />
              </ProtectedRoute>
            } />
            <Route path="/marketplace" element={
              <ProtectedRoute serviceName="Marketplace">
                <MarketplacePage />
              </ProtectedRoute>
            } />
            <Route path="/academy" element={
              <ProtectedRoute serviceName="Academy">
                <AcademyPage />
              </ProtectedRoute>
            } />
            <Route path="/disease-diagnosis" element={
              <ProtectedRoute serviceName="Disease Diagnosis">
                <EnhancedDiseaseDiagnosisPage />
              </ProtectedRoute>
            } />
            <Route path="/disease-diagnosis-basic" element={
              <ProtectedRoute serviceName="Disease Diagnosis">
                <DiseaseDiagnosisPage />
              </ProtectedRoute>
            } />
            <Route path="/chat" element={
              <ProtectedRoute serviceName="Chat">
                <ChatSystemPage />
              </ProtectedRoute>
            } />
            <Route path="/transport" element={
              <ProtectedRoute serviceName="Transport">
                <TransportPage />
              </ProtectedRoute>
            } />
            {/* Add other routes as needed */}
          </Routes>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
