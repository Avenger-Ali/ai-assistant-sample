import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { fetchMe } from './store/slices/authSlice';

import LandingPage       from './pages/LandingPage';
import AuthPage          from './pages/AuthPage';
import DashboardPage     from './pages/DashboardPage';
import SessionPage       from './pages/SessionPage';
import MockInterviewPage from './pages/MockInterviewPage';
import PricingPage       from './pages/PricingPage';
import B2BDashboardPage  from './pages/B2BDashboardPage';
import AffiliatePage     from './pages/AffiliatePage';
import MobilePage        from './pages/MobilePage';

import './App.css';

function PrivateRoute({ children }) {
  const { isAuthenticated, token } = useSelector(s => s.auth);
  if (!token && !isAuthenticated) return <Navigate to="/auth/signin" replace />;
  return children;
}

function AppRoutes() {
  const dispatch = useDispatch();
  const { token } = useSelector(s => s.auth);
  useEffect(() => { if (token) dispatch(fetchMe()); }, [dispatch, token]);

  return (
    <Routes>
      {/* Public */}
      <Route path="/"           element={<LandingPage />} />
      <Route path="/auth/:mode" element={<AuthPage />} />
      <Route path="/auth"       element={<Navigate to="/auth/signin" replace />} />
      <Route path="/pricing"    element={<PricingPage />} />
      <Route path="/mobile"     element={<MobilePage />} />

      {/* Protected */}
      <Route path="/dashboard"   element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/session/:id" element={<PrivateRoute><SessionPage /></PrivateRoute>} />
      <Route path="/mock"        element={<PrivateRoute><MockInterviewPage /></PrivateRoute>} />
      <Route path="/enterprise"  element={<PrivateRoute><B2BDashboardPage /></PrivateRoute>} />
      <Route path="/affiliate"   element={<PrivateRoute><AffiliatePage /></PrivateRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <Router>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: '#1a1a2e', color: '#e2e8f0',
              border: '1px solid #6366f1', borderRadius: '11px',
              fontSize: '14px',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
            error:   { iconTheme: { primary: '#f87171', secondary: '#fff' } },
          }}
        />
        <AppRoutes />
      </Router>
    </Provider>
  );
}
