import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import AuthLayout from './components/auth/AuthLayout';
import SignIn from './components/auth/SignIn';
import SignUp from './components/auth/SignUp';
import Home from './components/Home';
import AuthCallback from './components/auth/AuthCallback';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Routes>
          <Route path="/" element={<Navigate to="/signup" replace />} />
          <Route path="/signin" element={
            <AuthLayout>
              <SignIn />
            </AuthLayout>
          } />
          <Route path="/signup" element={
            <AuthLayout>
              <SignUp />
            </AuthLayout>
          } />
          <Route path="/home" element={<Home />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
};

export default App; 