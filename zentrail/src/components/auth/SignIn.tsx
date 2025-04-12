import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';
import Logger from '../../utils/logger';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002';

interface FormData {
  email: string;
  password: string;
}

const SignIn: React.FC = () => {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string>('');

  const validateForm = () => {
    const newErrors: Partial<FormData> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    Logger.info('SignIn', 'Form Submission Started', { email: formData.email });
    
    if (validateForm()) {
      setIsLoading(true);
      setApiError('');
      
      try {
        Logger.info('SignIn', 'API Request Started', {
          url: `${API_URL}/api/auth/signin`,
          data: { email: formData.email }
        });

        const response = await axios.post(`${API_URL}/api/auth/signin`, formData);
        const { token, user } = response.data;
        
        Logger.info('SignIn', 'API Request Successful', {
          userId: user.id,
          email: user.email
        });

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        
        Logger.info('SignIn', 'Authentication Successful', {
          userId: user.id,
          redirectTo: '/home'
        });

        navigate('/home');
      } catch (error) {
        Logger.error('SignIn', 'Authentication Failed', error);
        
        if (axios.isAxiosError(error)) {
          if (!error.response) {
            setApiError('Unable to connect to the server. Please check your internet connection.');
          } else if (error.response.status === 401) {
            setApiError('Invalid email or password');
          } else if (error.response.status === 404) {
            setApiError('User not found');
          } else if (error.response.status >= 500) {
            setApiError('Server error. Please try again later.');
          } else {
            setApiError(error.response.data.message || 'An error occurred during sign in');
          }
        } else {
          setApiError('An unexpected error occurred');
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      Logger.warn('SignIn', 'Form Validation Failed', { errors });
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    Logger.info('SignIn', 'Input Changed', { field: name });
    
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    setApiError('');
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setApiError('');
      
      Logger.info('SignIn', 'Google Sign-In Started');
      
      window.location.href = `${API_URL}/api/auth/google`;
    } catch (error) {
      Logger.error('SignIn', 'Google Sign-In Failed', error);
      setApiError('Failed to initiate Google Sign-In. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const inputClasses = `w-full px-6 py-4 rounded-xl border text-base ${
    isDarkMode 
      ? 'bg-[#001F3F]/10 border-[#3A6D8C]/20 text-[#EAD8B1] placeholder-[#6A9AB0]/50' 
      : 'bg-[#FAF6E3]/10 border-[#B59F78]/20 text-[#2A3663] placeholder-[#D8DBBD]/50'
  } focus:outline-none focus:ring-2 ${
    isDarkMode ? 'focus:ring-[#3A6D8C]/50' : 'focus:ring-[#B59F78]/50'
  }`;

  const buttonClasses = `w-full py-4 rounded-xl font-medium text-base transition-all ${
    isDarkMode
      ? 'bg-[#3A6D8C] text-[#EAD8B1] hover:bg-[#3A6D8C]/90 active:scale-[0.98]'
      : 'bg-[#B59F78] text-[#2A3663] hover:bg-[#B59F78]/90 active:scale-[0.98]'
  } ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`;

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className={`w-full max-w-md p-8 rounded-2xl ${
        isDarkMode ? 'bg-[#001F3F]' : 'bg-[#FAF6E3]'
      }`}>
        <div className="w-full">
          <h2 className={`text-4xl font-bold mb-2 font-['Poppins'] ${
            isDarkMode ? 'text-[#EAD8B1]' : 'text-[#2A3663]'
          }`}>
            Sign In
          </h2>
          <p className={`text-lg mb-8 opacity-70 font-['Poppins'] ${
            isDarkMode ? 'text-[#6A9AB0]' : 'text-[#B59F78]'
          }`}>
            Welcome back to your journey
          </p>

          {apiError && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-500 text-sm text-center">{apiError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className={`block text-sm font-medium mb-1 opacity-90 font-['Poppins'] ${
                isDarkMode ? 'text-[#6A9AB0]' : 'text-[#B59F78]'
              }`}>
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
                className={`${inputClasses} ${errors.email ? 'border-red-500' : ''}`}
              />
              {errors.email && (
                <p className="mt-1.5 text-red-500 text-xs">{errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={`block text-sm font-medium mb-1 opacity-90 font-['Poppins'] ${
                isDarkMode ? 'text-[#6A9AB0]' : 'text-[#B59F78]'
              }`}>
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
                className={`${inputClasses} ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && (
                <p className="mt-1.5 text-red-500 text-xs">{errors.password}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`${buttonClasses} text-base font-semibold font-['Poppins']`}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className={`w-full border-t ${
                  isDarkMode ? 'border-[#3A6D8C]/20' : 'border-[#B59F78]/20'
                }`}></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className={`px-4 text-sm font-['Poppins'] ${
                  isDarkMode ? 'bg-[#001F3F] text-[#6A9AB0]' : 'bg-[#FAF6E3] text-[#B59F78]'
                } opacity-60`}>
                  or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`w-full py-3.5 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-3 ${
                isDarkMode 
                  ? 'bg-[#3A6D8C]/10 border border-[#3A6D8C]/20 text-[#EAD8B1] hover:bg-[#3A6D8C]/20' 
                  : 'bg-[#B59F78]/10 border border-[#B59F78]/20 text-[#2A3663] hover:bg-[#B59F78]/20'
              } active:scale-[0.98] font-['Poppins']`}
            >
              <FcGoogle className="text-xl" />
              Sign in with Google
            </button>

            <p className={`mt-8 text-center text-sm opacity-70 font-['Poppins'] ${
              isDarkMode ? 'text-[#6A9AB0]' : 'text-[#B59F78]'
            }`}>
              Don't have an account?{' '}
              <Link 
                to="/signup" 
                className={`font-semibold ${
                  isDarkMode ? 'text-[#3A6D8C] hover:text-[#3A6D8C]/80' : 'text-[#B59F78] hover:text-[#B59F78]/80'
                }`}
              >
                Sign Up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignIn; 