import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import AuthLayout from "./components/auth/AuthLayout";
import SignIn from "./components/auth/SignIn";
import SignUp from "./components/auth/SignUp";
import Home from "./components/Home";
import AuthCallback from "./components/auth/AuthCallback";
import Explore from "./components/Explore/Explore";
import Plan from "./components/Plan/Plan";
import ProtectedRoute from "./components/auth/ProtectedRoute";

const App: React.FC = () => {
  const location = useLocation();

  return (
    <ThemeProvider>
      <div className="min-h-screen">
        <Routes location={location}>
          <Route path="/" element={<Navigate to="/signin" replace />} />
          <Route
            path="/signin"
            element={
              <AuthLayout>
                <SignIn />
              </AuthLayout>
            }
          />
          <Route
            path="/signup"
            element={
              <AuthLayout>
                <SignUp />
              </AuthLayout>
            }
          />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/explore"
            element={
              <ProtectedRoute>
                <Explore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan"
            element={
              <ProtectedRoute>
                <Plan />
              </ProtectedRoute>
            }
          />
          <Route
            path="/plan/:parkCode"
            element={
              <ProtectedRoute>
                <Plan />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </ThemeProvider>
  );
};

export default App;
